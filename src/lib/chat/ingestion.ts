import { createAdminClient } from "@/lib/supabase/server";
import { VoyageAIClient, VoyageAIError } from "voyageai";
import { getEmbeddingConfig, type EmbeddingConfig } from "./embedding-config";

const RATE_LIMIT_WAIT_MS = 22_000;

let _voyage: VoyageAIClient | null = null;
function getVoyage(): VoyageAIClient {
  if (!_voyage) _voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });
  return _voyage;
}

async function embedText(
  text: string,
  inputType: "document" | "query",
  config: EmbeddingConfig,
  retries = 3,
): Promise<number[]> {
  // Only Voyage is wired up; others show "coming soon" in the UI
  if (config.provider !== "voyage") {
    throw new Error(`Embedding provider '${config.provider}' is not yet configured. Please use Voyage AI.`);
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
      return embedText(text, inputType, config, retries - 1);
    }
    throw err;
  }
}

export function chunkText(
  text: string,
  config: EmbeddingConfig,
): Array<{ text: string; index: number }> {
  const { chunkSize, chunkOverlap } = config;
  const step = chunkSize - chunkOverlap;
  const chunks: Array<{ text: string; index: number }> = [];

  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      // Walk back to nearest word boundary
      const boundary = text.lastIndexOf(" ", end);
      if (boundary > start) end = boundary;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({ text: chunk, index });
      index++;
    }

    start += step;
    if (start >= text.length) break;
  }

  return chunks;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid issues in edge environments
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromURL(url: string): Promise<string> {
  const { load } = await import("cheerio");
  const res = await fetch(url, { headers: { "User-Agent": "SYNIQ-Bot/1.0" } });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const $ = load(html);
  // Remove scripts, styles, nav, footer
  $("script, style, nav, footer, header, aside").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

export async function embedChunks(
  docId: string,
  chunks: Array<{ text: string; index: number }>,
  config: EmbeddingConfig,
): Promise<void> {
  const db = createAdminClient();

  for (const chunk of chunks) {
    const vector = await embedText(chunk.text, "document", config);
    const { error } = await db.from("chat_embeddings").insert({
      document_id: docId,
      chunk_index: chunk.index,
      content: chunk.text,
      embedding: vector,
      token_count: Math.ceil(chunk.text.length / 4), // rough estimate
    });
    if (error) throw new Error(`embedChunks: ${error.message}`);
  }
}

export async function ingestDocument(docId: string): Promise<void> {
  const db = createAdminClient();
  const config = await getEmbeddingConfig();

  // Fetch the document
  const { data: doc, error: fetchErr } = await db
    .from("chat_documents")
    .select("*")
    .eq("id", docId)
    .single();

  if (fetchErr || !doc) throw new Error(`Document not found: ${docId}`);

  // Mark as processing
  await db
    .from("chat_documents")
    .update({ status: "processing" })
    .eq("id", docId);

  try {
    // Remove existing embeddings (for re-index)
    await db.from("chat_embeddings").delete().eq("document_id", docId);

    // Chunk the content
    const chunks = chunkText(doc.content as string, config);

    // Embed each chunk (rate-limited for free Voyage tier)
    await embedChunks(docId, chunks, config);

    // Mark as indexed
    await db
      .from("chat_documents")
      .update({ status: "indexed" })
      .eq("id", docId);
  } catch (err) {
    await db
      .from("chat_documents")
      .update({ status: "failed" })
      .eq("id", docId);
    throw err;
  }
}
