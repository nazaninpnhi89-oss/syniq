import { setRequestLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getFunnelCounts,
  getPipelineValueByStage,
  getLeadSources,
  getMonthlyRevenue,
} from "@/lib/crm/reports";

function BarRow({
  label,
  value,
  max,
  displayValue,
}: {
  label: string;
  value: number;
  max: number;
  displayValue: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg/90">{label}</span>
        <span className="text-muted">{displayValue}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin.crm.reports" });
  const tFunnel = await getTranslations({ locale, namespace: "admin.crm.reports.funnelSteps" });

  const db = createAdminClient();

  const [funnel, pipelineValue, leadSources, revenue] = await Promise.all([
    getFunnelCounts(db),
    getPipelineValueByStage(db, locale),
    getLeadSources(db),
    getMonthlyRevenue(db, locale, 12),
  ]);

  const maxPipeline = Math.max(...pipelineValue.map((s) => s.total), 1);
  const maxSource = Math.max(...leadSources.map((s) => s.count), 1);
  const maxRevenue = Math.max(...revenue.map((r) => r.total), 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>

      <section className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {t("funnel")}
        </h3>
        <div className="space-y-3">
          {funnel.map((step) => (
            <BarRow
              key={step.key}
              label={tFunnel(step.key)}
              value={step.pct}
              max={100}
              displayValue={`${formatNumber(locale, step.count)} (${step.pct}%)`}
            />
          ))}
        </div>
      </section>

      <section className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {t("pipelineValue")}
        </h3>
        <div className="space-y-3">
          {pipelineValue.map((s) => (
            <BarRow
              key={s.key}
              label={s.label}
              value={s.total}
              max={maxPipeline}
              displayValue={formatCurrency(locale, s.total)}
            />
          ))}
        </div>
      </section>

      <section className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {t("leadSources")}
        </h3>
        <div className="space-y-3">
          {leadSources.map((s) => (
            <BarRow
              key={s.source}
              label={s.source}
              value={s.count}
              max={maxSource}
              displayValue={formatNumber(locale, s.count)}
            />
          ))}
          {leadSources.length === 0 && <p className="text-sm text-muted">—</p>}
        </div>
      </section>

      <section className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {t("revenue")}
        </h3>
        <div className="space-y-3">
          {revenue.map((r, i) => (
            <BarRow
              key={i}
              label={r.month}
              value={r.total}
              max={maxRevenue}
              displayValue={formatCurrency(locale, r.total)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
