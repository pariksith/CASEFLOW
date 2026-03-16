import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth/phone";
import { otpStore } from "@/lib/auth/otpStore";

const OTP_TTL_MS = 5 * 60 * 1000;

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

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpWithTwilio(phone: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return false;
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        Channel: "sms",
      }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(String(data?.message || "Failed to send OTP"));
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    let phone = "";

    try {
      const body = await req.json();
      phone = String(body?.phone || "");
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    const provider = (process.env.OTP_PROVIDER || "twilio").toLowerCase();
    const allowDevOtpFallback = process.env.ALLOW_DEV_OTP_FALLBACK === "true";

    if (provider === "twilio") {
      const twilioConfigured = Boolean(
        hasRealCredential(process.env.TWILIO_ACCOUNT_SID) &&
          hasRealCredential(process.env.TWILIO_AUTH_TOKEN) &&
          hasRealCredential(process.env.TWILIO_VERIFY_SERVICE_SID)
      );

      if (twilioConfigured) {
        try {
          await sendOtpWithTwilio(normalizedPhone);
          return NextResponse.json({ success: true });
        } catch (error) {
          if (process.env.NODE_ENV === "production" || !allowDevOtpFallback) {
            throw error;
          }
          console.warn("Twilio send failed in non-production; using local OTP fallback.");
        }
      }

      if (process.env.NODE_ENV === "production" || !allowDevOtpFallback) {
        return NextResponse.json(
          { error: "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID." },
          { status: 503 }
        );
      }
    }

    const otp = generateOtp();
    otpStore.set(normalizedPhone, { otp, expires: Date.now() + OTP_TTL_MS });

    return NextResponse.json({
      success: true,
      devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

