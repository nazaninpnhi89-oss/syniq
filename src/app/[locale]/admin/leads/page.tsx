"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConvertLeadModal } from "@/components/admin/ConvertLeadModal";
import { LeadScoreCell } from "@/components/admin/LeadScoreCell";
import { useCanWrite } from "@/lib/admin/role-context";
import { formatDate } from "@/lib/format";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  created_at: string;
  contact_id: string | null;
  ai_score: number | null;
  ai_score_rationale: string | null;
}

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "closed"];

export default function LeadsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.leads");
  const tc = useTranslations("admin.crm.convert");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/leads?limit=50");
    if (res.ok) {
      const body = await res.json();
      setLeads(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setUpdating(null);
    load();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        <span className="text-xs text-muted">{leads.length}</span>
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("email")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("phone")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("source")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("aiScore")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("createdAt")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr key={l.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium">{l.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{l.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{l.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{l.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    {canWrite ? (
                      <select
                        value={l.status}
                        onChange={(e) => updateStatus(l.id, e.target.value)}
                        disabled={updating === l.id}
                        className="bg-transparent border-none text-xs focus:outline-none cursor-pointer"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`statuses.${s}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={l.status} label={t(`statuses.${l.status}`)} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <LeadScoreCell
                      locale={locale}
                      leadId={l.id}
                      score={l.ai_score}
                      rationale={l.ai_score_rationale}
                      scoreLabel={t("aiScore")}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(locale, l.created_at, { dateStyle: "medium" })}
                  </td>
                  <td className="px-4 py-3">
                    {l.status === "converted" && l.contact_id ? (
                      <Link
                        href={`/${locale}/admin/crm/contacts/${l.contact_id}`}
                        className="text-xs text-brand hover:underline"
                      >
                        {tc("already")}
                      </Link>
                    ) : (
                      canWrite && (
                        <button
                          onClick={() => setConverting(l)}
                          className="text-xs text-brand hover:underline"
                        >
                          {tc("button")}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    {t("noLeads")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {converting && (
        <ConvertLeadModal
          locale={locale}
          leadId={converting.id}
          leadName={converting.name ?? ""}
          onClose={() => {
            setConverting(null);
            load();
          }}
          t={{
            modalTitle: tc("modalTitle"),
            companyName: tc("companyName"),
            createDeal: tc("createDeal"),
            dealTitle: tc("dealTitle"),
            dealAmount: tc("dealAmount"),
            submit: tc("submit"),
            cancel: tc("cancel"),
          }}
        />
      )}
    </div>
  );
}
