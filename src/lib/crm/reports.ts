import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/format";

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  pct: number;
}

const PAST_CONSULT_STAGES = ["consult", "proposal", "negotiation", "won", "lost"];

export async function getFunnelCounts(db: SupabaseClient): Promise<FunnelStep[]> {
  const [{ count: totalLeads }, { count: converted }, { count: deals }, { count: pastConsult }, { count: won }] =
    await Promise.all([
      db.from("leads").select("*", { count: "exact", head: true }),
      db.from("leads").select("*", { count: "exact", head: true }).eq("status", "converted"),
      db.from("deals").select("*", { count: "exact", head: true }),
      db.from("deals").select("*", { count: "exact", head: true }).in("stage_key", PAST_CONSULT_STAGES),
      db.from("deals").select("*", { count: "exact", head: true }).eq("status", "won"),
    ]);

  const total = totalLeads ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return [
    { key: "leads", label: "leads", count: total, pct: 100 },
    { key: "converted", label: "converted", count: converted ?? 0, pct: pct(converted ?? 0) },
    { key: "deals", label: "deals", count: deals ?? 0, pct: pct(deals ?? 0) },
    { key: "pastConsult", label: "pastConsult", count: pastConsult ?? 0, pct: pct(pastConsult ?? 0) },
    { key: "won", label: "won", count: won ?? 0, pct: pct(won ?? 0) },
  ];
}

export interface StageValue {
  key: string;
  label: string;
  total: number;
  count: number;
}

export async function getPipelineValueByStage(
  db: SupabaseClient,
  locale: string,
): Promise<StageValue[]> {
  const [{ data: stages }, { data: deals }] = await Promise.all([
    db.from("pipeline_stages").select("*").order("sort_order", { ascending: true }),
    db.from("deals").select("stage_key, amount_toman"),
  ]);

  return (stages ?? []).map((s) => {
    const inStage = (deals ?? []).filter((d) => d.stage_key === s.key);
    return {
      key: s.key,
      label: locale === "fa" ? s.label_fa : s.label_en,
      total: inStage.reduce((sum, d) => sum + (d.amount_toman ?? 0), 0),
      count: inStage.length,
    };
  });
}

export interface SourceCount {
  source: string;
  count: number;
}

export async function getLeadSources(db: SupabaseClient): Promise<SourceCount[]> {
  const { data } = await db.from("leads").select("source");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.source ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

export interface MonthlyRevenue {
  month: string;
  total: number;
}

export async function getMonthlyRevenue(
  db: SupabaseClient,
  locale: string,
  months = 12,
): Promise<MonthlyRevenue[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);

  const { data } = await db
    .from("deals")
    .select("amount_toman, won_at")
    .eq("status", "won")
    .gte("won_at", since.toISOString());

  const buckets = new Map<string, number>();
  const cursor = new Date(since);
  for (let i = 0; i < months; i++) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    buckets.set(key, 0);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const row of data ?? []) {
    if (!row.won_at) continue;
    const d = new Date(row.won_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + (row.amount_toman ?? 0));
  }

  const result: MonthlyRevenue[] = [];
  const cursor2 = new Date(since);
  for (let i = 0; i < months; i++) {
    const key = `${cursor2.getFullYear()}-${cursor2.getMonth()}`;
    result.push({
      month: formatDate(locale, cursor2, { month: "short", year: "2-digit" }),
      total: buckets.get(key) ?? 0,
    });
    cursor2.setMonth(cursor2.getMonth() + 1);
  }
  return result;
}
