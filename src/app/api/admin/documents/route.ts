import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const locale = searchParams.get("locale");
  const search = searchParams.get("search");

  let query = db
    .from("chat_documents")
    .select("id, title, locale, status, source_type, tags, created_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (locale) query = query.eq("locale", locale);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("operator");
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;

  const body = await req.json();
  const { title, content, locale, source_type, source_url, tags } = body;

  if (!title || !content || !locale) {
    return NextResponse.json({ error: "title, content, locale are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("chat_documents")
    .insert({ title, content, locale, source_type, source_url, tags, status: "pending" })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAudit(user.id, "document.create", data.id, { title });
  return NextResponse.json(data, { status: 201 });
}
