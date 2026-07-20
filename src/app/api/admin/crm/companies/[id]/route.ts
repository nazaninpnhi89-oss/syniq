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

  const [{ data: company, error }, { data: contacts }, { data: deals }] = await Promise.all([
    db.from("companies").select("*").eq("id", id).single(),
    db
      .from("contacts")
      .select("id, full_name, email, phone, title")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("deals")
      .select("id, title, stage_key, status, amount_toman")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ data: company, contacts: contacts ?? [], deals: deals ?? [] });
}

const UpdateCompany = z.object({
  name: z.string().trim().min(1).optional(),
  industry: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
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

  const parsed = UpdateCompany.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { data, error } = await db
    .from("companies")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "company.update", `company:${id}`);
  return NextResponse.json({ data });
}
