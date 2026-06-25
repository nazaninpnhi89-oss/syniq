// Run: node scripts/embed.mjs
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
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
  console.error("Missing env vars. Check .env.local");
  process.exit(1);
}

const CHUNK_SIZE = 500;
// 3 RPM free tier = 1 request per 20s. We use 22s to be safe.
const DELAY_MS = 22_000;

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
      Prefer: method === "POST" ? "return=minimal" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${await res.text()}`);
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

// ── Step 1: Deduplicate documents (keep only earliest per title+locale) ──
console.log("Cleaning up duplicate documents...");
const allDocs = await supabase("/chat_documents?select=id,title,content,locale,created_at&order=created_at.asc");
const seen = new Map();
const toDelete = [];
for (const doc of allDocs) {
  const key = `${doc.title}__${doc.locale}`;
  if (seen.has(key)) {
    toDelete.push(doc.id);
  } else {
    seen.set(key, doc.id);
  }
}
if (toDelete.length > 0) {
  await supabase(`/chat_documents?id=in.(${toDelete.map((id) => `"${id}"`).join(",")})`, "DELETE");
  console.log(`  Removed ${toDelete.length} duplicate documents.`);
}

// ── Step 2: Embed remaining documents ──
const docs = await supabase("/chat_documents?select=id,title,content");
const embedded = await supabase("/chat_embeddings?select=document_id");
const embeddedSet = new Set(embedded.map((e) => e.document_id));
const toProcess = docs.filter((d) => !embeddedSet.has(d.id));

console.log(`\n${docs.length} documents total. ${embeddedSet.size} already embedded. Embedding ${toProcess.length}...`);
if (toProcess.length === 0) { console.log("✅ All done!"); process.exit(0); }
console.log(`(Waiting ${DELAY_MS / 1000}s between each call — free tier rate limit)\n`);

let processed = 0;
const errors = [];

for (let i = 0; i < toProcess.length; i++) {
  const doc = toProcess[i];
  process.stdout.write(`  [${i + 1}/${toProcess.length}] ${doc.title} ... `);
  try {
    const chunks = chunkText(doc.content);
    for (let ci = 0; ci < chunks.length; ci++) {
      if (i > 0 || ci > 0) await wait(DELAY_MS); // proactive delay before every API call
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
    console.log("✗", err.message.slice(0, 80));
    errors.push(`${doc.title}: ${err.message}`);
  }
}

console.log(`\n✅ Done! processed: ${processed}, skipped: ${embeddedSet.size}`);
if (errors.length) {
  console.warn("⚠️  Errors:");
  errors.forEach((e) => console.warn(" -", e));
}
