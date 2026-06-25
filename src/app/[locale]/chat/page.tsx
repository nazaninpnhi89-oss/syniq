import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ChatWindow } from "@/components/chat/chat-window";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  return { title: t("title") };
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "chat" });

  return (
    <ChatWindow
      locale={locale}
      source="web"
      t={{
        title: t("title"),
        placeholder: t("placeholder"),
        send: t("send"),
        thinking: t("thinking"),
        newChat: t("newChat"),
        poweredBy: t("poweredBy"),
        greeting: t("greeting"),
      }}
    />
  );
}
