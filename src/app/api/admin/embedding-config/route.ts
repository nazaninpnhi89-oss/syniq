import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";
import { invalidateEmbeddingConfigCache, getEmbeddingConfig } from "@/lib/chat/embedding-config";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;

  const config = await getEmbeddingConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;

  const body = await req.json();
  const current = await getEmbeddingConfig();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.provider !== undefined) patch.provider = body.provider;
  if (body.model !== undefined) patch.model = body.model;
  if (body.dimensions !== undefined) patch.dimensions = body.dimensions;
  if (body.chunkSize !== undefined) patch.chunk_size = body.chunkSize;
  if (body.chunkOverlap !== undefined) patch.chunk_overlap = body.chunkOverlap;
  if (body.topK !== undefined) patch.top_k = body.topK;
  if (body.similarityThreshold !== undefined) patch.similarity_threshold = body.similarityThreshold;
  if (body.rerankerEnabled !== undefined) patch.reranker_enabled = body.rerankerEnabled;
  if (body.rerankerModel !== undefined) patch.reranker_model = body.rerankerModel;

  const requiresReindex =
    body.provider !== undefined && body.provider !== current.provider ||
    body.model !== undefined && body.model !== current.model ||
    body.dimensions !== undefined && body.dimensions !== current.dimensions;

  // Update the single embedding_config row
  const { data: existing } = await db
    .from("embedding_config")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from("embedding_config").update(patch).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db.from("embedding_config").insert(patch);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateEmbeddingConfigCache();
  await logAudit(user.id, "embedding_config.update", "embedding_config", patch);
  return NextResponse.json({ ok: true, requiresReindex: !!requiresReindex });
}
