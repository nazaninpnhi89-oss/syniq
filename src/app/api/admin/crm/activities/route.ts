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
  const contactId = searchParams.get("contact_id");
  const dealId = searchParams.get("deal_id");
  const type = searchParams.get("type");

  let query = db.from("activities").select("*").order("created_at", { ascending: false });
  if (contactId) query = query.eq("contact_id", contactId);
  if (dealId) query = query.eq("deal_id", dealId);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

const CreateActivity = z.object({
  contact_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  type: z.enum(["call", "meeting", "note", "task"]),
  title: z.string().trim().min(1),
  body: z.string().trim().optional(),
  due_at: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const parsed = CreateActivity.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  if (!parsed.data.contact_id && !parsed.data.deal_id) {
    return NextResponse.json({ error: "contact_id or deal_id required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("activities")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "activity.create", `activity:${data.id}`);
  return NextResponse.json({ data });
}
