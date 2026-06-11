import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateSlots, type AvailabilityRule } from "@/lib/slots";
import { CONSULTATION_SLUG } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date"); // 'YYYY-MM-DD'
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ slots: [] });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ slots: [], error: "not_configured" });
  }

  const sb = await createClient();

  const { data: service } = await sb
    .from("services")
    .select("duration_min")
    .eq("slug", CONSULTATION_SLUG)
    .single();
  const durationMin = service?.duration_min ?? 45;

  const { data: rules } = await sb
    .from("availability_rules")
    .select("weekday,start_time,end_time");

  // زمان‌های رزروشده با کلید service_role خوانده می‌شوند (فقط start_at، بدون اطلاعات شخصی).
  let bookedMs: number[] = [];
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const base = new Date(date + "T00:00:00Z").getTime();
      const from = new Date(base - 24 * 3600 * 1000).toISOString();
      const to = new Date(base + 2 * 24 * 3600 * 1000).toISOString();
      const { data: booked } = await admin
        .from("bookings")
        .select("start_at")
        .in("status", ["pending", "paid", "confirmed"])
        .gte("start_at", from)
        .lte("start_at", to);
      bookedMs = (booked ?? []).map((b) => new Date(b.start_at).getTime());
    } catch {
      // اگر کلید سرویس نبود، فقط بدون فیلتر رزروها برمی‌گردانیم.
    }
  }

  const slots = generateSlots({
    dateISO: date,
    rules: (rules ?? []) as AvailabilityRule[],
    durationMin,
    bookedMs,
  });

  return NextResponse.json({ slots, durationMin });
}
