"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useCanWrite } from "@/lib/admin/role-context";
import { createCampaign } from "@/lib/crm/campaigns";
import { SEGMENT_KEYS } from "@/lib/crm/segment-keys";

interface Campaign {
  id: string;
  name: string;
  segment_key: string;
  status: string;
  emails: { count: number }[];
}

export default function CampaignsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.crm.campaigns");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [segmentKey, setSegmentKey] = useState<(typeof SEGMENT_KEYS)[number]>("stale_leads");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/crm/campaigns");
    if (res.ok) setCampaigns((await res.json()).data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;
    setSaving(true);
    setError(null);
    const res = await createCampaign({ locale, name, segmentKey, goal });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setName("");
    setGoal("");
    setShowNew(false);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        {canWrite && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t("new")}
          </button>
        )}
      </div>

      {showNew && (
        <form
          onSubmit={submit}
          className="bg-surface border border-line rounded-2xl p-4 space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("name")}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
            required
          />
          <select
            value={segmentKey}
            onChange={(e) => setSegmentKey(e.target.value as typeof segmentKey)}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
          >
            {SEGMENT_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`segments.${k}`)}
              </option>
            ))}
          </select>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t("goal")}
            rows={2}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
            required
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="text-xs font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {tCommon("save")}
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("segment")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("recipients")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("title")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaigns.map((c) => (
                <tr key={c.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/${locale}/admin/crm/campaigns/${c.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{t(`segments.${c.segment_key}`)}</td>
                  <td className="px-4 py-3 text-muted text-xs">{c.emails?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    {t("noCampaigns")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
