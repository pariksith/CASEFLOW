"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CreateCasePayload } from "@/types/case.types";
import { IndianRupee, FileText, Building2, ArrowRight, Loader2, User, UserRound } from "lucide-react";
import styles from "./newcase-content.module.css";

interface CaseFormProps {
  onBack: () => void;
}

const DISHONOUR_REASONS = [
  "Insufficient funds",
  "Account closed",
  "Payment stopped by drawer",
  "Signature mismatch",
  "Cheque date expired (stale cheque)",
  "Amount in words and figures differ",
  "Drawer account dormant",
  "Refer to drawer",
];

export default function CaseForm({ onBack }: CaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateCasePayload>({
    client_name: "",
    client_address: "",
    opposite_party_name: "",
    opposite_party_address: "",
    cheque_number: "",
    cheque_date: "",
    cheque_amount: 0,
    bank_name: "",
    dishonour_reason: "",
    return_memo_date: "",
    jurisdiction_city: "",
  });

  const update = (field: keyof CreateCasePayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const advocateId = localStorage.getItem("cf_user_id");
    if (!advocateId) {
      toast.error("Session expired. Please login again.");
      router.push("/login");
      return;
    }

    if (!form.cheque_amount || form.cheque_amount <= 0) {
      toast.error("Cheque amount must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, advocate_id: advocateId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create case");

      toast.success("Case created successfully!");
      router.push(`/cases/${data.caseId}/story`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.block}>
      <div className={styles.formTop}>
        <div>
          <h2 className={styles.formTitle}>Case Details</h2>
          <p className={styles.formSub}>Cheque Bounce - Section 138, NI Act</p>
        </div>
        <button type="button" onClick={onBack} className={styles.textLink}>
          Change type
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <User size={14} /> Client (Payee)
        </h3>
        <div className={styles.field}>
          <label className={styles.label}>Client Full Name</label>
          <input
            className={styles.input}
            value={form.client_name}
            onChange={(e) => update("client_name", e.target.value)}
            placeholder="e.g. Ramesh Subramaniam"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Client Address</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.client_address}
            onChange={(e) => update("client_address", e.target.value)}
            placeholder="Full address of your client"
            required
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <UserRound size={14} /> Opposite Party (Drawer)
        </h3>
        <div className={styles.field}>
          <label className={styles.label}>Opposite Party Full Name</label>
          <input
            className={styles.input}
            value={form.opposite_party_name}
            onChange={(e) => update("opposite_party_name", e.target.value)}
            placeholder="e.g. Suresh Krishnan"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Opposite Party Address</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.opposite_party_address}
            onChange={(e) => update("opposite_party_address", e.target.value)}
            placeholder="Full address for notice delivery"
            required
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <FileText size={14} /> Cheque Details
        </h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Cheque Number</label>
            <input
              className={styles.input}
              value={form.cheque_number}
              onChange={(e) => update("cheque_number", e.target.value)}
              placeholder="e.g. 001234"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Cheque Date</label>
            <input
              className={styles.input}
              type="date"
              value={form.cheque_date}
              onChange={(e) => update("cheque_date", e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Cheque Amount</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f3d89f]" />
            <input
              className={`${styles.input} pl-9`}
              type="number"
              value={form.cheque_amount || ""}
              onChange={(e) => update("cheque_amount", Number.parseFloat(e.target.value) || 0)}
              placeholder="e.g. 500000"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Bank Name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f3d89f]" />
            <input
              className={`${styles.input} pl-9`}
              value={form.bank_name}
              onChange={(e) => update("bank_name", e.target.value)}
              placeholder="e.g. State Bank of India, Chennai Branch"
              required
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>Dishonour and Jurisdiction</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Reason for Dishonour</label>
            <select
              className={styles.select}
              value={form.dishonour_reason}
              onChange={(e) => update("dishonour_reason", e.target.value)}
              required
            >
              <option value="">Select dishonour reason</option>
              {DISHONOUR_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Return Memo Date</label>
            <input
              className={styles.input}
              type="date"
              value={form.return_memo_date}
              onChange={(e) => update("return_memo_date", e.target.value)}
              required
            />
            <p className={styles.hint}>Date shown on bank dishonour memo</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Jurisdiction City</label>
          <input
            className={styles.input}
            value={form.jurisdiction_city || ""}
            onChange={(e) => update("jurisdiction_city", e.target.value)}
            placeholder="e.g. Chennai"
            required
          />
          <p className={styles.hint}>City where complaint will be filed</p>
        </div>
      </section>

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Saving case...
          </>
        ) : (
          <>
            Save Case and Continue <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
