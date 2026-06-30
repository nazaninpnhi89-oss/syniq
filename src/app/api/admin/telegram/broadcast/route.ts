import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;

  const body = await req.json();
  const { message } = body;
  if (!message?.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });

  // Get all unique Telegram sessions (session id format: telegram_<chatId>)
  const { data: sessions, error } = await db
    .from("chat_sessions")
    .select("id")
    .eq("source", "telegram");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;

  for (const session of sessions ?? []) {
    // Parse chatId from session id: telegram_<chatId>
    const parts = session.id.split("_");
    const chatId = parts[1] ? parseInt(parts[1]) : NaN;
    if (isNaN(chatId)) continue;

    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });

    if (res.ok) sent++;
    else failed++;
  }

  await logAudit(user.id, "telegram.broadcast", "all_users", { sent, failed, message });
  return NextResponse.json({ ok: true, sent, failed });
}
