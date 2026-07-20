import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;
  const { id } = await params;

  const { data, error } = await db
    .from("chat_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;
  const { id } = await params;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.locale !== undefined) updates.locale = body.locale;
  if (body.tags !== undefined) updates.tags = body.tags;

  if (body.content !== undefined) {
    updates.content = body.content;
    updates.status = "pending"; // requires re-embed
  }
  if (body.status !== undefined) updates.status = body.status;

  const { error } = await db.from("chat_documents").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit(user.id, "document.update", id, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;
  const { id } = await params;

  const { error } = await db.from("chat_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit(user.id, "document.delete", id);
  return NextResponse.json({ ok: true });
}
