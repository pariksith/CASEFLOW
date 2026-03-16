import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export default function Spinner({ size = "md", className, label }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={clsx("animate-spin text-brand-600", sizes[size])} />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label={label || "Loading..."} />
    </div>
  );
}
