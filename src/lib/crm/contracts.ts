"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/server";
import { getJalaliYear, formatCurrency } from "@/lib/format";
import { renderContractTemplate } from "@/lib/crm/contract-template";
import { generateText, AiNotConfiguredError, aiErrorMessage } from "@/lib/crm/ai-validate";

async function nextContractNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const year = getJalaliYear();
  const { count } = await db
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .like("number", `AR-${year}-%`);
  const seq = (count ?? 0) + 1;
  return `AR-${year}-${String(seq).padStart(3, "0")}`;
}

const CreateContractInput = z.object({
  locale: z.string(),
  contactId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  amountToman: z.number().int().nonnegative().optional(),
  startDate: z.string().optional(),
  durationLabel: z.string().trim().optional(),
  scope: z.string().trim().optional(),
});

export async function createContract(input: z.infer<typeof CreateContractInput>) {
  const parsed = CreateContractInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" };
  const { locale, contactId, dealId, title, amountToman, startDate, durationLabel, scope } =
    parsed.data;

  const ctx = await requireAdminAction("operator", locale);

  const { data: contact } = await ctx.db
    .from("contacts")
    .select("full_name, company_id, company:companies(name)")
    .eq("id", contactId)
    .single();
  if (!contact) return { error: "contactNotFound" };

  const number = await nextContractNumber(ctx.db);
  const bodyMd = renderContractTemplate(locale, {
    contractNumber: number,
    clientName: contact.full_name,
    clientCompany: (contact.company as unknown as { name: string } | null)?.name ?? "",
    amountToman: amountToman != null ? formatCurrency(locale, amountToman).replace(/[^\d,]/g, "") : "—",
    startDate: startDate ?? new Date().toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US"),
    durationLabel: durationLabel ?? (locale === "fa" ? "۳۰ روز" : "30 days"),
    scope: scope ?? title,
  });

  const { data, error } = await ctx.db
    .from("contracts")
    .insert({
      number,
      deal_id: dealId ?? null,
      contact_id: contactId,
      company_id: contact.company_id,
      title,
      body_md: bodyMd,
      amount_toman: amountToman ?? null,
      start_date: startDate ?? null,
      duration_label: durationLabel ?? null,
      created_by: ctx.user.id,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  await logAudit(ctx.user.id, "contract.create", `contract:${data.id}`);
  revalidatePath(`/${locale}/admin/crm/contracts`);
  return { ok: true, id: data.id };
}

const SendContractInput = z.object({ locale: z.string(), contractId: z.string().uuid() });

export async function sendContract(input: z.infer<typeof SendContractInput>) {
  const parsed = SendContractInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { locale, contractId } = parsed.data;
  const ctx = await requireAdminAction("operator", locale);

  const { error } = await ctx.db
    .from("contracts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("status", "draft");
  if (error) return { error: error.message };

  await logAudit(ctx.user.id, "contract.send", `contract:${contractId}`);
  revalidatePath(`/${locale}/admin/crm/contracts/${contractId}`);
  return { ok: true };
}

const CancelContractInput = z.object({ locale: z.string(), contractId: z.string().uuid() });

export async function cancelContract(input: z.infer<typeof CancelContractInput>) {
  const parsed = CancelContractInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { locale, contractId } = parsed.data;
  const ctx = await requireAdminAction("operator", locale);

  const { error } = await ctx.db
    .from("contracts")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", contractId)
    .in("status", ["draft", "sent", "viewed"]);
  if (error) return { error: error.message };

  await logAudit(ctx.user.id, "contract.cancel", `contract:${contractId}`);
  revalidatePath(`/${locale}/admin/crm/contracts/${contractId}`);
  return { ok: true };
}

const RewriteContractInput = z.object({ locale: z.string(), contractId: z.string().uuid() });

export async function rewriteContractWithAi(input: z.infer<typeof RewriteContractInput>) {
  const parsed = RewriteContractInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { locale, contractId } = parsed.data;
  const ctx = await requireAdminAction("operator", locale);

  const { data: contract } = await ctx.db
    .from("contracts")
    .select("*, contact:contacts(full_name, ai_summary, lead_id)")
    .eq("id", contractId)
    .single();
  if (!contract) return { error: "contractNotFound" };

  let challenge = "";
  const leadId = (contract.contact as unknown as { lead_id: string | null } | null)?.lead_id;
  if (leadId) {
    const { data: lead } = await ctx.db.from("leads").select("notes").eq("id", leadId).maybeSingle();
    challenge = lead?.notes ?? "";
  }

  try {
    const rewritten = await generateText(
      locale === "fa"
        ? "شما یک دستیار حقوقی هستید که متن قرارداد Markdown را با جزئیات مشتری شخصی‌سازی می‌کنید، بدون تغییر ساختار ماده‌ها یا حذف بخش‌های اصلی. فقط متن Markdown نهایی را برگردانید."
        : "You are a legal assistant personalizing a Markdown contract with client details, without changing the article structure or removing sections. Return only the final Markdown text.",
      JSON.stringify({
        currentContract: contract.body_md,
        clientChallenge: challenge,
        aiInsight: (contract.contact as unknown as { ai_summary: string | null } | null)?.ai_summary,
      }),
    );

    await ctx.db.from("contracts").update({ body_md: rewritten, updated_at: new Date().toISOString() }).eq("id", contractId);
    await logAudit(ctx.user.id, "contract.ai_rewrite", `contract:${contractId}`);
    revalidatePath(`/${locale}/admin/crm/contracts/${contractId}`);
    return { ok: true, bodyMd: rewritten };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) return { error: aiErrorMessage(locale) };
    return { error: e instanceof Error ? e.message : "AI rewrite failed" };
  }
}

const FollowUpInput = z.object({ locale: z.string(), contractId: z.string().uuid() });

export async function generateFollowUpMessage(input: z.infer<typeof FollowUpInput>) {
  const parsed = FollowUpInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { locale, contractId } = parsed.data;
  const ctx = await requireAdminAction("viewer", locale);

  const { data: contract } = await ctx.db
    .from("contracts")
    .select("*, contact:contacts(full_name)")
    .eq("id", contractId)
    .single();
  if (!contract) return { error: "contractNotFound" };

  const daysWaiting = contract.sent_at
    ? Math.floor((Date.now() - new Date(contract.sent_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${locale}/contract/${contract.share_token}`;

  try {
    const message = await generateText(
      locale === "fa"
        ? "یک پیام پیگیری مؤدبانه و کوتاه فارسی برای مشتری بنویس که هنوز قرارداد را تأیید نکرده است. لحن دوستانه و حرفه‌ای، بدون فشار."
        : "Write a short, polite English follow-up message to a client who hasn't yet accepted their contract. Friendly, professional tone, no pressure.",
      JSON.stringify({
        clientName: (contract.contact as unknown as { full_name: string } | null)?.full_name,
        daysWaiting,
        link,
      }),
    );
    await logAudit(ctx.user.id, "contract.ai_followup", `contract:${contractId}`);
    return { ok: true, message };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) return { error: aiErrorMessage(locale) };
    return { error: e instanceof Error ? e.message : "AI follow-up failed" };
  }
}

const AcceptContractInput = z.object({
  shareToken: z.string().uuid(),
  acceptedByName: z.string().trim().min(1),
});

export async function acceptContractPublic(input: z.infer<typeof AcceptContractInput>) {
  const parsed = AcceptContractInput.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { shareToken, acceptedByName } = parsed.data;

  const db = createAdminClient();
  const { data: contract } = await db
    .from("contracts")
    .select("id, status")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!contract) return { error: "notFound" };
  if (contract.status === "accepted") return { ok: true };
  if (contract.status === "canceled") return { error: "canceled" };

  const { error } = await db
    .from("contracts")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by_name: acceptedByName,
    })
    .eq("id", contract.id)
    .in("status", ["sent", "viewed"]);
  if (error) return { error: error.message };

  await logAudit(null, "contract.accept", `contract:${contract.id}`, {
    acceptedByName,
  });
  return { ok: true };
}
