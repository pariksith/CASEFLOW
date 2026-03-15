import { CaseStage } from "@/types/case.types";

export interface StageConfig {
  key: CaseStage;
  label: string;
  description: string;
  nextStage: CaseStage | null;
  primaryAction: string | null;
  color: string;
  order: number;
}

export const CASE_STAGES: Record<CaseStage, StageConfig> = {
  drafting: {
    key: "drafting",
    label: "Drafting",
    description: "Case created. Gathering facts and story.",
    nextStage: "notice_generated",
    primaryAction: "Generate Notice",
    color: "bg-gray-200 text-gray-700",
    order: 1,
  },
  notice_generated: {
    key: "notice_generated",
    label: "Notice Generated",
    description: "Legal notice has been drafted and is ready to send.",
    nextStage: "notice_served",
    primaryAction: "Mark Notice Served",
    color: "bg-blue-100 text-blue-700",
    order: 2,
  },
  notice_served: {
    key: "notice_served",
    label: "Notice Served",
    description: "Notice delivered to opposite party. 15-day wait begins.",
    nextStage: "waiting_period",
    primaryAction: null,
    color: "bg-yellow-100 text-yellow-700",
    order: 3,
  },
  waiting_period: {
    key: "waiting_period",
    label: "Waiting Period",
    description: "Waiting 15 days for payment from drawer.",
    nextStage: "complaint_eligible",
    primaryAction: null,
    color: "bg-orange-100 text-orange-700",
    order: 4,
  },
  complaint_eligible: {
    key: "complaint_eligible",
    label: "Complaint Eligible",
    description: "15-day period expired. You can now file a complaint.",
    nextStage: "complaint_filed",
    primaryAction: "Generate Complaint (Soon)",
    color: "bg-green-100 text-green-700",
    order: 5,
  },
  limitation_warning: {
    key: "limitation_warning",
    label: "⚠️ Limitation Warning",
    description: "Complaint deadline is within 3 days. File immediately.",
    nextStage: "complaint_filed",
    primaryAction: "File Complaint NOW",
    color: "bg-red-100 text-red-700",
    order: 6,
  },
  complaint_filed: {
    key: "complaint_filed",
    label: "Complaint Filed",
    description: "Complaint has been filed in court.",
    nextStage: "closed",
    primaryAction: null,
    color: "bg-purple-100 text-purple-700",
    order: 7,
  },
  closed: {
    key: "closed",
    label: "Closed",
    description: "Case has been closed.",
    nextStage: null,
    primaryAction: null,
    color: "bg-gray-100 text-gray-500",
    order: 8,
  },
};

export const ORDERED_STAGES: StageConfig[] = Object.values(CASE_STAGES).sort(
  (a, b) => a.order - b.order
);
