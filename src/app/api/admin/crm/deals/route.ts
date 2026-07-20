import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = db
    .from("deals")
    .select("*, contact:contacts(id, full_name), company:companies(id, name)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

const CreateDeal = z.object({
  title: z.string().trim().min(1),
  contact_id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  amount_toman: z.number().int().nonnegative().optional(),
  stage_key: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const parsed = CreateDeal.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { data, error } = await db
    .from("deals")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "deal.create", `deal:${data.id}`);
  return NextResponse.json({ data });
}
