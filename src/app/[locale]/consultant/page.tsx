import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/chat-window";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "consultant" });
  return { title: t("title") };
}

export default async function ConsultantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const tChat = await getTranslations({ locale, namespace: "chat" });
  const tConsultant = await getTranslations({ locale, namespace: "consultant" });

  // Fetch widget config for locale-specific welcome message
  const db = createAdminClient();
  const { data: widgetConfig } = await db
    .from("widget_config")
    .select("welcome_message_fa, welcome_message_en")
    .maybeSingle();

  const greeting =
    locale === "fa"
      ? (widgetConfig?.welcome_message_fa ?? tChat("greeting"))
      : (widgetConfig?.welcome_message_en ?? tChat("greeting"));

  const starters = tConsultant.raw("starters") as string[];

  return (
    <main
      className="flex flex-col min-h-dvh bg-bg"
      dir={locale === "fa" ? "rtl" : "ltr"}
    >
      {/* Page header */}
      <div className="w-full border-b border-line bg-surface px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-bold text-fg">{tConsultant("title")}</h1>
          <p className="text-sm text-muted mt-0.5">{tConsultant("subtitle")}</p>
        </div>
      </div>

      {/* Full-page chat fills remaining space */}
      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col">
        <ChatWindow
          locale={locale}
          source="web"
          t={{
            title: tChat("title"),
            placeholder: tChat("placeholder"),
            send: tChat("send"),
            thinking: tChat("thinking"),
            newChat: tChat("newChat"),
            poweredBy: tChat("poweredBy"),
            greeting,
            feedbackThanks: tChat("feedbackThanks"),
            sources: tChat("sources"),
            helpful: tChat("helpful"),
            notHelpful: tChat("notHelpful"),
          }}
          starterQuestions={Array.isArray(starters) ? starters : []}
          ctaLabel={tConsultant("ctaLabel")}
          ctaMessage={tConsultant("ctaMessage")}
        />
      </div>
    </main>
  );
}
