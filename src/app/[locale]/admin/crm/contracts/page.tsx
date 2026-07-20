"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewContractModal } from "@/components/admin/NewContractModal";
import { useCanWrite } from "@/lib/admin/role-context";
import { formatCurrency, formatDate } from "@/lib/format";

interface Contract {
  id: string;
  number: string;
  title: string;
  status: string;
  amount_toman: number | null;
  contact: { full_name: string } | null;
  created_at: string;
}

export default function ContractsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.crm.contracts");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/crm/contracts");
    if (res.ok) setContracts((await res.json()).data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        {canWrite && (
          <button
            onClick={() => setShowNew(true)}
            className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t("new")}
          </button>
        )}
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("number")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("title")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("contact")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("amount")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contracts.map((c) => (
                <tr key={c.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/${locale}/admin/crm/contracts/${c.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {c.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.title}</td>
                  <td className="px-4 py-3 text-muted">{c.contact?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {formatCurrency(locale, c.amount_toman)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} label={t(`statuses.${c.status}`)} />
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {formatDate(locale, c.created_at, { dateStyle: "medium" })}
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {t("noContracts")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewContractModal
          locale={locale}
          onClose={() => {
            setShowNew(false);
            load();
          }}
          t={{
            new: t("new"),
            contact: t("contact"),
            title: t("title"),
            amount: t("amount"),
            scope: t("scope"),
          }}
          tCommon={{ cancel: tCommon("cancel"), save: tCommon("save") }}
        />
      )}
    </div>
  );
}
