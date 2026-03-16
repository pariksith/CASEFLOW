"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import toast from "react-hot-toast";
import { Case } from "@/types/case.types";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { CASE_STAGES } from "@/constants/caseStages";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Download,
  FileText,
  HelpCircle,
  MessageSquare,
  Scale,
} from "lucide-react";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ORDERED_STAGES = [
  "drafting",
  "notice_generated",
  "notice_served",
  "waiting_period",
  "complaint_eligible",
  "limitation_warning",
  "complaint_filed",
  "closed",
] as const;

interface CaseAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

export default function CasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingServed, setMarkingServed] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  const fetchCase = async () => {
    const cacheKey = `case:${caseId}:core`;
    const cached = getClientCache<Case>(cacheKey);
    if (cached) {
      setCaseData(cached);
      setLoading(false);
    }

    const res = await fetch(`/api/cases/${caseId}?view=core`);
    const data = await res.json();
    const nextCase = data.case || null;
    setCaseData(nextCase);
    if (nextCase) {
      setClientCache(cacheKey, nextCase, 45_000);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    router.prefetch(`/cases/${caseId}/story`);
    router.prefetch(`/cases/${caseId}/questions`);
    router.prefetch(`/cases/${caseId}/timeline`);
    router.prefetch(`/cases/${caseId}/notice`);
  }, [caseId, router]);

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

  const handleMarkServed = async () => {
    setMarkingServed(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "notice_served",
          notice_served_date: today,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Notice marked as served. 15-day countdown started.");
      await fetchCase();
    } catch {
      toast.error("Failed to update case");
    } finally {
      setMarkingServed(false);
    }
  };

  if (loading) return <FullPageSpinner label="Loading case..." />;
  if (!caseData) {
    return <div className={styles.empty}>Case not found.</div>;
  }

  const client = caseData.case_parties?.find((p) => p.role === "client");
  const oppParty = caseData.case_parties?.find((p) => p.role === "opposite_party");
  const financials = caseData.case_financials;
  const stageConfig = CASE_STAGES[caseData.stage];
  const shortCaseId = caseData.id.slice(0, 8).toUpperCase();
  const currentStageIndex = ORDERED_STAGES.indexOf(caseData.stage);

  const nextActions: CaseAction[] = (() => {
    if (caseData.stage === "drafting") {
      return [
        {
          label: "Enter Client Story",
          icon: <MessageSquare className={styles.icon14} />,
          onClick: () => router.push(`/cases/${caseId}/story`),
        },
        {
          label: "Answer Questions",
          icon: <HelpCircle className={styles.icon14} />,
          onClick: () => router.push(`/cases/${caseId}/questions`),
        },
        {
          label: "Generate Notice",
          icon: <Download className={styles.icon14} />,
          onClick: () => router.push(`/cases/${caseId}/notice`),
        },
      ];
    }
    if (caseData.stage === "notice_generated") {
      return [
        {
          label: markingServed ? "Marking..." : "Mark Notice as Served",
          icon: <CheckCircle2 className={styles.icon14} />,
          onClick: handleMarkServed,
          disabled: markingServed,
        },
      ];
    }
    if (["complaint_eligible", "limitation_warning"].includes(caseData.stage)) {
      return [
        {
          label: "Generate Complaint (Coming Soon)",
          icon: <FileText className={styles.icon14} />,
          onClick: () => toast("Complaint generation coming in next version"),
        },
      ];
    }
    return [];
  })();

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
          <p className={styles.kicker}>Case Command</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            {client?.name || "Unknown"}
            <span className={styles.muted}>vs {oppParty?.name || "Unknown"}</span>
          </h1>
          <p className={styles.subtitle}>
            Case #{shortCaseId} | Cheque Bounce | {caseData.jurisdiction_city || "Jurisdiction not set"}
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.stagePill}>{stageConfig?.label || caseData.stage}</span>
          <p className={styles.stageDesc}>{stageConfig?.description}</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Case Progress</h2>
        </div>
        <div className={styles.stageTrack}>
          {ORDERED_STAGES.map((stage, idx) => {
            const active = idx <= currentStageIndex;
            return (
              <div key={stage} className={styles.stageItem}>
                <span className={active ? styles.stageDotActive : styles.stageDot} />
                <span className={active ? styles.stageLabelActive : styles.stageLabel}>
                  {CASE_STAGES[stage].label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Next Action</h2>
            <ArrowRight className={styles.icon16} />
          </div>
          <p className={styles.panelSub}>{stageConfig?.description}</p>
          <div className={styles.actions}>
            {nextActions.length === 0 ? (
              <p className={styles.mutedText}>No immediate action required.</p>
            ) : (
              nextActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={styles.actionBtn}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Deadlines</h2>
            <Clock3 className={styles.icon16} />
          </div>
          <div className={styles.deadlineList}>
            <div className={styles.deadlineItem}>
              <span className={styles.deadlineLabel}>15-Day Wait Ends</span>
              <span className={styles.deadlineValue}>
                {formatDisplayDate(caseData.waiting_period_end) || "Not set"}
              </span>
            </div>
            <div className={styles.deadlineItem}>
              <span className={styles.deadlineLabel}>Complaint Deadline</span>
              <span className={styles.deadlineValue}>
                {formatDisplayDate(caseData.complaint_deadline) || "Not set"}
              </span>
            </div>
            <div className={styles.deadlineItem}>
              <span className={styles.deadlineLabel}>Notice Sent</span>
              <span className={styles.deadlineValue}>
                {formatDisplayDate(caseData.notice_sent_date) || "Not yet"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Parties</h2>
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Client</span>
              <span className={styles.summaryValue}>{client?.name || "Unknown"}</span>
              <span className={styles.summarySub}>{client?.address || "Address not set"}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Opposite Party</span>
              <span className={styles.summaryValue}>{oppParty?.name || "Unknown"}</span>
              <span className={styles.summarySub}>{oppParty?.address || "Address not set"}</span>
            </div>
          </div>
        </section>

        {financials && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Cheque Details</h2>
              <Calendar className={styles.icon16} />
            </div>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Cheque No.</span>
                <span className={styles.summaryValue}>{financials.cheque_number}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Amount</span>
                <span className={styles.summaryValue}>{formatCurrency(financials.cheque_amount)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Cheque Date</span>
                <span className={styles.summaryValue}>{formatDisplayDate(financials.cheque_date)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Return Memo Date</span>
                <span className={styles.summaryValue}>{formatDisplayDate(financials.return_memo_date)}</span>
              </div>
              <div className={styles.summaryItemWide}>
                <span className={styles.summaryLabel}>Bank</span>
                <span className={styles.summaryValue}>{financials.bank_name}</span>
              </div>
              <div className={styles.summaryItemWide}>
                <span className={styles.summaryLabel}>Dishonour Reason</span>
                <span className={styles.summaryValue}>{financials.dishonour_reason}</span>
              </div>
            </div>
          </section>
        )}
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Workflow</h2>
        </div>
        <div className={styles.workflowGrid}>
          <button onClick={() => router.push(`/cases/${caseId}/story`)} className={styles.workflowBtn}>
            <MessageSquare className={styles.icon16} /> Client Story
          </button>
          <button onClick={() => router.push(`/cases/${caseId}/questions`)} className={styles.workflowBtn}>
            <HelpCircle className={styles.icon16} /> Case Facts
          </button>
          <button onClick={() => router.push(`/cases/${caseId}/timeline`)} className={styles.workflowBtn}>
            <Clock3 className={styles.icon16} /> Timeline
          </button>
          <button onClick={() => router.push(`/cases/${caseId}/notice`)} className={styles.workflowBtn}>
            <FileText className={styles.icon16} /> Legal Notice
          </button>
        </div>
      </section>
    </div>
  );
}
