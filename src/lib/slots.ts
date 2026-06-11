import { TZDate } from "@date-fns/tz";
import { BUSINESS_TIMEZONE, MIN_LEAD_MS } from "./config";

export type AvailabilityRule = {
  weekday: number; // 0=یکشنبه ... 6=شنبه
  start_time: string; // 'HH:MM' یا 'HH:MM:SS'
  end_time: string;
};

/**
 * اسلات‌های خالی یک روز را تولید می‌کند.
 * @param dateISO تاریخ به فرم 'YYYY-MM-DD' (به وقت کسب‌وکار)
 * @returns آرایه‌ای از زمان شروع اسلات‌ها به‌صورت ISO (UTC)
 */
export function generateSlots(opts: {
  dateISO: string;
  rules: AvailabilityRule[];
  durationMin: number;
  bookedMs: number[];
  nowMs?: number;
}): string[] {
  const { dateISO, rules, durationMin, bookedMs, nowMs = Date.now() } = opts;
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return [];

  // روز هفته به وقت کسب‌وکار (ظهر را امتحان می‌کنیم تا از لبه‌ی DST دور بمانیم)
  const probe = new TZDate(y, m - 1, d, 12, 0, 0, BUSINESS_TIMEZONE);
  const weekday = probe.getDay();

  const dayRules = rules.filter((r) => r.weekday === weekday);
  const booked = new Set(bookedMs);
  const out: string[] = [];

  for (const r of dayRules) {
    const [sh, sm] = r.start_time.split(":").map(Number);
    const [eh, em] = r.end_time.split(":").map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);

    for (let t = startMin; t + durationMin <= endMin; t += durationMin) {
      const hh = Math.floor(t / 60);
      const mm = t % 60;
      const dt = new TZDate(y, m - 1, d, hh, mm, 0, BUSINESS_TIMEZONE);
      const ms = dt.getTime();
      if (ms < nowMs + MIN_LEAD_MS) continue;
      if (booked.has(ms)) continue;
      out.push(new Date(ms).toISOString());
    }
  }

  return out.sort();
}
