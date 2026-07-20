"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertLead } from "@/lib/crm/lead-conversion";

interface Props {
  locale: string;
  leadId: string;
  leadName: string;
  onClose: () => void;
  t: Record<string, string>;
}

export function ConvertLeadModal({ locale, leadId, leadName, onClose, t }: Props) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [createDeal, setCreateDeal] = useState(true);
  const [dealTitle, setDealTitle] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await convertLead({
        locale,
        leadId,
        companyName: companyName.trim() || undefined,
        createDeal,
        dealTitle: dealTitle.trim() || undefined,
        dealAmountToman: dealAmount ? parseInt(dealAmount, 10) : undefined,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-line rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-fg">{t.modalTitle}</h3>
          <p className="text-xs text-muted mt-1">{leadName}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted">{t.companyName}</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={createDeal}
            onChange={(e) => setCreateDeal(e.target.checked)}
          />
          {t.createDeal}
        </label>

        {createDeal && (
          <div className="space-y-3 ps-1">
            <div className="space-y-1.5">
              <label className="text-xs text-muted">{t.dealTitle}</label>
              <input
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted">{t.dealAmount}</label>
              <input
                type="number"
                min={0}
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-fg px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {t.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
