import { TZDate } from "@date-fns/tz";
import { BUSINESS_TIMEZONE, BOOKING_WINDOW_DAYS } from "./config";

export type SelectableDay = { iso: string; label: string };

/** روزهای قابل‌انتخاب در پنجره‌ی رزرو که با ساعات کاری (weekdays) هم‌خوانی دارند. */
export function buildSelectableDays(
  weekdays: number[],
  locale: string,
): SelectableDay[] {
  const tz = BUSINESS_TIMEZONE;
  const set = new Set(weekdays);
  const out: SelectableDay[] = [];
  const dayMs = 86400000;

  const fmtISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const fmtLabel = new Intl.DateTimeFormat(
    locale === "fa" ? "fa-IR" : "en-US",
    { timeZone: tz, weekday: "short", day: "numeric", month: "short" },
  );

  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const ms = Date.now() + i * dayMs;
    const iso = fmtISO.format(new Date(ms)); // 'YYYY-MM-DD' به وقت کسب‌وکار
    const [y, m, d] = iso.split("-").map(Number);
    const wd = new TZDate(y, m - 1, d, 12, 0, 0, tz).getDay();
    if (!set.has(wd)) continue;
    out.push({ iso, label: fmtLabel.format(new Date(ms)) });
  }

  return out;
}
