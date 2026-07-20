"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";

const UpdateDealStage = z.object({
  locale: z.string(),
  dealId: z.string().uuid(),
  newStageKey: z.string(),
  lostReason: z.string().trim().optional(),
});

export async function updateDealStage(input: z.infer<typeof UpdateDealStage>) {
  const parsed = UpdateDealStage.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" };
  const { locale, dealId, newStageKey, lostReason } = parsed.data;

  const ctx = await requireAdminAction("operator", locale);

  const { data: stage } = await ctx.db
    .from("pipeline_stages")
    .select("*")
    .eq("key", newStageKey)
    .maybeSingle();
  if (!stage) return { error: "invalidStage" };

  const { data: deal } = await ctx.db
    .from("deals")
    .select("stage_key")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { error: "dealNotFound" };

  const status = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";
  const now = new Date().toISOString();

  const { error } = await ctx.db
    .from("deals")
    .update({
      stage_key: newStageKey,
      status,
      lost_reason: stage.is_lost ? (lostReason ?? null) : null,
      stage_entered_at: now,
      won_at: stage.is_won ? now : null,
      lost_at: stage.is_lost ? now : null,
      updated_at: now,
    })
    .eq("id", dealId);
  if (error) return { error: error.message };

  await ctx.db.from("activities").insert({
    deal_id: dealId,
    type: "stage_change",
    title: `Stage: ${deal.stage_key} → ${newStageKey}`,
    meta: { from_stage: deal.stage_key, to_stage: newStageKey },
    created_by: ctx.user.id,
  });

  await logAudit(ctx.user.id, "deal.stage_change", `deal:${dealId}`, {
    from: deal.stage_key,
    to: newStageKey,
  });

  revalidatePath(`/${locale}/admin/crm/deals`);
  revalidatePath(`/${locale}/admin/crm/reports`);
  return { ok: true };
}
