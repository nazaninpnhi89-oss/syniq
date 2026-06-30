import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const db = createAdminClient();

  const [{ data: adminUsers }, { data: auditLog }] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false }),
    db
      .from("audit_log")
      .select("id, admin_user_id, action, target, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Admin users */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">Admin Users</h2>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="px-4 py-3 text-start font-medium">Email</th>
                <th className="px-4 py-3 text-start font-medium">Role</th>
                <th className="px-4 py-3 text-start font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(adminUsers ?? []).map((u) => (
                <tr key={u.id} className="text-fg/90">
                  <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-3 text-xs text-muted">{fmt(u.created_at)}</td>
                </tr>
              ))}
              {!adminUsers?.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">No admin users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit log */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">Audit Log</h2>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">Action</th>
                <th className="px-4 py-3 text-start font-medium">Target</th>
                <th className="px-4 py-3 text-start font-medium">At</th>
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
                  <td colSpan={3} className="px-4 py-8 text-center text-muted">No audit entries.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
