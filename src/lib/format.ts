type Locale = "fa" | "en";

function intlLocale(locale: string): string {
  return locale === "fa" ? "fa-IR" : "en-US";
}

export function formatDate(
  locale: string,
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(d);
}

export function formatNumber(locale: string, n: number): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(n);
}

export function formatCurrency(locale: string, amountToman: number | null | undefined): string {
  if (amountToman == null) return "—";
  const num = formatNumber(locale, amountToman);
  return locale === "fa" ? `${num} تومان` : `${num} Toman`;
}

/** Numeric Jalali (Persian) calendar year for the given date, via ICU — no extra dependency. */
export function getJalaliYear(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric" }).formatToParts(
    date,
  );
  const year = parts.find((p) => p.type === "year")?.value;
  return year ? parseInt(year, 10) : date.getFullYear();
}

export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export type { Locale };
