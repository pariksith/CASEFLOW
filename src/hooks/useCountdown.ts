"use client";

import { useState, useEffect } from "react";
import { differenceInDays, differenceInHours, isPast } from "date-fns";

interface CountdownState {
  daysLeft: number | null;
  hoursLeft: number | null;
  isExpired: boolean;
  isUrgent: boolean;
  isCritical: boolean;
  label: string;
  colorClass: string;
}

export function useCountdown(dateString: string | null): CountdownState {
  const [state, setState] = useState<CountdownState>({
    daysLeft: null,
    hoursLeft: null,
    isExpired: false,
    isUrgent: false,
    isCritical: false,
    label: "Not set",
    colorClass: "text-gray-400",
  });

  useEffect(() => {
    if (!dateString) return;

    const compute = () => {
      const target = new Date(dateString);
      const expired = isPast(target);
      const days = differenceInDays(target, new Date());
      const hours = differenceInHours(target, new Date());

      let label = "";
      let colorClass = "";

      if (expired) {
        label = "Deadline passed";
        colorClass = "text-gray-500";
      } else if (days === 0) {
        label = `${hours} hours left — TODAY`;
        colorClass = "text-red-700";
      } else if (days === 1) {
        label = "1 day left — TOMORROW";
        colorClass = "text-red-600";
      } else if (days <= 3) {
        label = `${days} days left — Act soon`;
        colorClass = "text-orange-600";
      } else if (days <= 7) {
        label = `${days} days left`;
        colorClass = "text-yellow-600";
      } else {
        label = `${days} days left`;
        colorClass = "text-green-600";
      }

      setState({
        daysLeft: days,
        hoursLeft: hours,
        isExpired: expired,
        isUrgent: !expired && days <= 7,
        isCritical: !expired && days <= 3,
        label,
        colorClass,
      });
    };

    compute();
    // Refresh every hour
    const interval = setInterval(compute, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dateString]);

  return state;
}
