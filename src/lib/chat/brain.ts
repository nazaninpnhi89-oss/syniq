import OpenAI from "openai";
import { getHistory, saveMessage } from "./memory";
import { search } from "./rag";
import { toolDefinitions, executeTool } from "./tools";
import type { Locale } from "./types";

const CHAT_MODEL = "llama-3.3-70b-versatile";
const MAX_OUTPUT_TOKENS = 1024;

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

function buildSystem(ragContext: string, locale: Locale): string {
  const bookPath = locale === "fa" ? "/fa/book" : "/en/book";
  return `You are SYNIQ's AI assistant — bilingual in English and Persian (Farsi).

SYNIQ is an AI consulting brand founded by Nazanin Panahi. Tagline: "From Strategy to Intelligent Growth."
Core services: AI strategy consultation (45 min, $45) and custom chatbot design for businesses (no fixed price — scope is discussed in a free 30-min call).

RULES:
- Detect the language the user writes in and ALWAYS respond in that same language.
- If the user writes in Persian, respond in Persian. If in English, respond in English.
- Be concise, warm, and professional.
- Use the knowledge base below to answer accurately. If you do not know, say so honestly.
- When a user wants to book, direct them to ${bookPath}.
- When a user expresses interest in being contacted or shares their info, call the capture_lead tool.
- When a user asks about their booking or payment status, call get_customer_status (ask for email first).

KNOWLEDGE BASE:
${ragContext || "No relevant context found."}`;
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

/**
 * Stream-first: yields text tokens as soon as the model starts responding.
 * If a tool call is detected, executes it and streams the follow-up answer.
 * Set CHAT_LITE=true to skip RAG and tools (useful for quick testing).
 */
export async function* processMessage(
  sessionId: string,
  userMessage: string,
  locale: Locale,
): AsyncGenerator<string> {
  await saveMessage(sessionId, "user", userMessage);

  const [history, ragChunks] = await Promise.all([
    getHistory(sessionId, 20),
    LITE_MODE ? Promise.resolve([]) : search(userMessage, locale).catch(() => []),
  ]);

  const ragContext = ragChunks
    .map((c) => `[${c.title}]\n${c.content}`)
    .join("\n\n---\n\n");

  const system = buildSystem(ragContext, locale);
  const messages = historyToMessages(history.slice(0, -1), userMessage, system);
  const client = getClient();

  if (LITE_MODE) {
    // Lite mode: plain chat, no tools
    const stream = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
    });

    let replyText = "";
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        replyText += text;
        yield text;
      }
    }
    await saveMessage(sessionId, "assistant", replyText);
    return;
  }

  // Phase 1 — stream with tools enabled
  const stream1 = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    tools: toolDefinitions,
    tool_choice: "auto",
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
  });

  let firstPassText = "";
  const toolCallsMap: Record<string, { name: string; args: string }> = {};

  for await (const chunk of stream1) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      firstPassText += delta.content;
      yield delta.content;
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index;
        if (!toolCallsMap[idx]) {
          toolCallsMap[idx] = { name: tc.function?.name ?? "", args: "" };
        }
        if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
        if (tc.function?.arguments) toolCallsMap[idx].args += tc.function.arguments;
      }
    }
  }

  const toolCalls = Object.values(toolCallsMap);

  if (toolCalls.length === 0) {
    await saveMessage(sessionId, "assistant", firstPassText);
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
    model: CHAT_MODEL,
    messages: toolMessages,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
  });

  let secondPassText = "";
  for await (const chunk of stream2) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) {
      secondPassText += text;
      yield text;
    }
  }

  await saveMessage(sessionId, "assistant", secondPassText);
}

export async function processMessageFull(
  sessionId: string,
  userMessage: string,
  locale: Locale,
): Promise<string> {
  let text = "";
  for await (const token of processMessage(sessionId, userMessage, locale)) {
    text += token;
  }
  return text;
}
