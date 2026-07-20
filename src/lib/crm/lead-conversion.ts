"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";
import { findOrCreateCompany } from "@/lib/crm/companies";

const ConvertLeadInput = z.object({
  locale: z.string(),
  leadId: z.string().uuid(),
  companyName: z.string().trim().min(1).optional(),
  createDeal: z.boolean().default(false),
  dealTitle: z.string().trim().optional(),
  dealAmountToman: z.number().int().nonnegative().optional(),
});

export async function convertLead(input: z.infer<typeof ConvertLeadInput>) {
  const parsed = ConvertLeadInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" };
  const { locale, leadId, companyName, createDeal, dealTitle, dealAmountToman } = parsed.data;

  const ctx = await requireAdminAction("operator", locale);

  const { data: lead, error: leadErr } = await ctx.db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (leadErr || !lead) return { error: "leadNotFound" };
  if (lead.status === "converted" && lead.contact_id) {
    return { error: "alreadyConverted", contactId: lead.contact_id };
  }

  const companyId = companyName
    ? await findOrCreateCompany(ctx.db, companyName, ctx.user.id)
    : null;

  const { data: contact, error: contactErr } = await ctx.db
    .from("contacts")
    .insert({
      full_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company_id: companyId,
      source: lead.source ?? "chatbot",
      lead_id: lead.id,
      conversation_id: lead.conversation_id,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (contactErr) return { error: contactErr.message };

  let dealId: string | null = null;
  if (createDeal) {
    const { data: deal, error: dealErr } = await ctx.db
      .from("deals")
      .insert({
        title: dealTitle?.trim() || `${lead.name} — ${lead.service_interest ?? "Consultation"}`,
        contact_id: contact.id,
        company_id: companyId,
        amount_toman: dealAmountToman ?? null,
        created_by: ctx.user.id,
      })
      .select("id")
      .single();
    if (dealErr) return { error: dealErr.message };
    dealId = deal?.id ?? null;
  }

  if (lead.notes) {
    await ctx.db.from("activities").insert({
      contact_id: contact.id,
      deal_id: dealId,
      type: "note",
      title: "Converted from lead",
      body: lead.notes,
      created_by: ctx.user.id,
    });
  }

  await ctx.db
    .from("leads")
    .update({
      status: "converted",
      converted_at: new Date().toISOString(),
      contact_id: contact.id,
    })
    .eq("id", leadId);

  await logAudit(ctx.user.id, "lead.convert", `lead:${leadId}`, {
    contactId: contact.id,
    dealId,
  });

  revalidatePath(`/${locale}/admin/leads`);
  revalidatePath(`/${locale}/admin/crm/contacts`);

  return { ok: true, contactId: contact.id, dealId };
}
