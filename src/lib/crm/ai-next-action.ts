"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";
import { generateStructured, AiNotConfiguredError, aiErrorMessage } from "@/lib/crm/ai-validate";
import { daysBetween } from "@/lib/format";

const NextActionSchema = z.object({
  action: z.string(),
});

export async function suggestNextAction(dealId: string, locale: string) {
  const ctx = await requireAdminAction("operator", locale);

  const { data: deal } = await ctx.db.from("deals").select("*").eq("id", dealId).single();
  if (!deal) return { error: "dealNotFound" };

  const { data: activities } = await ctx.db
    .from("activities")
    .select("type, title, body, created_at")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(5);

  try {
    const result = await generateStructured(
      NextActionSchema,
      `You suggest the single most useful next action for a B2B sales rep to move a deal forward. Respond with one short, concrete Persian sentence (max 25 words).`,
      JSON.stringify({
        title: deal.title,
        stage: deal.stage_key,
        daysInStage: daysBetween(deal.stage_entered_at),
        amountToman: deal.amount_toman,
        recentActivities: activities ?? [],
      }),
    );

    await ctx.db
      .from("deals")
      .update({ ai_next_action: result.action, ai_next_action_at: new Date().toISOString() })
      .eq("id", dealId);

    await logAudit(ctx.user.id, "deal.ai_next_action", `deal:${dealId}`);
    revalidatePath(`/${locale}/admin/crm/deals`);
    return { ok: true, action: result.action };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) return { error: aiErrorMessage(locale) };
    return { error: e instanceof Error ? e.message : "AI suggestion failed" };
  }
}
