import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createSession } from "@/lib/chat/memory";
import { processMessageFull } from "@/lib/chat/brain";
import type { Locale } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

async function ensureTelegramSession(
  chatId: number,
  locale: Locale,
): Promise<string> {
  const sessionId = `telegram_${chatId}`;
  const db = createAdminClient();
  const { data } = await db
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) {
    await createSession("telegram", locale);
    // Re-insert with explicit id
    await db.from("chat_sessions").upsert({
      id: sessionId,
      source: "telegram",
      locale,
    });
  }
  return sessionId;
}

export async function POST(req: NextRequest) {
  // Verify webhook secret if configured
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.headers.get("x-telegram-bot-api-secret-token");
    if (incoming !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: {
    message?: {
      text?: string;
      chat: { id: number };
      from?: { language_code?: string };
    };
  };

  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text || !msg.text.trim()) {
    return NextResponse.json({ ok: true });
  }

  const chatId = msg.chat.id;
  const langCode = msg.from?.language_code ?? "fa";
  const locale: Locale = langCode.startsWith("fa") ? "fa" : "en";

  try {
    const sessionId = await ensureTelegramSession(chatId, locale);
    const reply = await processMessageFull(sessionId, msg.text, locale);
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    const errMsg =
      locale === "fa"
        ? "متأسفم، مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
        : "Sorry, something went wrong. Please try again.";
    await sendTelegramMessage(chatId, errMsg);
  }

  return NextResponse.json({ ok: true });
}
