"use client";

import { useEffect, useState } from "react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, Save, Scale, User } from "lucide-react";
import { User as UserType } from "@/types/case.types";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Partial<UserType>>({
    name: "",
    enrollment_number: "",
    office_address: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = localStorage.getItem("cf_user_id");
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("users").select("*").eq("id", userId).single();
      if (data) setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const userId = localStorage.getItem("cf_user_id");
    if (!userId) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        name: profile.name,
        enrollment_number: profile.enrollment_number,
        office_address: profile.office_address,
        email: profile.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved successfully");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className={`${uiFont.className} ${styles.loading}`}>
        <Loader2 className={styles.spin} />
        Loading profile...
      </div>
    );
  }

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className={styles.chromeLeft}>
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Advocate Identity</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Advocate
            <span className={styles.muted}>Profile</span>
          </h1>
          <p className={styles.subtitle}>
            This information appears on generated legal notices and court-facing
            documents.
          </p>
        </div>
        <div className={styles.heroBadge}>
          <User className={styles.icon16} />
          Practice Credentials
        </div>
      </section>

      <section className={styles.panel}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name *</label>
            <input
              type="text"
              className={styles.input}
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="e.g. Rajesh Kumar"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bar Enrollment Number *</label>
            <input
              type="text"
              className={styles.input}
              value={profile.enrollment_number || ""}
              onChange={(e) =>
                setProfile({ ...profile, enrollment_number: e.target.value })
              }
              placeholder="e.g. TN/2018/12345"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Office Address *</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={profile.office_address || ""}
              onChange={(e) =>
                setProfile({ ...profile, office_address: e.target.value })
              }
              placeholder="Chamber address for correspondence"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={styles.input}
              value={profile.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="advocate@example.com"
            />
          </div>

          <div className={styles.note}>
            <p>
              <strong>Important:</strong> Name, enrollment number, and office
              address are printed on generated legal notices. Keep them accurate.
            </p>
          </div>

          <button type="submit" disabled={saving} className={styles.saveBtn}>
            {saving ? <Loader2 className={styles.spinSmall} /> : <Save className={styles.icon14} />}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>
    </div>
  );
}
