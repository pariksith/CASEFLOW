"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Scale,
  Shield,
} from "lucide-react";
import { FullPageSpinner } from "@/components/ui/Spinner";
import DownloadButton from "@/components/notice/DownloadButton";
import NoticePreview from "@/components/notice/NoticePreview";
import { Case } from "@/types/case.types";
import { CHEQUE_BOUNCE_LEGAL_MAP } from "@/constants/legalMapping";
import { formatCurrency } from "@/lib/utils/formatters";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./page.module.css";

interface NoticeMeta {
  act: string;
  sections: string[];
  noticeSentDate: string;
  waitingPeriodEnd: string;
  complaintDeadline: string;
}

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function NoticePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedMeta, setGeneratedMeta] = useState<NoticeMeta | null>(null);
  const [timeLabel, setTimeLabel] = useState("");
  const advocateId =
    typeof window !== "undefined" ? localStorage.getItem("cf_user_id") : null;

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
    const cacheKey = `case:${caseId}:notice`;
    const cached = getClientCache<Case>(cacheKey);
    if (cached) {
      setCaseData(cached);
      setLoading(false);
    }

    fetch(`/api/cases/${caseId}?view=notice`)
      .then((r) => r.json())
      .then((data) => {
        const nextCase = data.case || null;
        setCaseData(nextCase);
        if (nextCase) {
          setClientCache(cacheKey, nextCase, 45_000);
        }
        setLoading(false);
      });
  }, [caseId]);

  const handleGenerated = (metadata: Record<string, string>) => {
    setGeneratedMeta(metadata as unknown as NoticeMeta);
    fetch(`/api/cases/${caseId}?view=notice`)
      .then((r) => r.json())
      .then((data) => {
        const nextCase = data.case || null;
        setCaseData(nextCase);
        if (nextCase) {
          setClientCache(`case:${caseId}:notice`, nextCase, 45_000);
        }
      });
  };

  if (loading) return <FullPageSpinner label="Loading notice workspace..." />;

  const shortCaseId = (caseId || "").slice(0, 8).toUpperCase();
  const client = caseData?.case_parties?.find((p) => p.role === "client");
  const oppParty = caseData?.case_parties?.find((p) => p.role === "opposite_party");
  const financials = caseData?.case_financials;
  const facts = caseData?.case_facts;
  const hasExistingNotice = caseData?.stage !== "drafting" && caseData?.stage !== undefined;

  const checks = [
    { label: "Client and opposite party details", done: !!(client && oppParty) },
    { label: "Cheque and dishonour details", done: !!financials },
    { label: "Client story captured", done: !!facts?.raw_story },
    {
      label: "Case facts completed",
      done: facts?.notice_delivery_mode !== null && facts?.notice_delivery_mode !== undefined,
    },
  ];
  const isReady = checks.every((c) => c.done);

  const frameworkItems = [
    { label: "Act", value: "NI Act, 1881" },
    { label: "Sections", value: CHEQUE_BOUNCE_LEGAL_MAP.sections.join(", ") },
    { label: "Notice Period", value: `${CHEQUE_BOUNCE_LEGAL_MAP.notice_period_days} days` },
    { label: "Payment Wait", value: `${CHEQUE_BOUNCE_LEGAL_MAP.payment_wait_days} days` },
  ];

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
          <p className={styles.kicker}>Document Generation</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Generate Legal
            <span className={styles.muted}>Notice</span>
          </h1>
          <p className={styles.subtitle}>
            Produce a court-ready demand notice grounded in fixed legal rules
            and validated case facts.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.metaBadge}>
            <FileText className={styles.icon14} />
            Step 3 of 3
          </div>
          <p className={styles.caseCode}>Case #{shortCaseId}</p>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}`)}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back to Case
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Applied Legal Framework</h2>
          <Shield className={styles.icon16} />
        </div>
        <p className={styles.panelSub}>Hardcoded legal mapping. Not generated by AI.</p>
        <div className={styles.frameworkGrid}>
          {frameworkItems.map(({ label, value }) => (
            <article key={label} className={styles.frameworkItem}>
              <p className={styles.frameworkLabel}>{label}</p>
              <p className={styles.frameworkValue}>{value}</p>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Notice Readiness</h2>
          </div>
          <p className={styles.panelSub}>All checkpoints must pass before generation.</p>

          <div className={styles.checks}>
            {checks.map(({ label, done }) => (
              <div key={label} className={styles.checkRow}>
                {done ? (
                  <CheckCircle2 className={`${styles.icon16} ${styles.checkDone}`} />
                ) : (
                  <AlertCircle className={`${styles.icon16} ${styles.checkWarn}`} />
                )}
                <span className={done ? styles.checkText : styles.checkTextWarn}>{label}</span>
                {!done && <span className={styles.badgeWarn}>Incomplete</span>}
              </div>
            ))}
          </div>

          {!isReady && (
            <div className={styles.alertBox}>
              Complete all required items before generating the notice.
            </div>
          )}
        </section>

        {financials && client && oppParty && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Verify Before Generating</h2>
            </div>
            <p className={styles.panelSub}>Final fact review.</p>
            <div className={styles.summaryGrid}>
              {[
                { label: "Client", value: client.name },
                { label: "Opposite Party", value: oppParty.name },
                { label: "Cheque No.", value: financials.cheque_number },
                { label: "Amount", value: formatCurrency(financials.cheque_amount) },
                { label: "Bank", value: financials.bank_name },
                { label: "Dishonour", value: financials.dishonour_reason },
              ].map(({ label, value }) => (
                <div key={label} className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{label}</span>
                  <span className={styles.summaryValue}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {isReady && advocateId && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Generate Notice</h2>
            <Scale className={styles.icon16} />
          </div>
          <p className={styles.panelSub}>AI drafts language. Legal structure remains deterministic.</p>
          <DownloadButton
            caseId={caseId as string}
            advocateId={advocateId}
            onGenerated={handleGenerated}
            hasExistingNotice={hasExistingNotice}
          />
        </section>
      )}

      {generatedMeta && (
        <section className={styles.panel}>
          <NoticePreview
            noticeText="Notice generated and downloaded. Open the .docx file to view the fully formatted legal notice."
            metadata={generatedMeta}
          />
        </section>
      )}
    </div>
  );
}
