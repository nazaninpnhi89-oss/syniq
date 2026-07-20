"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useCanWrite } from "@/lib/admin/role-context";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  contacts: { count: number }[];
  deals: { count: number }[];
}

export default function CompaniesPage() {
  const locale = useLocale();
  const t = useTranslations("admin.crm.companies");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/crm/companies?limit=100${query ? `&q=${encodeURIComponent(query)}` : ""}`);
    if (res.ok) {
      const body = await res.json();
      setCompanies(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(q), 300);
    return () => clearTimeout(timer);
  }, [q, load]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/crm/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, industry: newIndustry || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      setNewName("");
      setNewIndustry("");
      setShowNew(false);
      load(q);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {canWrite && (
            <button
              onClick={() => setShowNew((v) => !v)}
              className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
            >
              {t("new")}
            </button>
          )}
        </div>
      </div>

      {showNew && (
        <form
          onSubmit={createCompany}
          className="bg-surface border border-line rounded-2xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="space-y-1">
            <label className="text-xs text-muted">{t("name")}</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">{t("industry")}</label>
            <input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="text-xs font-medium bg-brand text-white px-4 py-1.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {tCommon("save")}
          </button>
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
                <th className="px-4 py-3 text-start font-medium">{t("industry")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("contacts")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("deals")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {companies.map((c) => (
                <tr key={c.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/${locale}/admin/crm/companies/${c.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{c.contacts?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3 text-muted text-xs">{c.deals?.[0]?.count ?? 0}</td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    {t("noCompanies")}
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
