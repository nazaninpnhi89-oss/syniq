import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Logo } from "@/components/site/logo";
import { AcceptContractForm } from "@/components/crm/AcceptContractForm";
import { PrintButton } from "@/components/crm/PrintButton";
import { markdownToHtml } from "@/lib/crm/markdown";
import { formatDate } from "@/lib/format";

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ locale: string; share_token: string }>;
}) {
  const { locale, share_token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "contract" });
  const db = createAdminClient();

  const { data: contract } = await db
    .from("contracts")
    .select("*")
    .eq("share_token", share_token)
    .maybeSingle();

  if (!contract) notFound();

  if (contract.status === "sent") {
    await db
      .from("contracts")
      .update({ status: "viewed", first_viewed_at: new Date().toISOString() })
      .eq("id", contract.id)
      .eq("status", "sent");
    contract.status = "viewed";
  }

  const html = markdownToHtml(contract.body_md);

  return (
    <div
      className="min-h-screen bg-bg text-fg font-sans"
      dir={locale === "fa" ? "rtl" : "ltr"}
    >
      <header className="print:hidden border-b border-line px-6 py-4 flex items-center justify-between">
        <Logo />
        <PrintButton label={t("print")} />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {contract.status === "accepted" && (
          <div className="print:hidden bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-sm text-green-400">
            {t("acceptedNotice")} — {contract.accepted_by_name} (
            {contract.accepted_at && formatDate(locale, contract.accepted_at)})
          </div>
        )}
        {contract.status === "canceled" && (
          <div className="print:hidden bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400">
            {t("canceledNotice")}
          </div>
        )}

        <article
          className="prose prose-invert max-w-none text-fg [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm print:text-black"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {(contract.status === "sent" || contract.status === "viewed") && (
          <AcceptContractForm
            shareToken={share_token}
            label={t("acceptLabel")}
            namePlaceholder={t("namePlaceholder")}
            submitLabel={t("acceptSubmit")}
          />
        )}
      </main>
    </div>
  );
}
