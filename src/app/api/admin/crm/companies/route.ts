import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";
import { escapeLike } from "@/lib/crm/companies";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = (page - 1) * limit;

  let query = db
    .from("companies")
    .select("*, contacts:contacts(count), deals:deals(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) query = query.ilike("name", `%${escapeLike(q)}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

const CreateCompany = z.object({
  name: z.string().trim().min(1),
  industry: z.string().trim().optional(),
  website: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const parsed = CreateCompany.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { data, error } = await db
    .from("companies")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user.id, "company.create", `company:${data.id}`);
  return NextResponse.json({ data });
}
