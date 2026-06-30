import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = createAdminClient();
  const { data } = await db
    .from("widget_config")
    .select("color_primary, position, welcome_message_fa, welcome_message_en, allowed_domains")
    .maybeSingle();

  return NextResponse.json(
    data ?? {
      color_primary: "#1f7bb5",
      position: "right",
      welcome_message_fa: "سلام! چطور می‌تونم کمکتون کنم؟",
      welcome_message_en: "Hello! How can I help you today?",
      allowed_domains: [],
    },
  );
}
