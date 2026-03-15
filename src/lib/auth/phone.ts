export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // India default: 10-digit local mobile input -> +91xxxxxxxxxx
  if (!hasPlus && digits.length === 10) {
    return `+91${digits}`;
  }

  // Common local prefix 0xxxxxxxxxx -> +91xxxxxxxxxx
  if (!hasPlus && digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  // 91xxxxxxxxxx entered without + -> +91xxxxxxxxxx
  if (!hasPlus && digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // Generic E.164-ish fallback
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function phoneVariants(raw: string): string[] {
  const normalized = normalizePhone(raw);
  if (!normalized) return [];
  const digits = normalized.replace(/\D/g, "");
  const variants = new Set<string>([normalized, digits]);
  if (digits.startsWith("91") && digits.length === 12) {
    variants.add(digits.slice(2));
    variants.add(`+91${digits.slice(2)}`);
  }
  return Array.from(variants);
}
