"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/format";

interface Session {
  id: string;
  source: string;
  locale: string;
  status: string;
  created_at: string;
  message_count?: number;
}

const SOURCES = ["all", "web", "widget", "telegram"];
const STATUSES = ["all", "active", "closed", "handed_off"];

export default function ConversationsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.conversations");
  const tCommon = useTranslations("admin.common");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
    if (source !== "all") params.set("source", source);
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/admin/conversations?${params}`);
    if (res.ok) setSessions(await res.json());
    setLoading(false);
  }, [source, status, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(0); }}
          className="bg-surface border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s === "all" ? tCommon("allSources") : s}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="bg-surface border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "all" ? tCommon("allStatuses") : s}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("sessionId")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("source")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("locale")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((s) => (
                <tr key={s.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted max-w-[160px] truncate">{s.id}</td>
                  <td className="px-4 py-3">{s.source}</td>
                  <td className="px-4 py-3">{s.locale}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status ?? "active"} /></td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(locale, s.created_at)}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">{t("noConversations")}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{tCommon("page")} {page + 1}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-line hover:border-brand/40 disabled:opacity-40 transition-colors"
          >
            {tCommon("prev")}
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={sessions.length < PAGE_SIZE}
            className="px-3 py-1.5 rounded-lg border border-line hover:border-brand/40 disabled:opacity-40 transition-colors"
          >
            {tCommon("next")}
          </button>
        </div>
      </div>
    </div>
  );
}
