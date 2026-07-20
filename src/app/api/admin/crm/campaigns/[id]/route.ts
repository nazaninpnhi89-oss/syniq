import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;
  const { id } = await params;

  const [{ data: campaign, error }, { data: emails }] = await Promise.all([
    db.from("campaigns").select("*").eq("id", id).single(),
    db.from("campaign_emails").select("*").eq("campaign_id", id).order("created_at", { ascending: true }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ data: campaign, emails: emails ?? [] });
}
