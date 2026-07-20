"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";
import { ROLE_RANK, type AdminRole } from "@/lib/admin/roles";

const ADMIN_ROLES = Object.keys(ROLE_RANK) as [AdminRole, ...AdminRole[]];

const UpdateRoleInput = z.object({
  locale: z.string(),
  targetId: z.string().uuid(),
  newRole: z.enum(ADMIN_ROLES),
});

export async function updateUserRole(input: z.infer<typeof UpdateRoleInput>) {
  const parsed = UpdateRoleInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" };
  const { locale, targetId, newRole } = parsed.data;

  const ctx = await requireAdminAction("admin", locale);

  const { data: target } = await ctx.db
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();

  if (target?.role === "owner" && ctx.role !== "owner") {
    return { error: "onlyOwnerCanModifyOwner" };
  }
  if ((newRole === "owner" || newRole === "admin") && ctx.role !== "owner") {
    return { error: "onlyOwnerCanGrantAdmin" };
  }

  const { error } = await ctx.db
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetId);
  if (error) return { error: error.message };

  await logAudit(ctx.user.id, "user.role_change", `profile:${targetId}`, { newRole });
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}

const ToggleActiveInput = z.object({
  locale: z.string(),
  targetId: z.string().uuid(),
  isActive: z.boolean(),
});

export async function toggleUserActive(input: z.infer<typeof ToggleActiveInput>) {
  const parsed = ToggleActiveInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "invalid" };
  const { locale, targetId, isActive } = parsed.data;

  const ctx = await requireAdminAction("admin", locale);

  const { data: target } = await ctx.db
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();

  if (target?.role === "owner" && ctx.role !== "owner") {
    return { error: "onlyOwnerCanModifyOwner" };
  }

  const { error } = await ctx.db
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", targetId);
  if (error) return { error: error.message };

  await logAudit(ctx.user.id, "user.deactivate", `profile:${targetId}`, { isActive });
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}
