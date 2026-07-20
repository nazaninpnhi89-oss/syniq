import { z } from "zod";
import { getGroqClient } from "@/lib/ai/groq-client";
import { getModelConfig } from "@/lib/chat/model-config";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("GROQ_API_KEY is not configured");
    this.name = "AiNotConfiguredError";
  }
}

export function aiErrorMessage(locale: string): string {
  return locale === "fa"
    ? "کلید API هوش مصنوعی تنظیم نشده است."
    : "AI is not configured — please set the API key.";
}

/**
 * Calls the CRM model channel and validates the JSON response against a
 * zod schema, retrying once with a stricter reminder if parsing/validation
 * fails.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
  channel = "crm",
): Promise<T> {
  if (!process.env.GROQ_API_KEY) throw new AiNotConfiguredError();

  const client = getGroqClient();
  const config = await getModelConfig(channel);

  // Groq/OpenAI's json_object response_format requires the literal word
  // "JSON" to appear somewhere in the messages, or the API call is rejected
  // with a 400 error — always include it, independent of the caller's prompt.
  const jsonSystemPrompt = `${systemPrompt}\n\nRespond with a single valid JSON object only, no other text.`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.chat.completions.create({
      model: config.activeModel,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: "system", content: jsonSystemPrompt },
        {
          role: "user",
          content:
            userPrompt +
            (attempt > 0
              ? "\n\nReturn ONLY valid JSON matching the required schema, no other text."
              : ""),
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      return schema.parse(raw);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI structured output validation failed");
}

/** Plain (non-JSON) text completion on the CRM channel, for prose generation. */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  channel = "crm",
): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new AiNotConfiguredError();

  const client = getGroqClient();
  const config = await getModelConfig(channel);

  const res = await client.chat.completions.create({
    model: config.activeModel,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}
