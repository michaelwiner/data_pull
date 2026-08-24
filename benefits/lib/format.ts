const heDate = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

export function formatDateHe(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : heDate.format(date);
}

/** Whole days from today until the date. Negative once it has passed. */
export function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - startOfToday.getTime()) / 86_400_000);
}

/** An offer expiring within a week gets a visible nudge in the feed. */
export function isExpiringSoon(validUntil: string | null): boolean {
  const days = daysUntil(validUntil);
  return days !== null && days >= 0 && days <= 7;
}

export function expiryLabelHe(validUntil: string | null): string | null {
  const days = daysUntil(validUntil);
  if (days === null) return null;
  if (days < 0) return "פג תוקף";
  if (days === 0) return "היום זה נגמר";
  if (days === 1) return "נשאר יום אחד";
  if (days <= 7) return `נשארו ${days} ימים`;
  const formatted = formatDateHe(validUntil);
  return formatted ? `בתוקף עד ${formatted}` : null;
}

/** Two-letter avatar fallback for members with no picture. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}
