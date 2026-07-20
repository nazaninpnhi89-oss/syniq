"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { updateDealStage } from "@/lib/crm/deals";
import { suggestNextAction } from "@/lib/crm/ai-next-action";
import { useCanWrite } from "@/lib/admin/role-context";
import { formatCurrency, daysBetween } from "@/lib/format";

interface Stage {
  key: string;
  label_fa: string;
  label_en: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
}

interface Deal {
  id: string;
  title: string;
  stage_key: string;
  status: string;
  amount_toman: number | null;
  stage_entered_at: string;
  ai_next_action: string | null;
  contact: { id: string; full_name: string } | null;
  company: { id: string; name: string } | null;
}

export default function DealsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.crm.deals");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [lostPrompt, setLostPrompt] = useState<{ dealId: string; stageKey: string } | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [suggesting, setSuggesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stagesRes, dealsRes] = await Promise.all([
      fetch("/api/admin/crm/pipeline-stages"),
      fetch("/api/admin/crm/deals"),
    ]);
    if (stagesRes.ok) setStages((await stagesRes.json()).data ?? []);
    if (dealsRes.ok) setDeals((await dealsRes.json()).data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveDeal(dealId: string, newStageKey: string, reason?: string) {
    const prevDeals = deals;
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_key: newStageKey } : d)),
    );
    const res = await updateDealStage({ locale, dealId, newStageKey, lostReason: reason });
    if (res?.error) {
      setDeals(prevDeals);
    } else {
      load();
    }
  }

  function handleDrop(stageKey: string) {
    if (!dragId || !canWrite) return;
    const stage = stages.find((s) => s.key === stageKey);
    if (stage?.is_lost) {
      setLostPrompt({ dealId: dragId, stageKey });
    } else {
      moveDeal(dragId, stageKey);
    }
    setDragId(null);
  }

  async function suggestAction(dealId: string) {
    setSuggesting(dealId);
    const res = await suggestNextAction(dealId, locale);
    if (res?.ok) {
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, ai_next_action: res.action } : d)),
      );
    }
    setSuggesting(null);
  }

  function confirmLost() {
    if (!lostPrompt) return;
    moveDeal(lostPrompt.dealId, lostPrompt.stageKey, lostReason);
    setLostPrompt(null);
    setLostReason("");
  }

  const stageLabel = (s: Stage) => (locale === "fa" ? s.label_fa : s.label_en);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
      </div>

      {loading ? (
        <p className="text-center text-muted text-sm py-8">{tCommon("loading")}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage_key === stage.key);
            const total = stageDeals.reduce((sum, d) => sum + (d.amount_toman ?? 0), 0);
            return (
              <div
                key={stage.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.key)}
                className="w-72 shrink-0 bg-surface border border-line rounded-2xl flex flex-col"
              >
                <div className="px-4 py-3 border-b border-line">
                  <h3 className="text-xs font-semibold text-fg">{stageLabel(stage)}</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    {stageDeals.length} · {formatCurrency(locale, total)}
                  </p>
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable={canWrite}
                      onDragStart={() => setDragId(deal.id)}
                      className="bg-surface-2 border border-line rounded-xl p-3 space-y-1.5 cursor-move"
                    >
                      <p className="text-sm text-fg font-medium">{deal.title}</p>
                      <p className="text-xs text-muted">{deal.contact?.full_name ?? "—"}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand">
                          {formatCurrency(locale, deal.amount_toman)}
                        </span>
                        <span className="text-[10px] text-muted">
                          {daysBetween(deal.stage_entered_at)} {t("daysInStage")}
                        </span>
                      </div>
                      {deal.ai_next_action ? (
                        <p className="text-[11px] text-muted italic">{deal.ai_next_action}</p>
                      ) : (
                        <button
                          onClick={() => suggestAction(deal.id)}
                          disabled={suggesting === deal.id}
                          className="text-[11px] text-brand hover:underline disabled:opacity-50"
                        >
                          {suggesting === deal.id ? "…" : t("suggest")}
                        </button>
                      )}
                      {canWrite && (
                        <select
                          value={deal.stage_key}
                          onChange={(e) => {
                            const target = stages.find((s) => s.key === e.target.value);
                            if (target?.is_lost) {
                              setLostPrompt({ dealId: deal.id, stageKey: e.target.value });
                            } else {
                              moveDeal(deal.id, e.target.value);
                            }
                          }}
                          className="w-full sm:hidden bg-surface border border-line rounded-lg px-2 py-1 text-[11px] text-fg"
                        >
                          {stages.map((s) => (
                            <option key={s.key} value={s.key}>
                              {stageLabel(s)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-muted text-center py-6">{t("noDeals")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lostPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface border border-line rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-fg">{t("lostReasonTitle")}</h3>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder={t("lostReasonPlaceholder")}
              rows={3}
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setLostPrompt(null);
                  setLostReason("");
                }}
                className="text-xs text-muted hover:text-fg px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmLost}
                className="text-xs font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
