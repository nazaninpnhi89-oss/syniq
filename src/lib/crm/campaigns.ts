"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";
import { resolveSegment } from "@/lib/crm/segments";
import { SEGMENT_KEYS } from "@/lib/crm/segment-keys";
import { generateStructured, AiNotConfiguredError, aiErrorMessage } from "@/lib/crm/ai-validate";

const CreateCampaignInput = z.object({
  locale: z.string(),
  name: z.string().trim().min(1),
  segmentKey: z.enum(SEGMENT_KEYS),
  goal: z.string().trim().min(1),
});

export async function createCampaign(input: z.infer<typeof CreateCampaignInput>) {
  const parsed = CreateCampaignInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" };
  const { locale, name, segmentKey, goal } = parsed.data;

  const ctx = await requireAdminAction("operator", locale);

  const recipients = await resolveSegment(ctx.db, segmentKey);
  if (recipients.length === 0) return { error: "emptySegment" };

  const { data: campaign, error } = await ctx.db
    .from("campaigns")
    .insert({ name, segment_key: segmentKey, goal, created_by: ctx.user.id })
    .select()
    .single();
  if (error) return { error: error.message };

  await ctx.db.from("campaign_emails").insert(
    recipients.map((r) => ({
      campaign_id: campaign.id,
      contact_id: r.contactId,
      lead_id: r.leadId,
      to_name: r.name,
      to_email: r.email,
      context: r.context,
      status: "pending",
    })),
  );

  await logAudit(ctx.user.id, "campaign.create", `campaign:${campaign.id}`, {
    segmentKey,
    recipientCount: recipients.length,
  });
  revalidatePath(`/${locale}/admin/crm/campaigns`);
  return { ok: true, id: campaign.id };
}

const EmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const GenerateEmailInput = z.object({ locale: z.string(), campaignEmailId: z.string().uuid() });

export async function generateCampaignEmail(input: z.infer<typeof GenerateEmailInput>) {
  const parsed = GenerateEmailInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { locale, campaignEmailId } = parsed.data;

  const ctx = await requireAdminAction("operator", locale);

  const { data: email } = await ctx.db
    .from("campaign_emails")
    .select("*, campaign:campaigns(goal, name)")
    .eq("id", campaignEmailId)
    .single();
  if (!email) return { error: "notFound" };

  try {
    const result = await generateStructured(
      EmailSchema,
      locale === "fa"
        ? "شما یک متخصص ایمیل مارکتینگ برای یک برند مشاوره B2B هستید. یک ایمیل کاملاً شخصی‌سازی‌شده فارسی بنویس که به وضعیت خاص گیرنده اشاره کند، حداکثر ۱۲۰ کلمه، بدون لحن تبلیغاتی، با دعوت به یک جلسه مشاوره رایگان. فقط JSON با کلیدهای subject و body برگردان."
        : "You are an email marketing specialist for a B2B consulting brand. Write a fully personalized email referencing the recipient's specific situation, max 120 words, no ad-like tone, with a call to a free consultation. Return only JSON with subject and body keys.",
      JSON.stringify({
        goal: (email.campaign as unknown as { goal: string } | null)?.goal,
        recipientName: email.to_name,
        context: email.context,
      }),
    );

    await ctx.db
      .from("campaign_emails")
      .update({ subject: result.subject, body_text: result.body, status: "ready" })
      .eq("id", campaignEmailId);

    await logAudit(ctx.user.id, "campaign.generate_email", `campaign_email:${campaignEmailId}`);
    revalidatePath(`/${locale}/admin/crm/campaigns`);
    return { ok: true, subject: result.subject, body: result.body };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) return { error: aiErrorMessage(locale) };
    return { error: e instanceof Error ? e.message : "AI generation failed" };
  }
}

const ReviewEmailInput = z.object({
  locale: z.string(),
  campaignEmailId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export async function reviewCampaignEmail(input: z.infer<typeof ReviewEmailInput>) {
  const parsed = ReviewEmailInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { locale, campaignEmailId, status, subject, body } = parsed.data;

  const ctx = await requireAdminAction("operator", locale);

  const update: Record<string, unknown> = { status };
  if (subject !== undefined) update.subject = subject;
  if (body !== undefined) update.body_text = body;

  const { error } = await ctx.db.from("campaign_emails").update(update).eq("id", campaignEmailId);
  if (error) return { error: error.message };
  return { ok: true };
}

const SendCampaignInput = z.object({ locale: z.string(), campaignId: z.string().uuid() });

export async function sendCampaign(input: z.infer<typeof SendCampaignInput>) {
  const parsed = SendCampaignInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { locale, campaignId } = parsed.data;

  const ctx = await requireAdminAction("editor", locale);

  if (!process.env.RESEND_API_KEY) return { error: "missingApiKey" };

  const { data: emails } = await ctx.db
    .from("campaign_emails")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "approved");
  if (!emails?.length) return { error: "nothingApproved" };

  let sent = 0;
  let failed = 0;
  for (const email of emails) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: email.to_email,
        subject: email.subject,
        html: `<p>${(email.body_text ?? "").replace(/\n/g, "<br/>")}</p>`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      sent++;
      await ctx.db
        .from("campaign_emails")
        .update({ status: "sent", resend_id: data?.id ?? null, sent_at: new Date().toISOString() })
        .eq("id", email.id);
    } else {
      failed++;
      await ctx.db
        .from("campaign_emails")
        .update({ status: "failed", error: data?.message ?? "send failed" })
        .eq("id", email.id);
    }
  }

  await ctx.db
    .from("campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", campaignId);

  await logAudit(ctx.user.id, "campaign.send", `campaign:${campaignId}`, { sent, failed });
  revalidatePath(`/${locale}/admin/crm/campaigns/${campaignId}`);
  return { ok: true, sent, failed };
}
