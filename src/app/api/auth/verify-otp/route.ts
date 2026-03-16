import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizePhone, phoneVariants } from "@/lib/auth/phone";
import { otpStore } from "@/lib/auth/otpStore";

function hasRealCredential(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !normalized.startsWith("your-") &&
    !normalized.includes("replace_with") &&
    !normalized.includes("placeholder") &&
    !normalized.includes("example")
  );
}

async function verifyOtpWithTwilio(phone: string, otp: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return false;
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        Code: otp,
      }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(String(data?.message || "Failed to verify OTP"));
  }

  const data = (await res.json().catch(() => null)) as { status?: string } | null;
  return data?.status === "approved";
}

function verifyOtpFromLocalStore(phone: string, otp: string) {
  const record = otpStore.get(phone);
  if (!record) return false;

  if (record.expires < Date.now()) {
    otpStore.delete(phone);
    return false;
  }

  if (record.otp !== otp) {
    return false;
  }

  otpStore.delete(phone);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    let phone = "";
    let otp = "";

    try {
      const body = await req.json();
      phone = String(body?.phone || "");
      otp = String(body?.otp || "");
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    if (!otp || otp.length < 4) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    const provider = (process.env.OTP_PROVIDER || "twilio").toLowerCase();
    const allowDevOtpFallback = process.env.ALLOW_DEV_OTP_FALLBACK === "true";
    const twilioConfigured = Boolean(
      hasRealCredential(process.env.TWILIO_ACCOUNT_SID) &&
        hasRealCredential(process.env.TWILIO_AUTH_TOKEN) &&
        hasRealCredential(process.env.TWILIO_VERIFY_SERVICE_SID)
    );

    let otpVerified = false;
    if (provider === "twilio" && twilioConfigured) {
      try {
        otpVerified = await verifyOtpWithTwilio(normalizedPhone, otp);
      } catch (error) {
        if (process.env.NODE_ENV === "production" || !allowDevOtpFallback) {
          throw error;
        }
        console.warn("Twilio verify failed in non-production; using local OTP fallback.");
        otpVerified = verifyOtpFromLocalStore(normalizedPhone, otp);
      }
    } else {
      otpVerified = verifyOtpFromLocalStore(normalizedPhone, otp);
    }

    if (!otpVerified) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Server auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        },
        { status: 503 }
      );
    }

    const supabase = createServiceRoleClient();

    const candidates = phoneVariants(normalizedPhone);
    const { data: existingUsers, error: existingUserError } = await supabase
      .from("users")
      .select("*")
      .in("phone", candidates)
      .limit(1);

    if (existingUserError?.code === "PGRST205") {
      return NextResponse.json(
        {
          error:
            "Database is not initialized. Missing table public.users. Run Supabase migrations (starting with supabase/migrations/001_users.sql).",
        },
        { status: 503 }
      );
    }

    if (existingUserError && existingUserError.code !== "PGRST116") {
      throw existingUserError;
    }

    const existingUser = existingUsers?.[0] || null;
    let userId: string;

    if (!existingUser) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        phone_confirm: true,
      });

      if (authError || !authData?.user) {
        const { data: userListData, error: userListError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (userListError) throw authError ?? userListError;

        const existingAuthUser = userListData.users.find(
          (user: { phone?: string | null; id: string }) =>
            normalizePhone(user.phone || "") === normalizedPhone
        );
        if (!existingAuthUser) throw authError ?? new Error("Failed to create or find auth user");

        userId = existingAuthUser.id;
      } else {
        userId = authData.user.id;
      }

      const { error: insertUserError } = await supabase.from("users").insert({
        id: userId,
        phone: normalizedPhone,
        name: null,
        enrollment_number: null,
        office_address: null,
        email: null,
      });

      if (insertUserError && insertUserError.code !== "23505") {
        throw insertUserError;
      }
    } else {
      userId = existingUser.id;
    }

    const response = NextResponse.json({
      success: true,
      userId,
      phone: normalizedPhone,
      isNewUser: !existingUser,
    });

    response.cookies.set({
      name: "cf_user_id",
      value: userId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

