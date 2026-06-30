import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processMessageFull } from "@/lib/chat/brain";
import type { Locale } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const MAX_MESSAGES_PER_MINUTE = 10;

async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

function getWelcomeKeyboard(locale: Locale) {
  const buttons =
    locale === "fa"
      ? [
          [{ text: "💬 سوال دارم", callback_data: "ask" }],
          [{ text: "📅 رزرو مشاوره", callback_data: "book" }],
          [{ text: "ℹ️ درباره SYNIQ", callback_data: "about" }],
        ]
      : [
          [{ text: "💬 I have a question", callback_data: "ask" }],
          [{ text: "📅 Book consultation", callback_data: "book" }],
          [{ text: "ℹ️ About SYNIQ", callback_data: "about" }],
        ];
  return { inline_keyboard: buttons };
}

const QUICK_REPLY_MESSAGES: Record<string, Record<Locale, string>> = {
  ask: {
    fa: "چه سوالی دارم؟ می‌تونید کمکم کنید؟",
    en: "I have a question. Can you help me?",
  },
  book: {
    fa: "می‌خوام یک جلسه مشاوره رزرو کنم.",
    en: "I'd like to book a consultation session.",
  },
  about: {
    fa: "بیشتر درباره SYNIQ برام توضیح بده.",
    en: "Tell me more about SYNIQ.",
  },
};

async function ensureTelegramSession(chatId: number, locale: Locale): Promise<{
  sessionId: string;
  userId: string | undefined;
}> {
  const db = createAdminClient();
  const sessionId = `telegram_${chatId}`;

  const { data: existing } = await db
    .from("chat_sessions")
    .select("id, unified_user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (existing) {
    return { sessionId, userId: existing.unified_user_id ?? undefined };
  }

  await db.from("chat_sessions").upsert({
    id: sessionId,
    source: "telegram",
    locale,
  });

  return { sessionId, userId: undefined };
}

async function upsertUnifiedUser(
  chatId: number,
  name: string | undefined,
  sessionId: string,
): Promise<void> {
  const db = createAdminClient();

  const { data } = await db
    .from("unified_users")
    .upsert(
      { channel: "telegram", external_id: String(chatId), name: name ?? null },
      { onConflict: "channel,external_id" },
    )
    .select("id")
    .maybeSingle();

  if (data?.id) {
    await db
      .from("chat_sessions")
      .update({ unified_user_id: data.id })
      .eq("id", sessionId);
  }
}

async function isRateLimited(sessionId: string): Promise<boolean> {
  const db = createAdminClient();
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count } = await db
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("role", "user")
    .gte("created_at", oneMinuteAgo);

  return (count ?? 0) >= MAX_MESSAGES_PER_MINUTE;
}

export async function POST(req: NextRequest) {
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
      from?: { language_code?: string; first_name?: string };
    };
    callback_query?: {
      id: string;
      data?: string;
      from: { id: number; language_code?: string; first_name?: string };
      message?: { chat: { id: number } };
    };
  };

  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle callback_query (inline keyboard button taps)
  if (update.callback_query) {
    const cq = update.callback_query;
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cq.id }),
    });

    const chatId = cq.message?.chat.id ?? cq.from.id;
    const langCode = cq.from.language_code ?? "fa";
    const locale: Locale = langCode.startsWith("fa") ? "fa" : "en";
    const { sessionId } = await ensureTelegramSession(chatId, locale);
    const predefined = QUICK_REPLY_MESSAGES[cq.data ?? "ask"];
    const text = predefined?.[locale] ?? predefined?.["en"] ?? "Help me";

    try {
      const reply = await processMessageFull(sessionId, text, locale, "telegram");
      await sendMessage(chatId, reply);
    } catch (err) {
      console.error("Callback query error:", err);
    }

    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg?.text?.trim()) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const langCode = msg.from?.language_code ?? "fa";
  const locale: Locale = langCode.startsWith("fa") ? "fa" : "en";

  try {
    const { sessionId } = await ensureTelegramSession(chatId, locale);
    await upsertUnifiedUser(chatId, msg.from?.first_name, sessionId);

    const text = msg.text.trim();

    // Handle commands
    if (text === "/start") {
      const greeting =
        locale === "fa"
          ? "سلام! من دستیار هوشمند SYNIQ هستم. چطور می‌تونم کمکتون کنم؟"
          : "Hello! I'm SYNIQ's AI assistant. How can I help you today?";
      await sendMessage(chatId, greeting, getWelcomeKeyboard(locale));
      return NextResponse.json({ ok: true });
    }

    if (text === "/help") {
      const help =
        locale === "fa"
          ? "دستورات:\n/start — شروع\n/reset — بازنشانی مکالمه\n/help — راهنما"
          : "Commands:\n/start — Start\n/reset — Reset conversation\n/help — Help";
      await sendMessage(chatId, help);
      return NextResponse.json({ ok: true });
    }

    if (text === "/reset") {
      const db = createAdminClient();
      await db
        .from("chat_sessions")
        .update({ status: "closed" })
        .eq("id", `telegram_${chatId}`);
      // Create a fresh session with a new id
      await db.from("chat_sessions").upsert({
        id: `telegram_${chatId}`,
        source: "telegram",
        locale,
        status: "active",
      });

      const resetMsg =
        locale === "fa"
          ? "مکالمه بازنشانی شد. بفرمایید، چطور می‌تونم کمکتون کنم؟"
          : "Conversation reset. How can I help you?";
      await sendMessage(chatId, resetMsg);
      return NextResponse.json({ ok: true });
    }

    // Rate limiting
    if (await isRateLimited(sessionId)) {
      const throttleMsg =
        locale === "fa"
          ? "پیام‌های زیادی فرستادید. لطفاً یک دقیقه صبر کنید."
          : "Too many messages. Please wait a minute.";
      await sendMessage(chatId, throttleMsg);
      return NextResponse.json({ ok: true });
    }

    const reply = await processMessageFull(sessionId, text, locale, "telegram");
    await sendMessage(chatId, reply);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    const errMsg =
      locale === "fa"
        ? "متأسفم، مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
        : "Sorry, something went wrong. Please try again.";
    await sendMessage(chatId, errMsg);
  }

  return NextResponse.json({ ok: true });
}
