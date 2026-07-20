import { setRequestLocale, getTranslations } from "next-intl/server";

const ENV_VARS = [
  { key: "NEXT_PUBLIC_SITE_URL", label: "Site URL", public: true },
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", public: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key", secret: true },
  { key: "OPENROUTER_API_KEY", label: "OpenRouter API Key", secret: true },
  { key: "VOYAGE_API_KEY", label: "Voyage AI API Key", secret: true },
  { key: "TELEGRAM_BOT_TOKEN", label: "Telegram Bot Token", secret: true },
  { key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", secret: true },
  { key: "RESEND_API_KEY", label: "Resend API Key", secret: true },
  { key: "OPENAI_API_KEY", label: "OpenAI API Key (future)", secret: true },
  { key: "COHERE_API_KEY", label: "Cohere API Key (future)", secret: true },
  { key: "GOOGLE_API_KEY", label: "Google API Key (future)", secret: true },
];

function maskValue(val: string | undefined): string {
  if (!val) return "—";
  if (val.length <= 8) return "•".repeat(val.length);
  return val.slice(0, 4) + "•".repeat(Math.min(val.length - 8, 20)) + val.slice(-4);
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.settings" });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Env vars */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">{t("envVars")}</h2>
        <p className="text-xs text-muted">{t("envVarsHint")}</p>
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("variable")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("value")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ENV_VARS.map((v) => {
                const val = process.env[v.key];
                const set = Boolean(val);
                return (
                  <tr key={v.key} className="text-fg/90">
                    <td className="px-4 py-3 font-mono text-xs text-brand">{v.key}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {v.secret ? maskValue(val) : (val ?? "—")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          set
                            ? "bg-green-500/15 text-green-400"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {set ? t("set") : t("missing")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-red-400">{t("danger")}</h2>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-sm font-medium text-fg">{t("purgeTitle")}</p>
            <p className="text-xs text-muted mt-1">{t("purgeHint")}</p>
          </div>
          <p className="text-xs text-muted italic">{t("contactAdmin")}</p>
        </div>
      </section>
    </div>
  );
}
