"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";
import { generateStructured, AiNotConfiguredError, aiErrorMessage } from "@/lib/crm/ai-validate";

const LeadScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string(),
});

export async function scoreLead(leadId: string, locale: string) {
  const ctx = await requireAdminAction("operator", locale);

  const { data: lead } = await ctx.db.from("leads").select("*").eq("id", leadId).single();
  if (!lead) return { error: "leadNotFound" };

  try {
    const result = await generateStructured(
      LeadScoreSchema,
      `You score inbound sales leads for a B2B AI consulting business, from 0 (poor fit / low intent) to 100 (excellent fit / high intent). Base the score on: the challenge described, business stage/completeness of contact info, and lead source. Write the rationale in Persian, 1-2 short sentences.`,
      JSON.stringify({
        name: lead.name,
        challenge: lead.notes,
        service_interest: lead.service_interest,
        source: lead.source,
        has_email: !!lead.email,
        has_phone: !!lead.phone,
        status: lead.status,
      }),
    );

    await ctx.db
      .from("leads")
      .update({
        ai_score: result.score,
        ai_score_rationale: result.rationale,
        ai_scored_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    await logAudit(ctx.user.id, "lead.ai_score", `lead:${leadId}`, { score: result.score });
    revalidatePath(`/${locale}/admin/leads`);
    return { ok: true, score: result.score, rationale: result.rationale };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) return { error: aiErrorMessage(locale) };
    return { error: e instanceof Error ? e.message : "AI scoring failed" };
  }
}
