import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UserManageControls } from "@/components/admin/UserManageControls";
import { roleAtLeast, type AdminRole } from "@/lib/admin/roles";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin/users`);

  const db = createAdminClient();
  const { data: me } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!roleAtLeast(me?.role, "admin")) redirect(`/${locale}/admin`);
  const myRole = me!.role as AdminRole;

  const t = await getTranslations({ locale, namespace: "admin.users" });

  const [{ data: adminUsers }, { data: auditLog }] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, email, role, is_active, created_at")
      .in("role", ["owner", "admin", "editor", "operator", "viewer"])
      .order("created_at", { ascending: false }),
    db
      .from("audit_log")
      .select("id, admin_user_id, action, target, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const fmt = (d: string) =>
    new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(d));

  const roleLabels: Record<string, string> = {
    owner: t("roles.owner"),
    admin: t("roles.admin"),
    editor: t("roles.editor"),
    operator: t("roles.operator"),
    viewer: t("roles.viewer"),
    user: t("roles.user"),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Admin users */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("email")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("role")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("joined")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(adminUsers ?? []).map((u) => {
                const canEdit = !(u.role === "owner" && myRole !== "owner");
                return (
                  <tr key={u.id} className="text-fg/90">
                    <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.role} label={roleLabels[u.role] ?? u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={u.is_active ? "active" : "failed"}
                        label={u.is_active ? t("activeLabel") : t("inactiveLabel")}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{fmt(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <UserManageControls
                        locale={locale}
                        userId={u.id}
                        role={u.role}
                        isActive={u.is_active}
                        canEdit={canEdit}
                        canGrantAdmin={myRole === "owner"}
                        roleLabels={roleLabels}
                        activateLabel={t("activate")}
                        deactivateLabel={t("deactivate")}
                      />
                    </td>
                  </tr>
                );
              })}
              {!adminUsers?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {t("noUsers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit log */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">{t("auditLog")}</h2>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("action")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("target")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("at")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(auditLog ?? []).map((entry) => (
                <tr key={entry.id} className="text-fg/90">
                  <td className="px-4 py-3 font-mono text-xs text-brand">{entry.action}</td>
                  <td className="px-4 py-3 text-muted text-xs">{entry.target}</td>
                  <td className="px-4 py-3 text-xs text-muted">{fmt(entry.created_at)}</td>
                </tr>
              ))}
              {!auditLog?.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted">
                    {t("noAudit")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
