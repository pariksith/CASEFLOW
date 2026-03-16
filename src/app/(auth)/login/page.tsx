"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Scale, Phone, ArrowRight, Loader2 } from "lucide-react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import styles from "./login.module.css";

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

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

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

  const formatPhone = (value: string) => {
    return value.replace(/[^\d+]/g, "");
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = phone.startsWith("+") ? phone : `+91${phone}`;

    if (cleaned.replace("+91", "").length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });

      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error || "Failed to send OTP"));

      sessionStorage.setItem("cf_phone", cleaned);
      sessionStorage.removeItem("cf_dev_otp");
      sessionStorage.removeItem("cf_registration_data");

      const devOtp = String(data.devOtp || "");
      if (devOtp) {
        sessionStorage.setItem("cf_dev_otp", devOtp);
        toast.success(`OTP sent. Dev OTP: ${devOtp}`);
      } else {
        toast.success("OTP sent to your mobile number");
      }

      router.push("/verify");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = phone.length >= 10;

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
              Creating
              <span className={styles.heroMuted}>Litigation</span>
              <span className="block">Experiences</span>
            </h1>
            <p className={styles.heroSub}>
              A focused legal workspace for advocates to structure facts, guide timelines, and
              draft action-ready notices with precision.
            </p>
          </section>

          <section className={styles.panel}>
            <p className={styles.kicker}>Secure Sign In</p>
            <h2 className={`${displayFont.className} ${styles.logo}`}>CaseFlow</h2>
            <p className={styles.desc}>Login with your mobile number and verify via OTP.</p>

            <form onSubmit={handleSendOTP} className={styles.form}>
              <div>
                <label className={styles.label}>Mobile Number</label>
                <div className={styles.inputWrap}>
                  <Phone className={`${styles.inputIcon} h-4 w-4`} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="9876543210"
                    maxLength={13}
                    className={styles.input}
                    required
                    autoFocus
                  />
                </div>
                <p className={styles.hint}>Indian numbers: enter 10 digits (without +91)</p>
              </div>

              <button type="submit" disabled={loading || !canSubmit} className={styles.submit}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin inline-block" />
                ) : (
                  <>
                    Login via OTP
                    <ArrowRight className="h-4 w-4 inline-block" />
                  </>
                )}
              </button>
            </form>

            <div className={styles.notice}>
              <p>
                <span className="font-semibold text-white">Advocates only.</span> This platform is
                for licensed advocates managing litigation cases.
              </p>
            </div>
            <p className={styles.foot}>CaseFlow MVP v1 · Cheque Bounce (NI Act)</p>
          </section>
        </main>
      </div>
    </div>
  );
}

