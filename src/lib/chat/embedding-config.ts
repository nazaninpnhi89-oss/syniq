import { createAdminClient } from "@/lib/supabase/server";

export interface EmbeddingConfig {
  provider: "voyage" | "openai" | "cohere" | "google";
  model: string;
  dimensions: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  rerankerEnabled: boolean;
  rerankerModel: string | null;
}

const DEFAULTS: EmbeddingConfig = {
  provider: "voyage",
  model: "voyage-3",
  dimensions: 1024,
  chunkSize: 500,
  chunkOverlap: 50,
  topK: 5,
  similarityThreshold: 0.65,
  rerankerEnabled: false,
  rerankerModel: null,
};

let _cache: { value: EmbeddingConfig; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  if (_cache && Date.now() < _cache.expires) return _cache.value;

  const db = createAdminClient();
  const { data } = await db
    .from("embedding_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    _cache = { value: DEFAULTS, expires: Date.now() + CACHE_TTL_MS };
    return DEFAULTS;
  }

  const config: EmbeddingConfig = {
    provider: data.provider as EmbeddingConfig["provider"],
    model: data.model,
    dimensions: data.dimensions,
    chunkSize: data.chunk_size,
    chunkOverlap: data.chunk_overlap,
    topK: data.top_k,
    similarityThreshold: Number(data.similarity_threshold),
    rerankerEnabled: data.reranker_enabled,
    rerankerModel: data.reranker_model ?? null,
  };

  _cache = { value: config, expires: Date.now() + CACHE_TTL_MS };
  return config;
}

export function invalidateEmbeddingConfigCache(): void {
  _cache = null;
}
