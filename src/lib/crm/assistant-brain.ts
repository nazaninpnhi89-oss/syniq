import "server-only";
import type OpenAI from "openai";
import { getGroqClient } from "@/lib/ai/groq-client";
import { getModelConfig } from "@/lib/chat/model-config";
import { assistantToolDefinitions, executeAssistantTool } from "@/lib/crm/assistant-tools";
import { createAdminClient } from "@/lib/supabase/server";

type Message = OpenAI.Chat.ChatCompletionMessageParam;

function systemPrompt(locale: string): string {
  return locale === "fa"
    ? `شما دستیار CRM سینیک هستید. فقط از داده‌های واقعی که از ابزارها دریافت می‌کنید استفاده کنید — هرگز عدد یا آماری از خودتان نسازید. اگر داده کافی نیست، صادقانه بگویید. پاسخ را کوتاه، دقیق و فارسی بنویسید.`
    : `You are Syniq's CRM assistant. Only use real data returned by tools — never invent numbers or statistics. If you don't have enough data, say so honestly. Keep answers short, precise, and in English.`;
}

export async function askAssistant(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  locale: string,
): Promise<string> {
  const client = getGroqClient();
  const config = await getModelConfig("crm");
  const db = createAdminClient();

  const messages: Message[] = [
    { role: "system", content: systemPrompt(locale) },
    ...history.map((m) => ({ role: m.role, content: m.content }) as Message),
    { role: "user", content: userMessage },
  ];

  const first = await client.chat.completions.create({
    model: config.activeModel,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages,
    tools: assistantToolDefinitions,
    tool_choice: "auto",
  });

  const choice = first.choices[0];
  const toolCalls = choice.message.tool_calls;

  if (!toolCalls?.length) {
    return choice.message.content ?? "";
  }

  messages.push(choice.message);
  for (const call of toolCalls) {
    if (call.type !== "function") continue;
    const result = await executeAssistantTool(db, call.function.name, call.function.arguments);
    messages.push({ role: "tool", tool_call_id: call.id, content: result });
  }

  const second = await client.chat.completions.create({
    model: config.activeModel,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages,
  });

  return second.choices[0]?.message?.content ?? "";
}
