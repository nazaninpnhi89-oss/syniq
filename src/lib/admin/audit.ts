import { createAdminClient } from "@/lib/supabase/server";

export type CrmAuditAction =
  | "lead.status_change"
  | "lead.convert"
  | "lead.ai_score"
  | "contact.create"
  | "contact.update"
  | "contact.delete"
  | "contact.ai_summarize"
  | "company.create"
  | "company.update"
  | "deal.create"
  | "deal.stage_change"
  | "deal.update"
  | "deal.delete"
  | "deal.ai_next_action"
  | "activity.create"
  | "activity.complete"
  | "contract.create"
  | "contract.send"
  | "contract.accept"
  | "contract.cancel"
  | "contract.ai_rewrite"
  | "contract.ai_followup"
  | "campaign.create"
  | "campaign.generate_email"
  | "campaign.send"
  | "user.role_change"
  | "user.deactivate";

export async function logAudit(
  adminUserId: string | null,
  action: CrmAuditAction | (string & {}),
  target: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("audit_log").insert({
    admin_user_id: adminUserId,
    action,
    target,
    meta: meta ?? {},
  });
  if (error) console.error("logAudit failed", error);
}
