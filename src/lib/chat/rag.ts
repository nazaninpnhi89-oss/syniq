import { VoyageAIClient, VoyageAIError } from "voyageai";
import { createAdminClient } from "@/lib/supabase/server";
import type { Locale, RagChunk } from "./types";

const RATE_LIMIT_WAIT_MS = 22_000; // 3 RPM free tier → wait 22s on 429

let _voyage: VoyageAIClient | null = null;

function getVoyage(): VoyageAIClient {
  if (!_voyage) {
    _voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });
  }
  return _voyage;
}

export async function embed(text: string, retries = 3): Promise<number[]> {
  try {
    const result = await getVoyage().embed({ input: [text], model: "voyage-3" });
    const embedding = result.data?.[0]?.embedding;
    if (!embedding) throw new Error("Voyage AI returned no embedding");
    return embedding;
  } catch (err) {
    if (err instanceof VoyageAIError && err.statusCode === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
      return embed(text, retries - 1);
    }
    throw err;
  }
}

export async function search(
  query: string,
  locale: Locale,
  threshold = 0.65,
  count = 5,
): Promise<RagChunk[]> {
  const embedding = await embed(query);
  const db = createAdminClient();
  const otherLocale: Locale = locale === "fa" ? "en" : "fa";

  // Search both locales simultaneously — one embedding call, two cheap SQL queries
  const [primary, secondary] = await Promise.all([
    db.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: count,
      p_locale: locale,
    }),
    db.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: Math.ceil(count / 2),
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
    .slice(0, count) as RagChunk[];
}
