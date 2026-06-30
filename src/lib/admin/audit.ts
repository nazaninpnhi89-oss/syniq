import { createAdminClient } from "@/lib/supabase/server";

export async function logAudit(
  adminUserId: string,
  action: string,
  target: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const db = createAdminClient();
  await db.from("audit_log").insert({
    admin_user_id: adminUserId,
    action,
    target,
    meta: meta ?? {},
  });
}
