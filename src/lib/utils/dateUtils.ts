import { differenceInDays, format, isPast, addDays } from "date-fns";

export function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  return differenceInDays(target, new Date());
}

export function isExpired(dateString: string | null): boolean {
  if (!dateString) return false;
  return isPast(new Date(dateString));
}

export function formatDisplayDate(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd MMM yyyy");
  } catch {
    return dateString;
  }
}

export function addDaysToDate(dateString: string, days: number): Date {
  return addDays(new Date(dateString), days);
}

export function getUrgencyLevel(
  daysLeft: number | null
): "safe" | "warning" | "critical" | "expired" {
  if (daysLeft === null) return "safe";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 1) return "critical";
  if (daysLeft <= 3) return "warning";
  return "safe";
}
