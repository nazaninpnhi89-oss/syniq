import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { embed } from "@/lib/chat/rag";

export const dynamic = "force-dynamic";

const CHUNK_SIZE = 500;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks.length > 0 ? chunks : [text];
}

export async function POST(req: NextRequest) {
  // Guard: require the last 20 chars of the service role key as Bearer token
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!serviceKey || !auth.includes(serviceKey.slice(-20))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  const [{ data: allDocs, error: docsErr }, { data: embeddedRows }] =
    await Promise.all([
      db.from("chat_documents").select("id, title, content"),
      db.from("chat_embeddings").select("document_id"),
    ]);

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }

  const alreadyEmbedded = new Set(
    (embeddedRows ?? []).map((e) => e.document_id),
  );
  const toProcess = (allDocs ?? []).filter((d) => !alreadyEmbedded.has(d.id));

  if (toProcess.length === 0) {
    return NextResponse.json({
      message: "All documents already have embeddings.",
      processed: 0,
      skipped: allDocs?.length ?? 0,
    });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const doc of toProcess) {
    try {
      const chunks = chunkText(doc.content);
      for (let i = 0; i < chunks.length; i++) {
        const vector = await embed(chunks[i]);
        const { error } = await db.from("chat_embeddings").insert({
          document_id: doc.id,
          chunk_index: i,
          content: chunks[i],
          embedding: vector,
        });
        if (error) errors.push(`${doc.title}[${i}]: ${error.message}`);
      }
      processed++;
    } catch (err) {
      errors.push(`${doc.title}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    processed,
    skipped: alreadyEmbedded.size,
    ...(errors.length > 0 && { errors }),
  });
}
