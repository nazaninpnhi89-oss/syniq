import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: { message_id: string | number; rating: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }, );
  }

  const { message_id, rating, comment } = body;

  if (!message_id || (rating !== 1 && rating !== -1)) {
    return NextResponse.json({ error: "message_id and rating (1 or -1) are required" }, { status: 400 });
  }

  const db = createAdminClient();

  // Verify the message exists
  const { data: msg } = await db
    .from("chat_messages")
    .select("id")
    .eq("id", Number(message_id))
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // Unique constraint on message_id prevents duplicates
  const { error } = await db.from("feedback").insert({
    message_id: Number(message_id),
    rating,
    comment: comment ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
