"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Scale, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import styles from "./verify.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

async function parseApiJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response. Please restart dev server and try again.");
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON response from server.");
  }
}

export default function VerifyPage() {
  const router = useRouter();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [timeLabel, setTimeLabel] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedPhone = sessionStorage.getItem("cf_phone");
    if (!storedPhone) {
      router.push("/login");
      return;
    }

    setPhone(storedPhone);
  }, [router]);

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp: otpString,
        }),
      });

      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error || "Verification failed"));

      localStorage.setItem("cf_user_id", String(data.userId || ""));
      localStorage.setItem("cf_phone", phone);

      toast.success("Verified successfully!");
      sessionStorage.removeItem("cf_registration_data");
      sessionStorage.removeItem("cf_auth_mode");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error || "Failed to resend OTP"));

      const devOtp = String(data.devOtp || "");
      if (devOtp) {
        sessionStorage.setItem("cf_dev_otp", devOtp);
        toast.success(`OTP resent. Dev OTP: ${devOtp}`);
      } else {
        toast.success("OTP resent!");
      }

      setCountdown(30);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <Scale className="h-4 w-4" />
            <span>Caseflow Studio</span>
          </div>
          <div>IN {timeLabel}</div>
        </header>

        <main className={styles.main}>
          <section>
            <h1 className={`${displayFont.className} ${styles.heroTitle}`}>
              Verify
              <span className={styles.heroMuted}>Secure</span>
              <span className="block">Access</span>
            </h1>
            <p className={styles.heroSub}>
              Continue to your litigation workspace with a one-time verification code delivered to
              your registered number.
            </p>
          </section>

          <section className={styles.panel}>
            <button onClick={() => router.push("/login")} className={styles.back}>
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>

            <p className={styles.kicker}>One-Time Passcode</p>
            <h2 className={`${displayFont.className} ${styles.logo}`}>Enter OTP</h2>
            <p className={styles.desc}>
              We sent a 6-digit code to <span className={styles.phone}>{phone}</span>
            </p>

            <div className={styles.otpRow} onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={styles.otpInput}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || otp.join("").length !== 6}
              className={styles.submit}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin inline-block" />
              ) : (
                "Verify & Continue"
              )}
            </button>

            <div className={styles.resendWrap}>
              {countdown > 0 ? (
                <p className={styles.countdown}>
                  Resend OTP in <strong>{countdown}s</strong>
                </p>
              ) : (
                <button onClick={handleResend} disabled={resending} className={styles.resend}>
                  {resending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Resend OTP
                </button>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

