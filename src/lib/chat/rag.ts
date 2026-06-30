import { VoyageAIClient, VoyageAIError } from "voyageai";
import { createAdminClient } from "@/lib/supabase/server";
import { getEmbeddingConfig } from "./embedding-config";
import type { Locale, RagChunk } from "./types";

const RATE_LIMIT_WAIT_MS = 22_000; // Voyage free tier: 3 RPM

let _voyage: VoyageAIClient | null = null;
function getVoyage(): VoyageAIClient {
  if (!_voyage) _voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });
  return _voyage;
}

export async function embed(
  text: string,
  inputType: "document" | "query" = "query",
  retries = 3,
): Promise<number[]> {
  const config = await getEmbeddingConfig();

  // Only Voyage is wired up at launch; others display "coming soon" in the admin UI
  if (config.provider !== "voyage") {
    throw new Error(`Embedding provider '${config.provider}' is not yet configured.`);
  }

  try {
    const result = await getVoyage().embed({
      input: [text],
      model: config.model,
      inputType,
    });
    const embedding = result.data?.[0]?.embedding;
    if (!embedding) throw new Error("Voyage AI returned no embedding");
    return embedding;
  } catch (err) {
    if (err instanceof VoyageAIError && err.statusCode === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
      return embed(text, inputType, retries - 1);
    }
    throw err;
  }
}

export async function search(
  query: string,
  locale: Locale,
): Promise<RagChunk[]> {
  const config = await getEmbeddingConfig();
  const embedding = await embed(query, "query");
  const db = createAdminClient();
  const otherLocale: Locale = locale === "fa" ? "en" : "fa";

  const [primary, secondary] = await Promise.all([
    db.rpc("match_documents_v2", {
      query_embedding: embedding,
      match_threshold: config.similarityThreshold,
      match_count: config.topK,
      p_locale: locale,
    }),
    db.rpc("match_documents_v2", {
      query_embedding: embedding,
      match_threshold: config.similarityThreshold,
      match_count: Math.ceil(config.topK / 2),
      p_locale: otherLocale,
    }),
  ]);

  const seen = new Set<string>();
  return [...(primary.data ?? []), ...(secondary.data ?? [])]
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, config.topK) as RagChunk[];
}
