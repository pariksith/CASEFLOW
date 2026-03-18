"use client";

import { useRouter } from "next/navigation";
import { Case } from "@/types/case.types";
import { StageBadge } from "@/components/ui/Badge";
import Countdown from "@/components/ui/Countdown";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import { CASE_STAGES } from "@/constants/caseStages";
import { ChevronRight, Calendar, IndianRupee } from "lucide-react";

interface CaseCardProps {
  caseData: Case;
}

export default function CaseCard({ caseData }: CaseCardProps) {
  const router = useRouter();

  const client = caseData.case_parties?.find((p) => p.role === "client");
  const oppParty = caseData.case_parties?.find((p) => p.role === "opposite_party");
  const financials = caseData.case_financials;
  const stageConfig = CASE_STAGES[caseData.stage];

  const nextAction = stageConfig?.primaryAction || "View case";

  return (
    <div
      onClick={() => router.push(`/cases/${caseData.id}`)}
      onMouseEnter={() => router.prefetch(`/cases/${caseData.id}`)}
      onTouchStart={() => router.prefetch(`/cases/${caseData.id}`)}
      className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 cursor-pointer p-5"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900 truncate">
              {client?.name || "Unknown Client"}
            </p>
            <span className="text-gray-300">vs</span>
            <p className="text-gray-600 truncate text-sm">
              {oppParty?.name || "Unknown Party"}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Case #{caseData.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StageBadge stage={caseData.stage} />
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Financial Row */}
      {financials && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-800">
              {formatCurrency(financials.cheque_amount)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Cheque: {formatDisplayDate(financials.cheque_date)}</span>
          </div>
        </div>
      )}

      {/* Deadlines Row */}
      {caseData.complaint_deadline && (
        <div className="mb-3">
          <Countdown
            label="Complaint Deadline"
            date={caseData.complaint_deadline}
            showIcon
          />
        </div>
      )}

      {/* Next Action */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Created: {formatDisplayDate(caseData.created_at)}
        </p>
        <p className="text-xs font-semibold text-brand-600">
          → {nextAction}
        </p>
      </div>
    </div>
  );
}
