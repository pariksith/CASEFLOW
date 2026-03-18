import { CaseStage } from "@/types/case.types";
import { ORDERED_STAGES } from "@/constants/caseStages";
import { Check } from "lucide-react";
import clsx from "clsx";

interface StageTrackerProps {
  currentStage: CaseStage;
}

// Simplified linear stages for display
const DISPLAY_STAGES: CaseStage[] = [
  "drafting",
  "notice_generated",
  "notice_served",
  "waiting_period",
  "complaint_eligible",
  "complaint_filed",
];

export default function StageTracker({ currentStage }: StageTrackerProps) {
  const currentOrder =
    ORDERED_STAGES.find((s) => s.key === currentStage)?.order || 1;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-brand-500 z-0 transition-all duration-500"
          style={{
            width: `${
              ((currentOrder - 1) / (DISPLAY_STAGES.length - 1)) * 100
            }%`,
          }}
        />

        {DISPLAY_STAGES.map((stage) => {
          const config = ORDERED_STAGES.find((s) => s.key === stage);
          if (!config) return null;

          const isPast = config.order < currentOrder;
          const isCurrent = config.key === currentStage;
          const isFuture = config.order > currentOrder;

          return (
            <div
              key={stage}
              className="flex flex-col items-center z-10 flex-1 first:items-start last:items-end"
            >
              {/* Circle */}
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isPast &&
                    "bg-brand-600 border-brand-600 text-white",
                  isCurrent &&
                    "bg-white border-brand-600 ring-4 ring-brand-100",
                  isFuture && "bg-white border-gray-300 text-gray-400"
                )}
              >
                {isPast ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span
                    className={clsx(
                      "text-xs font-bold",
                      isCurrent ? "text-brand-600" : "text-gray-400"
                    )}
                  >
                    {config.order}
                  </span>
                )}
              </div>

              {/* Label */}
              <p
                className={clsx(
                  "text-xs font-medium mt-2 text-center max-w-[70px] leading-tight",
                  isCurrent ? "text-brand-700" : isPast ? "text-gray-600" : "text-gray-400"
                )}
              >
                {config.label.replace("⚠️ ", "")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
