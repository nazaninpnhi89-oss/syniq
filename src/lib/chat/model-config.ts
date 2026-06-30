import { createAdminClient } from "@/lib/supabase/server";

export interface ModelConfig {
  provider: string;
  activeModel: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  fallbackProvider: string | null;
  fallbackModel: string | null;
}

export const OPENROUTER_MODELS = [
  { slug: "anthropic/claude-haiku-4-5",              label: "Claude Haiku 4.5 (Fast)",         provider: "Anthropic" },
  { slug: "anthropic/claude-sonnet-4-5",             label: "Claude Sonnet 4.5 (Balanced)",     provider: "Anthropic" },
  { slug: "anthropic/claude-opus-4-8",               label: "Claude Opus 4.8 (Powerful)",       provider: "Anthropic" },
  { slug: "openai/gpt-4o-mini",                      label: "GPT-4o Mini (Cheap)",              provider: "OpenAI"    },
  { slug: "openai/gpt-4o",                           label: "GPT-4o (Smart)",                   provider: "OpenAI"    },
  { slug: "google/gemini-flash-1.5",                 label: "Gemini Flash 1.5 (Fast)",          provider: "Google"    },
  { slug: "google/gemini-pro-1.5",                   label: "Gemini Pro 1.5 (Balanced)",        provider: "Google"    },
  { slug: "meta-llama/llama-3.3-70b-instruct",       label: "Llama 3.3 70B (Open)",             provider: "Meta"      },
  { slug: "qwen/qwen-2.5-72b-instruct",              label: "Qwen 2.5 72B (Multilingual)",      provider: "Alibaba"   },
] as const;

const DEFAULTS: ModelConfig = {
  provider: "openrouter",
  activeModel: "anthropic/claude-haiku-4-5",
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1.0,
  fallbackProvider: null,
  fallbackModel: null,
};

interface ScheduleRule {
  days?: number[]; // 0=Sun..6=Sat; omit = all days
  fromHour: number;
  toHour: number;
  model: string;
}

function applySchedule(
  base: ModelConfig,
  schedule: ScheduleRule[],
): ModelConfig {
  if (!schedule?.length) return base;
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  for (const rule of schedule) {
    const dayMatch = !rule.days || rule.days.includes(day);
    const hourMatch = hour >= rule.fromHour && hour < rule.toHour;
    if (dayMatch && hourMatch) {
      return { ...base, activeModel: rule.model };
    }
  }
  return base;
}

const _cache: Map<string, { value: ModelConfig; expires: number }> = new Map();
const CACHE_TTL_MS = 60_000;

export async function getModelConfig(channel: string): Promise<ModelConfig> {
  const cached = _cache.get(channel);
  if (cached && Date.now() < cached.expires) return cached.value;

  const db = createAdminClient();

  // Try exact channel match first, fall back to 'default'
  const { data } = await db
    .from("model_config")
    .select("*")
    .in("channel", [channel, "default"])
    .order("channel", { ascending: true }); // 'default' < channel alphabetically — invert below

  const rows = data ?? [];
  const exact = rows.find((r) => r.channel === channel);
  const fallback = rows.find((r) => r.channel === "default");
  const row = exact ?? fallback;

  if (!row) {
    _cache.set(channel, { value: DEFAULTS, expires: Date.now() + CACHE_TTL_MS });
    return DEFAULTS;
  }

  const base: ModelConfig = {
    provider: row.provider,
    activeModel: row.active_model,
    temperature: Number(row.temperature),
    maxTokens: row.max_tokens,
    topP: Number(row.top_p),
    fallbackProvider: row.fallback_provider ?? null,
    fallbackModel: row.fallback_model ?? null,
  };

  const config = applySchedule(base, row.schedule ?? []);
  _cache.set(channel, { value: config, expires: Date.now() + CACHE_TTL_MS });
  return config;
}

export function invalidateModelConfigCache(): void {
  _cache.clear();
}
