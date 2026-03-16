"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Case } from "@/types/case.types";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import { PlusCircle, AlertTriangle, ArrowRight, Scale } from "lucide-react";
import { daysUntil, formatDisplayDate } from "@/lib/utils/dateUtils";
import { formatCurrency } from "@/lib/utils/formatters";
import { CASE_STAGES } from "@/constants/caseStages";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./dashboard.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const advocateId = localStorage.getItem("cf_user_id");
    if (!advocateId) {
      router.push("/login");
      return;
    }

    const cacheKey = `cases:summary:${advocateId}`;
    const cachedCases = getClientCache<Case[]>(cacheKey);
    if (cachedCases) {
      setCases(cachedCases);
      setLoading(false);
    }

    fetch(`/api/cases?advocate_id=${advocateId}&view=summary`)
      .then((r) => r.json())
      .then((data) => {
        const nextCases = data.cases || [];
        setCases(nextCases);
        setClientCache(cacheKey, nextCases, 45_000);
        nextCases.slice(0, 6).forEach((c: Case) => {
          router.prefetch(`/cases/${c.id}`);
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  if (loading) {
    return <div className={`${uiFont.className} ${styles.loading}`}>Loading your litigation workspace...</div>;
  }

  const totalCases = cases.length;
  const activeCases = cases.filter(
    (c) => !["closed", "complaint_filed"].includes(c.stage)
  ).length;
  const urgentCases = cases.filter((c) => {
    const days = daysUntil(c.complaint_deadline);
    return days !== null && days <= 3 && days >= 0;
  });
  const totalAmount = cases.reduce((sum, c) => {
    return sum + (c.case_financials?.cheque_amount || 0);
  }, 0);

  const sortedCases = [...cases].sort((a, b) => {
    const da = daysUntil(a.complaint_deadline) ?? 999;
    const db = daysUntil(b.complaint_deadline) ?? 999;
    return da - db;
  });

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className="inline-flex items-center gap-2">
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <h1 className={`${displayFont.className} ${styles.heroTitle}`}>
              Creating
              <span className={styles.heroMuted}>Litigation</span>
              <span className="block">Experiences</span>
            </h1>
            <p className={styles.heroSub}>
              A focused legal workspace for advocates to structure facts, guide
              timelines, and draft action-ready notices with precision.
            </p>
          </div>

          <div className={styles.quickPanel}>
            <div className={styles.quickHead}>
              <p className={styles.kicker}>Command Panel</p>
              <div className={styles.quickActions}>
                <button
                  onClick={() => router.push("/cases/new")}
                  className={styles.newCaseBtn}
                >
                  <PlusCircle className="w-4 h-4" />
                  New Case
                </button>
              </div>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Total Cases</p>
                <p className={styles.statValue}>{totalCases}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Active Cases</p>
                <p className={styles.statValue}>{activeCases}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Urgent</p>
                <p className={styles.statValue}>{urgentCases.length}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Portfolio Value</p>
                <p className={styles.statValue}>{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.sections}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>
              Active Matters
            </h2>
            <p className={styles.panelMeta}>Sorted by urgency</p>
          </div>

          {sortedCases.length === 0 ? (
            <div className={styles.empty}>
              No cases yet. Start by creating your first case file.
            </div>
          ) : (
            <div className={styles.caseList}>
              {sortedCases.map((c) => {
                const client = c.case_parties?.find((p) => p.role === "client");
                const oppParty = c.case_parties?.find((p) => p.role === "opposite_party");
                const stageLabel = CASE_STAGES[c.stage]?.label || c.stage.replaceAll("_", " ");

                return (
                  <article
                    key={c.id}
                    className={styles.caseRow}
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <div className={styles.caseMain}>
                      <p className={styles.caseParties}>
                        <strong>{client?.name || "Unknown Client"}</strong> vs {oppParty?.name || "Unknown Party"}
                      </p>
                      <p className={styles.caseMeta}>
                        Complaint deadline: {formatDisplayDate(c.complaint_deadline)} | Amount: {formatCurrency(c.case_financials?.cheque_amount || 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={styles.stage}>{stageLabel}</span>
                      <ArrowRight className="w-4 h-4 text-[#7a6032]" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>
              Immediate Attention
            </h2>
            <p className={styles.panelMeta}>Critical deadlines</p>
          </div>

          {urgentCases.length === 0 ? (
            <div className={styles.empty}>No immediate deadline pressure. Keep progressing active cases.</div>
          ) : (
            <div className={styles.deadlineList}>
              {urgentCases.map((c) => {
                const client = c.case_parties?.find((p) => p.role === "client");
                const days = daysUntil(c.complaint_deadline);
                return (
                  <div key={c.id} className={styles.deadlineItem}>
                    <p className={styles.deadlineName}>{client?.name || "Unknown Client"}</p>
                    <p className={styles.deadlineText}>
                      <AlertTriangle className="w-3 h-3 inline-block mr-1" />
                      {days === 0
                        ? "Deadline is today"
                        : `${days} day${days !== 1 ? "s" : ""} remaining`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
