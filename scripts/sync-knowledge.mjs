/**
 * Sync the chatbot knowledge base to Supabase.
 *
 * Run whenever you update src/lib/chat/knowledge.json:
 *   npm run sync-knowledge
 *
 * What it does:
 *   1. Reads all documents from knowledge.json (single source of truth)
 *   2. Clears all existing chat_documents + chat_embeddings
 *   3. Inserts fresh documents
 *   4. Generates Voyage AI embeddings (22 s delay between calls — free tier limit)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load env
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const VOYAGE_API_KEY = env.VOYAGE_API_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!VOYAGE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars (VOYAGE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Check .env.local");
  process.exit(1);
}

const CHUNK_SIZE = 500;
const DELAY_MS = 22_000; // Voyage AI free tier: 3 RPM → 1 every 20s, we use 22s

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function chunkText(text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));
  return chunks.length ? chunks : [text];
}

async function supabase(path, method = "GET", body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function embed(text) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: [text], model: "voyage-3" }),
  });
  if (!res.ok) throw new Error(`Voyage AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// ── Load knowledge ──────────────────────────────────────────────────────────
const knowledgePath = resolve(ROOT, "src/lib/chat/knowledge.json");
const knowledge = JSON.parse(readFileSync(knowledgePath, "utf-8"));
console.log(`\nLoaded ${knowledge.length} documents from knowledge.json\n`);

// ── Clear existing data ─────────────────────────────────────────────────────
console.log("Clearing existing chat_embeddings...");
await supabase("/chat_embeddings?id=neq.00000000-0000-0000-0000-000000000000", "DELETE");

console.log("Clearing existing chat_documents...");
await supabase("/chat_documents?id=neq.00000000-0000-0000-0000-000000000000", "DELETE");

// ── Insert fresh documents ──────────────────────────────────────────────────
console.log(`Inserting ${knowledge.length} documents...\n`);
const inserted = await supabase("/chat_documents", "POST", knowledge);
if (!inserted || inserted.length === 0) {
  console.error("No documents were inserted. Aborting.");
  process.exit(1);
}
console.log(`  Inserted ${inserted.length} documents.\n`);

// ── Generate embeddings ─────────────────────────────────────────────────────
console.log(`Generating embeddings (${DELAY_MS / 1000}s delay between each — free tier)...\n`);

let processed = 0;
const errors = [];
let firstCall = true;

for (let i = 0; i < inserted.length; i++) {
  const doc = inserted[i];
  process.stdout.write(`  [${i + 1}/${inserted.length}] ${doc.title} ... `);
  try {
    const chunks = chunkText(doc.content);
    for (let ci = 0; ci < chunks.length; ci++) {
      if (!firstCall) await wait(DELAY_MS);
      firstCall = false;
      const vector = await embed(chunks[ci]);
      await supabase("/chat_embeddings", "POST", {
        document_id: doc.id,
        chunk_index: ci,
        content: chunks[ci],
        embedding: vector,
      });
    }
    console.log("✓");
    processed++;
  } catch (err) {
    console.log("✗", err.message.slice(0, 100));
    errors.push(`${doc.title}: ${err.message}`);
  }
}

console.log(`\n✅ Done! Embedded ${processed}/${inserted.length} documents.`);
if (errors.length) {
  console.warn("\n⚠️  Some documents failed:");
  errors.forEach((e) => console.warn("  -", e));
  console.warn("\nRe-run the script — it will retry only the failed ones if you remove the clear step.");
}

console.log("\nThe chatbot knowledge is now up to date.");
