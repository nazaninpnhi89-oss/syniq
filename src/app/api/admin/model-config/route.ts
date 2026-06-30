import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";
import { invalidateModelConfigCache } from "@/lib/chat/model-config";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const { data, error } = await db
    .from("model_config")
    .select("*")
    .order("channel", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;

  const body = await req.json();
  const { channel, ...updates } = body;

  if (!channel) return NextResponse.json({ error: "channel is required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.activeModel !== undefined) patch.active_model = updates.activeModel;
  if (updates.temperature !== undefined) patch.temperature = updates.temperature;
  if (updates.maxTokens !== undefined) patch.max_tokens = updates.maxTokens;
  if (updates.topP !== undefined) patch.top_p = updates.topP;
  if (updates.fallbackModel !== undefined) patch.fallback_model = updates.fallbackModel;
  if (updates.fallbackProvider !== undefined) patch.fallback_provider = updates.fallbackProvider;
  if (updates.schedule !== undefined) patch.schedule = updates.schedule;

  const { error } = await db
    .from("model_config")
    .upsert({ channel, ...patch }, { onConflict: "channel" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateModelConfigCache();
  await logAudit(user.id, "model_config.update", channel, patch);
  return NextResponse.json({ ok: true });
}
