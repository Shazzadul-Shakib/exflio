const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number, currency = "USD"): string {
  let formatter = currencyFormatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
    currencyFormatterCache.set(currency, formatter);
  }
  return formatter.format(amount);
}

/** Compact form for stat tiles: 1,284 / 12.9K / $4.2M */
export function formatCompactCurrency(amount: number, currency = "USD"): string {
  const abs = Math.abs(amount);
  if (abs < 100_000) return formatCurrency(amount, currency);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return formatter.format(amount);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthLabel(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Adds `delta` months to a {year, month} pair, wrapping year as needed. */
export function shiftYearMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
