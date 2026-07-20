import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { processMessage } from "@/lib/chat/brain";
import { createAdminClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const body = await req.json();
  const { message, locale = "fa", channel = "web" } = body;

  if (!message?.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });

  // Use a per-admin playground session
  const db = createAdminClient();
  const sessionId = `playground_${user.id}`;

  // Ensure the playground session exists
  await db
    .from("chat_sessions")
    .upsert({ id: sessionId, source: "web", locale }, { onConflict: "id" });

  let responseText = "";
  let messageId: string | undefined;
  let sources: Array<{ id: string; title: string; similarity: number }> = [];
  let modelUsed: string | undefined;

  for await (const token of processMessage(sessionId, message, locale as Locale, channel)) {
    if (token.type === "token") responseText += token.content ?? "";
    if (token.type === "message_id") messageId = token.id;
    if (token.type === "sources") sources = token.chunks ?? [];
  }

  // Get token usage from the saved message
  let tokensIn: number | undefined;
  let tokensOut: number | undefined;
  if (messageId) {
    const { data: msg } = await db
      .from("chat_messages")
      .select("model_used, tokens_in, tokens_out")
      .eq("id", parseInt(messageId))
      .maybeSingle();
    if (msg) {
      modelUsed = msg.model_used ?? undefined;
      tokensIn = msg.tokens_in ?? undefined;
      tokensOut = msg.tokens_out ?? undefined;
    }
  }

  return NextResponse.json({
    response: responseText,
    messageId,
    sources,
    modelUsed,
    tokensIn,
    tokensOut,
  });
}
