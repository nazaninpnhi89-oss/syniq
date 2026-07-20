import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

  const [
    { data: contact, error },
    { data: deals },
    { data: activities },
  ] = await Promise.all([
    db.from("contacts").select("*, company:companies(id, name)").eq("id", id).single(),
    db
      .from("deals")
      .select("id, title, stage_key, status, amount_toman, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("activities")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({
    data: contact,
    deals: deals ?? [],
    activities: activities ?? [],
  });
}

const UpdateContact = z.object({
  full_name: z.string().trim().min(1).optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  title: z.string().trim().nullable().optional(),
  company_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;
  const { id } = await params;

  const parsed = UpdateContact.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { data, error } = await db
    .from("contacts")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "contact.update", `contact:${id}`);
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin("editor");
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;
  const { id } = await params;

  const { error } = await db.from("contacts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "contact.delete", `contact:${id}`);
  return NextResponse.json({ ok: true });
}
