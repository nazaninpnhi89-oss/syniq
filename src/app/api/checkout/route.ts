import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { CONSULTATION_SLUG } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let payload: { slot?: string; notes?: string; locale?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { slot, notes } = payload;
  const locale = payload.locale === "en" ? "en" : "fa";

  if (!slot) return NextResponse.json({ error: "no_slot" }, { status: 400 });
  const startMs = new Date(slot).getTime();
  if (Number.isNaN(startMs)) {
    return NextResponse.json({ error: "bad_slot" }, { status: 400 });
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: service } = await sb
    .from("services")
    .select("*")
    .eq("slug", CONSULTATION_SLUG)
    .eq("is_active", true)
    .single();
  if (!service) {
    return NextResponse.json({ error: "no_service" }, { status: 400 });
  }

  const startISO = new Date(startMs).toISOString();
  const endISO = new Date(startMs + service.duration_min * 60000).toISOString();

  // ساخت رزرو در وضعیت pending — ایندکس یکتا روی start_at از رزرو هم‌زمان جلوگیری می‌کند.
  const { data: booking, error: insErr } = await sb
    .from("bookings")
    .insert({
      user_id: user.id,
      service_id: service.id,
      start_at: startISO,
      end_at: endISO,
      status: "pending",
      amount_cents: service.price_cents,
      currency: service.currency,
      notes: typeof notes === "string" ? notes.slice(0, 500) : null,
    })
    .select("id")
    .single();

  if (insErr || !booking) {
    // به‌احتمال زیاد تداخل ایندکس یکتا → اسلات گرفته شده است.
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  const stripe = getStripe();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: service.currency,
          unit_amount: service.price_cents,
          product_data: {
            name: locale === "fa" ? service.title_fa : service.title_en,
          },
        },
      },
    ],
    customer_email: user.email ?? undefined,
    client_reference_id: booking.id,
    metadata: { booking_id: booking.id, locale },
    success_url: `${origin}/${locale}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}/booking/cancel?booking=${booking.id}`,
  });

  // ذخیره‌ی شناسه‌ی سشن با کلید سرویس (RLS اجازه‌ی update به کاربر نمی‌دهد).
  try {
    const admin = createAdminClient();
    await admin
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);
  } catch {
    // غیرحیاتی است؛ Webhook با metadata کار می‌کند.
  }

  return NextResponse.json({ url: session.url });
}
