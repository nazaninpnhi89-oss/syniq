import { Resend } from "resend";
import { BUSINESS_TIMEZONE } from "./config";

type BookingEmailInput = {
  to: string;
  customerName?: string | null;
  serviceTitle: string;
  startAt: string; // ISO
  meetLink?: string | null;
  locale?: string;
};

function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(iso));
}

/** ایمیل تأیید رزرو به مشتری و اعلان به نازنین. در نبود کلید Resend بی‌صدا رد می‌شود. */
export async function sendBookingConfirmation(input: BookingEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY تنظیم نشده — ایمیل ارسال نشد.");
    return;
  }
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "SYNIQ <onboarding@resend.dev>";
  const isFa = (input.locale ?? "en") === "fa";
  const when = formatWhen(input.startAt, input.locale ?? "en");

  const meetRow = input.meetLink
    ? `<p>${isFa ? "لینک جلسه" : "Meeting link"}: <a href="${input.meetLink}">${input.meetLink}</a></p>`
    : "";

  const customerHtml = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#1E4A66">SYNIQ</h2>
      <p>${isFa ? `سلام ${input.customerName ?? ""}،` : `Hi ${input.customerName ?? ""},`}</p>
      <p>${isFa ? "رزرو شما تأیید شد." : "Your booking is confirmed."}</p>
      <p><strong>${input.serviceTitle}</strong></p>
      <p>${isFa ? "زمان" : "When"}: ${when} (${BUSINESS_TIMEZONE})</p>
      ${meetRow}
      <p style="color:#888;font-size:12px">From Strategy to Intelligent Growth.</p>
    </div>`;

  await resend.emails.send({
    from,
    to: input.to,
    subject: isFa ? "تأیید رزرو مشاوره — SYNIQ" : "Your SYNIQ consultation is booked",
    html: customerHtml,
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `New booking: ${input.serviceTitle} — ${when}`,
      html: `<p>New booking from ${input.customerName ?? input.to} (${input.to})</p>
             <p>${input.serviceTitle} — ${when} (${BUSINESS_TIMEZONE})</p>`,
    });
  }
}
