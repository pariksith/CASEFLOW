"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import { ChevronLeft, ChevronRight, HelpCircle, Scale, Shield } from "lucide-react";
import { FullPageSpinner } from "@/components/ui/Spinner";
import QuestionFlow from "@/components/questions/QuestionFlow";
import { CaseFactsAnswers } from "@/types/facts.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function QuestionsPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialAnswers, setInitialAnswers] = useState<Partial<CaseFactsAnswers>>();
  const [completed, setCompleted] = useState(false);
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
    const cacheKey = `case:${caseId}:facts`;
    const cached = getClientCache<Partial<CaseFactsAnswers>>(cacheKey);
    if (cached) {
      setInitialAnswers(cached);
      if (cached.notice_delivery_mode !== null && cached.notice_delivery_mode !== undefined) {
        setCompleted(true);
      }
      setLoading(false);
    }

    fetch(`/api/cases/${caseId}?view=facts`)
      .then((r) => r.json())
      .then((data) => {
        const facts = data.case?.case_facts;
        if (facts) {
          const answers = {
            cheque_signed_by_drawer: facts.cheque_signed_by_drawer,
            statutory_notice_already_sent: facts.statutory_notice_already_sent,
            part_payment_made: facts.part_payment_made,
            part_payment_amount: facts.part_payment_amount,
            written_admission_available: facts.written_admission_available,
            notice_delivery_mode: facts.notice_delivery_mode,
          };
          setInitialAnswers(answers);
          setClientCache(cacheKey, answers, 45_000);
          if (facts.notice_delivery_mode !== null) setCompleted(true);
        }
        setLoading(false);
      });
  }, [caseId]);

  const shortCaseId = useMemo(
    () => (caseId || "").slice(0, 8).toUpperCase(),
    [caseId]
  );

  if (loading) return <FullPageSpinner label="Loading case facts..." />;

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
          <p className={styles.kicker}>Case Qualification</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Case Facts
            <span className={styles.muted}>Validation</span>
          </h1>
          <p className={styles.subtitle}>
            Record essential Section 138 facts before generating a structured
            and enforceable legal notice.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.metaBadge}>
            <HelpCircle className={styles.icon14} />
            Step 2 of 3
          </div>
          <p className={styles.caseCode}>Case #{shortCaseId}</p>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}/story`)}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back to Story
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.info}>
          <Shield className={styles.infoIcon} />
          <div>
            <p className={styles.infoTitle}>These answers shape your legal notice</p>
            <p className={styles.infoText}>
              Rules and deadlines are generated from fixed legal logic. These
              answers are used for factual notice drafting and completeness.
            </p>
          </div>
        </div>

        <QuestionFlow
          caseId={caseId as string}
          initialAnswers={initialAnswers}
          onComplete={() => setCompleted(true)}
        />
      </section>

      {completed && (
        <div className={styles.footerAction}>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}/notice`)}
            className={styles.nextBtn}
          >
            Continue to Generate Notice
            <ChevronRight className={styles.icon14} />
          </button>
        </div>
      )}
    </div>
  );
}
