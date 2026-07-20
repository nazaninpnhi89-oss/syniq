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

  const { data, error } = await db
    .from("contracts")
    .select("*, contact:contacts(id, full_name)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

const UpdateContract = z.object({
  title: z.string().trim().min(1).optional(),
  body_md: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;
  const { id } = await params;

  const parsed = UpdateContract.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { data, error } = await db
    .from("contracts")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "contract.create", `contract:${id}`, { action: "manual_edit" });
  return NextResponse.json({ data });
}
