import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

  const [
    sessionsRes,
    messagesRes,
    leadsRes,
    feedbackRes,
    tokenRes,
    channelRes,
    dailyRes,
  ] = await Promise.all([
    db.from("chat_sessions").select("*", { count: "exact", head: true }),
    db.from("chat_messages").select("*", { count: "exact", head: true }).eq("role", "user"),
    db.from("leads").select("*", { count: "exact", head: true }),
    db.from("feedback").select("rating"),
    db.from("chat_messages").select("tokens_in, tokens_out").eq("role", "assistant"),
    db.from("chat_sessions").select("source"),
    db.rpc("get_daily_analytics", { from_date: from, to_date: to }),
  ]);

  const feedback = feedbackRes.data ?? [];
  const feedbackPositive = feedback.filter((f) => f.rating === 1).length;
  const feedbackNegative = feedback.filter((f) => f.rating === -1).length;

  const tokens = tokenRes.data ?? [];
  const totalTokensIn = tokens.reduce((s, r) => s + (r.tokens_in ?? 0), 0);
  const totalTokensOut = tokens.reduce((s, r) => s + (r.tokens_out ?? 0), 0);

  const sessions = channelRes.data ?? [];
  const byChannel: Record<string, number> = { web: 0, widget: 0, telegram: 0 };
  for (const s of sessions) {
    if (s.source in byChannel) byChannel[s.source]++;
  }

  return NextResponse.json({
    totalSessions: sessionsRes.count ?? 0,
    totalMessages: messagesRes.count ?? 0,
    totalLeads: leadsRes.count ?? 0,
    feedbackPositive,
    feedbackNegative,
    tokenUsage: { in: totalTokensIn, out: totalTokensOut },
    byChannel,
    byDay: dailyRes.data ?? [],
  });
}
