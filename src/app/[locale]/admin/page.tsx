import { setRequestLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/admin/StatsCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin.dashboard" });
  const tCommon = await getTranslations({ locale, namespace: "admin.common" });

  const db = createAdminClient();

  const [
    { count: totalSessions },
    { count: totalMessages },
    { count: totalLeads },
    { count: positiveFeedback },
    { data: recentSessions },
    { data: recentLeads },
  ] = await Promise.all([
    db.from("chat_sessions").select("*", { count: "exact", head: true }),
    db.from("chat_messages").select("*", { count: "exact", head: true }),
    db.from("leads").select("*", { count: "exact", head: true }),
    db
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("rating", 1),
    db
      .from("chat_sessions")
      .select("id, source, locale, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("leads")
      .select("id, name, email, source, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const fmt = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label={t("totalSessions")} value={totalSessions ?? 0} />
        <StatsCard label={t("totalMessages")} value={totalMessages ?? 0} />
        <StatsCard label={t("totalLeads")} value={totalLeads ?? 0} />
        <StatsCard label={t("positiveFeedback")} value={positiveFeedback ?? 0} />
      </div>

      {/* Recent conversations */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-3">{t("recentConversations")}</h2>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">ID</th>
                <th className="px-4 py-3 text-start font-medium">Source</th>
                <th className="px-4 py-3 text-start font-medium">Locale</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(recentSessions ?? []).map((s) => (
                <tr key={s.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted truncate max-w-[120px]">{s.id}</td>
                  <td className="px-4 py-3">{s.source}</td>
                  <td className="px-4 py-3">{s.locale}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status ?? "active"} />
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {fmt.format(new Date(s.created_at))}
                  </td>
                </tr>
              ))}
              {!recentSessions?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    {tCommon("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent leads */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-3">{t("recentLeads")}</h2>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">Name</th>
                <th className="px-4 py-3 text-start font-medium">Email</th>
                <th className="px-4 py-3 text-start font-medium">Source</th>
                <th className="px-4 py-3 text-start font-medium">Status</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(recentLeads ?? []).map((l) => (
                <tr key={l.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">{l.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{l.email ?? "—"}</td>
                  <td className="px-4 py-3">{l.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status ?? "new"} />
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {fmt.format(new Date(l.created_at))}
                  </td>
                </tr>
              ))}
              {!recentLeads?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    {tCommon("noData")}
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
