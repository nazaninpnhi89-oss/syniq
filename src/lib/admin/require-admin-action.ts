import "server-only";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { type AdminRole, roleAtLeast } from "@/lib/admin/roles";
import { DEMO_MODE, demoUserId } from "@/lib/admin/demo-mode";

interface AdminActionContext {
  user: User;
  db: SupabaseClient;
  role: AdminRole;
}

/**
 * Server-action equivalent of requireAdmin() — server actions can't
 * return a NextResponse, so failure redirects instead.
 */
export async function requireAdminAction(
  minRole: AdminRole = "operator",
  locale = "fa",
): Promise<AdminActionContext> {
  const db = createAdminClient();

  if (DEMO_MODE && demoUserId()) {
    const { data: authUser } = await db.auth.admin.getUserById(demoUserId()!);
    const { data: profile } = await db
      .from("profiles")
      .select("role, is_active")
      .eq("id", demoUserId()!)
      .maybeSingle();
    if (authUser?.user && profile?.is_active !== false && roleAtLeast(profile?.role, minRole)) {
      return { user: authUser.user, db, role: profile!.role as AdminRole };
    }
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);

  const { data: profile } = await db
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_active === false || !roleAtLeast(profile?.role, minRole)) {
    redirect(`/${locale}`);
  }

  return { user, db, role: profile!.role as AdminRole };
}
