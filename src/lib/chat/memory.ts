import { createAdminClient } from "@/lib/supabase/server";
import type { ChatMessage, Locale, Source } from "./types";

export async function createSession(
  source: Source,
  locale: Locale,
  userId?: string,
): Promise<string> {
  const db = createAdminClient();
  const id = `${source}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { error } = await db.from("chat_sessions").insert({
    id,
    source,
    locale,
    user_id: userId ?? null,
  });

  if (error) throw new Error(`createSession: ${error.message}`);
  return id;
}

export async function ensureSession(
  sessionId: string,
  source: Source,
  locale: Locale,
): Promise<string> {
  const db = createAdminClient();
  const { data } = await db
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (data) return sessionId;
  return createSession(source, locale);
}

export async function getHistory(
  sessionId: string,
  limit = 20,
): Promise<ChatMessage[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getHistory: ${error.message}`);
  return (data ?? []).reverse() as ChatMessage[];
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant" | "tool",
  content: string | null,
  toolCalls?: unknown,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
    tool_calls: toolCalls ?? null,
  });

  if (error) throw new Error(`saveMessage: ${error.message}`);
}
