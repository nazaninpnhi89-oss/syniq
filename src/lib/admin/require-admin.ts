import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { type AdminRole, roleAtLeast } from "@/lib/admin/roles";
import { DEMO_MODE, demoUserId } from "@/lib/admin/demo-mode";

interface AdminContext {
  user: User;
  db: SupabaseClient;
  role: AdminRole;
}

export async function requireAdmin(
  minRole: AdminRole = "operator",
): Promise<AdminContext | NextResponse> {
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_active === false || !roleAtLeast(profile?.role, minRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user, db, role: profile!.role as AdminRole };
}
