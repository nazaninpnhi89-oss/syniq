"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/format";

interface Session {
  id: string;
  source: string;
  locale: string;
  status: string;
  created_at: string;
}

export default function HandoffPage() {
  const locale = useLocale();
  const t = useTranslations("admin.handoff");
  const tCommon = useTranslations("admin.common");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/conversations?status=handed_off&limit=50");
    if (res.ok) setSessions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(sessionId: string) {
    setResolving(sessionId);
    await fetch("/api/admin/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, status: "closed" }),
    });
    setResolving(null);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
      <p className="text-sm text-muted">{t("subtitle")}</p>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : sessions.length === 0 ? (
          <p className="px-4 py-12 text-center text-muted text-sm">{t("noHandoffs")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("session")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("source")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("locale")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("requestedAt")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((s) => (
                <tr key={s.id} className="text-fg/90">
                  <td className="px-4 py-3 font-mono text-xs text-muted max-w-[160px] truncate">{s.id}</td>
                  <td className="px-4 py-3">{s.source}</td>
                  <td className="px-4 py-3">{s.locale}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(locale, s.created_at, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => resolve(s.id)}
                      disabled={resolving === s.id}
                      className="text-xs text-brand hover:text-brand-light transition-colors disabled:opacity-50"
                    >
                      {resolving === s.id ? t("resolving") : t("resolve")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
