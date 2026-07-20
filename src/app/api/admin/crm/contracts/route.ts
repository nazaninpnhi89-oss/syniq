import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const { data, error } = await db
    .from("contracts")
    .select("id, number, title, status, amount_toman, contact:contacts(full_name), created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
