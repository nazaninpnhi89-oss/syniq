import OpenAI from "openai";
import { readFileSync } from "fs";
import { resolve } from "path";
import { getHistory, saveMessage } from "./memory";
import { search } from "./rag";
import { toolDefinitions, executeTool } from "./tools";
import { getModelConfig } from "./model-config";
import { getActivePrompt } from "./prompt-manager";
import type { Locale } from "./types";

interface KnowledgeEntry { title: string; content: string; locale: string; }

function loadKnowledge(locale: Locale): string {
  const path = resolve(process.cwd(), "src/lib/chat/knowledge.json");
  const all: KnowledgeEntry[] = JSON.parse(readFileSync(path, "utf-8"));
  return all
    .filter((e) => e.locale === locale)
    .map((e) => `[${e.title}]\n${e.content}`)
    .join("\n\n---\n\n");
}

const FALLBACK_SYSTEM = `You are SYNIQ's AI assistant — bilingual in English and Persian (Farsi).

RULES:
- Detect the language the user writes in and ALWAYS respond in that same language.
- ONLY use Persian or English. NEVER use Polish, French, Arabic, or any other language.
- Be concise, warm, and professional.
- Use the knowledge base to answer accurately. If you do not know, say so honestly.
- When asked for the website, share: {{SITE_URL}}
- When a user wants to book, direct them to: {{BOOK_URL}}
- When a user expresses interest or shares contact info, call capture_lead.
- When a user asks about booking/payment status, call get_customer_status (ask for email first).

KNOWLEDGE BASE:
{{KNOWLEDGE}}

{{RAG_CONTEXT}}`;

function buildSystem(ragContext: string, locale: Locale, template: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://syniq-sigma.vercel.app";
  const bookUrl = `${siteUrl}/${locale}/book`;
  const knowledge = loadKnowledge(locale);
  const ragSection = ragContext ? `ADDITIONAL RAG CONTEXT:\n${ragContext}` : "";

  return template
    .replace(/\{\{SITE_URL\}\}/g, siteUrl)
    .replace(/\{\{BOOK_URL\}\}/g, bookUrl)
    .replace(/\{\{KNOWLEDGE\}\}/g, knowledge)
    .replace(/\{\{RAG_CONTEXT\}\}/g, ragSection);
}

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY!,
    });
  }
  return _client;
}

type Message = OpenAI.Chat.ChatCompletionMessageParam;

function historyToMessages(
  history: Awaited<ReturnType<typeof getHistory>>,
  userMessage: string,
  system: string,
): Message[] {
  const msgs: Message[] = [{ role: "system", content: system }];

  for (const msg of history) {
    if (msg.role === "user") {
      msgs.push({ role: "user", content: msg.content ?? "" });
    } else if (msg.role === "assistant") {
      msgs.push({ role: "assistant", content: msg.content ?? "" });
    }
  }

  msgs.push({ role: "user", content: userMessage });
  return msgs;
}

const LITE_MODE = process.env.CHAT_LITE === "true";

export interface StreamToken {
  type: "token" | "message_id" | "sources";
  content?: string;
  id?: string;
  chunks?: Array<{ id: string; title: string; similarity: number }>;
}

/**
 * Stream-first: yields tokens as the model responds.
 * Also yields message_id and sources events for the client to use.
 * Set CHAT_LITE=true to skip RAG and tools (useful for quick testing).
 */
export async function* processMessage(
  sessionId: string,
  userMessage: string,
  locale: Locale,
  channel = "web",
): AsyncGenerator<StreamToken> {
  await saveMessage(sessionId, "user", userMessage);

  const [history, ragChunks, modelConfig, promptVersion] = await Promise.all([
    getHistory(sessionId, 20),
    LITE_MODE ? Promise.resolve([]) : search(userMessage, locale).catch(() => []),
    getModelConfig(channel),
    getActivePrompt(),
  ]);

  const ragContext = ragChunks
    .map((c) => `[${c.title}]\n${c.content}`)
    .join("\n\n---\n\n");

  const template = promptVersion?.content ?? FALLBACK_SYSTEM;
  const system = buildSystem(ragContext, locale, template);
  const messages = historyToMessages(history.slice(0, -1), userMessage, system);
  const client = getClient();

  const modelId = modelConfig.activeModel;
  const commonParams = {
    model: modelId,
    max_tokens: modelConfig.maxTokens,
    temperature: modelConfig.temperature,
    top_p: modelConfig.topP,
    stream: true as const,
    stream_options: { include_usage: true },
  };

  if (LITE_MODE) {
    const stream = await client.chat.completions.create({
      ...commonParams,
      messages,
    });

    let replyText = "";
    let tokensIn: number | undefined;
    let tokensOut: number | undefined;

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        replyText += text;
        yield { type: "token", content: text };
      }
      if (chunk.usage) {
        tokensIn = chunk.usage.prompt_tokens;
        tokensOut = chunk.usage.completion_tokens;
      }
    }

    const msgId = await saveMessage(sessionId, "assistant", replyText, undefined, {
      model_used: modelId,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    });
    yield { type: "message_id", id: msgId };
    if (ragChunks.length > 0) {
      yield {
        type: "sources",
        chunks: ragChunks.map((c) => ({ id: c.id, title: c.title, similarity: c.similarity })),
      };
    }
    return;
  }

  // Phase 1 — stream with tools enabled
  const stream1 = await client.chat.completions.create({
    ...commonParams,
    messages,
    tools: toolDefinitions,
    tool_choice: "auto",
  });

  let firstPassText = "";
  const toolCallsMap: Record<string, { name: string; args: string }> = {};
  let phase1TokensIn: number | undefined;
  let phase1TokensOut: number | undefined;

  for await (const chunk of stream1) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      firstPassText += delta.content;
      yield { type: "token", content: delta.content };
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index;
        if (!toolCallsMap[idx]) toolCallsMap[idx] = { name: "", args: "" };
        if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
        if (tc.function?.arguments) toolCallsMap[idx].args += tc.function.arguments;
      }
    }
    if (chunk.usage) {
      phase1TokensIn = chunk.usage.prompt_tokens;
      phase1TokensOut = chunk.usage.completion_tokens;
    }
  }

  const toolCalls = Object.values(toolCallsMap);

  if (toolCalls.length === 0) {
    const msgId = await saveMessage(sessionId, "assistant", firstPassText, undefined, {
      model_used: modelId,
      tokens_in: phase1TokensIn,
      tokens_out: phase1TokensOut,
      retrieved_chunk_ids: ragChunks.map((c) => c.id),
    });
    yield { type: "message_id", id: msgId };
    if (ragChunks.length > 0) {
      yield {
        type: "sources",
        chunks: ragChunks.map((c) => ({ id: c.id, title: c.title, similarity: c.similarity })),
      };
    }
    return;
  }

  // Phase 2 — execute tools and stream final answer
  const toolMessages: Message[] = [
    ...messages,
    {
      role: "assistant",
      content: firstPassText || null,
      tool_calls: toolCalls.map((tc, i) => ({
        id: `call_${i}`,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.args },
      })),
    },
  ];

  for (let i = 0; i < toolCalls.length; i++) {
    const tc = toolCalls[i];
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(tc.args); } catch { /* keep empty */ }
    const result = await executeTool(tc.name, args, sessionId);
    toolMessages.push({
      role: "tool",
      tool_call_id: `call_${i}`,
      content: result,
    });
  }

  const stream2 = await client.chat.completions.create({
    ...commonParams,
    messages: toolMessages,
  });

  let secondPassText = "";
  let phase2TokensIn: number | undefined;
  let phase2TokensOut: number | undefined;

  for await (const chunk of stream2) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) {
      secondPassText += text;
      yield { type: "token", content: text };
    }
    if (chunk.usage) {
      phase2TokensIn = chunk.usage.prompt_tokens;
      phase2TokensOut = chunk.usage.completion_tokens;
    }
  }

  const msgId = await saveMessage(sessionId, "assistant", secondPassText, undefined, {
    model_used: modelId,
    tokens_in: (phase1TokensIn ?? 0) + (phase2TokensIn ?? 0),
    tokens_out: (phase1TokensOut ?? 0) + (phase2TokensOut ?? 0),
    retrieved_chunk_ids: ragChunks.map((c) => c.id),
  });
  yield { type: "message_id", id: msgId };
  if (ragChunks.length > 0) {
    yield {
      type: "sources",
      chunks: ragChunks.map((c) => ({ id: c.id, title: c.title, similarity: c.similarity })),
    };
  }
}

export async function processMessageFull(
  sessionId: string,
  userMessage: string,
  locale: Locale,
  channel = "telegram",
): Promise<string> {
  let text = "";
  for await (const token of processMessage(sessionId, userMessage, locale, channel)) {
    if (token.type === "token") text += token.content ?? "";
  }
  return text;
}
