import clsx from "clsx";
import { CaseStage } from "@/types/case.types";
import { CASE_STAGES } from "@/constants/caseStages";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    neutral: "bg-gray-50 text-gray-500 border border-gray-200",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StageBadgeProps {
  stage: CaseStage;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const config = CASE_STAGES[stage];
  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
        config?.color || "bg-gray-100 text-gray-600"
      )}
    >
      {config?.label || stage}
    </span>
  );
}
