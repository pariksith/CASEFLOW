"use client";

import { daysUntil, getUrgencyLevel } from "@/lib/utils/dateUtils";
import clsx from "clsx";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";

interface CountdownProps {
  label: string;
  date: string | null;
  showIcon?: boolean;
}

export default function Countdown({ label, date, showIcon = true }: CountdownProps) {
  const days = daysUntil(date);
  const urgency = getUrgencyLevel(days);

  const config = {
    safe: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      icon: <CheckCircle className="w-4 h-4" />,
      label: `${days} days left`,
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-300",
      text: "text-yellow-700",
      icon: <AlertTriangle className="w-4 h-4" />,
      label: `${days} days left — Act soon`,
    },
    critical: {
      bg: "bg-red-50 border-red-400",
      text: "text-red-700",
      icon: <AlertTriangle className="w-4 h-4 animate-pulse" />,
      label: days === 0 ? "Due TODAY" : `${days} day left — URGENT`,
    },
    expired: {
      bg: "bg-gray-100 border-gray-300",
      text: "text-gray-500",
      icon: <XCircle className="w-4 h-4" />,
      label: "Deadline passed",
    },
  };

  const c = config[urgency];

  if (!date) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <Clock className="w-4 h-4 text-gray-400" />
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-xs font-medium text-gray-500">Not set</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-3 py-2 border rounded-lg",
        c.bg
      )}
    >
      {showIcon && <span className={c.text}>{c.icon}</span>}
      <div>
        <p className={clsx("text-xs font-medium", c.text)}>{label}</p>
        <p className={clsx("text-sm font-bold", c.text)}>{c.label}</p>
      </div>
    </div>
  );
}
