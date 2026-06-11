import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { sendBookingConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId =
      (session.metadata?.booking_id as string | undefined) ||
      session.client_reference_id ||
      undefined;
    const locale = (session.metadata?.locale as string | undefined) ?? "en";

    if (bookingId) {
      const admin = createAdminClient();
      const meetLink = process.env.MEETING_LINK || null;

      const { data: booking } = await admin
        .from("bookings")
        .update({ status: "confirmed", meet_link: meetLink })
        .eq("id", bookingId)
        .select("start_at, user_id, service_id")
        .single();

      if (booking) {
        // اطلاعات کاربر و خدمت را برای ایمیل می‌گیریم.
        const [{ data: userRes }, { data: profile }, { data: service }] =
          await Promise.all([
            admin.auth.admin.getUserById(booking.user_id),
            admin
              .from("profiles")
              .select("full_name")
              .eq("id", booking.user_id)
              .single(),
            admin
              .from("services")
              .select("title_fa, title_en")
              .eq("id", booking.service_id)
              .single(),
          ]);

        const email =
          userRes?.user?.email || (session.customer_details?.email ?? null);
        const serviceTitle =
          locale === "fa"
            ? service?.title_fa ?? "مشاوره"
            : service?.title_en ?? "Consultation";

        if (email) {
          try {
            await sendBookingConfirmation({
              to: email,
              customerName: profile?.full_name,
              serviceTitle,
              startAt: booking.start_at,
              meetLink,
              locale,
            });
          } catch (e) {
            console.error("email send failed", e);
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
