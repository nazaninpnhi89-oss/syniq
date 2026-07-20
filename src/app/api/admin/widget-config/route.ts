import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const { data, error } = await db
    .from("widget_config")
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? {});
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.color_primary !== undefined) patch.color_primary = body.color_primary;
  if (body.position !== undefined) patch.position = body.position;
  if (body.welcome_message_fa !== undefined) patch.welcome_message_fa = body.welcome_message_fa;
  if (body.welcome_message_en !== undefined) patch.welcome_message_en = body.welcome_message_en;
  if (body.allowed_domains !== undefined) patch.allowed_domains = body.allowed_domains;

  const { data: existing } = await db.from("widget_config").select("id").maybeSingle();

  if (existing) {
    const { error } = await db.from("widget_config").update(patch).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db.from("widget_config").insert(patch);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(user.id, "widget_config.update", "widget_config", patch);
  return NextResponse.json({ ok: true });
}
