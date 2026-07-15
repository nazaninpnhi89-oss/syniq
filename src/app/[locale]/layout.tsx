import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { VoiceButton } from "@/components/voice/voice-button";
import { FunnelyzePanel } from "@/components/funnelyze/funnelyze-panel";
import "../globals.css";

// تنها فونتِ سایت: Vazirmatn (هم فارسی، هم لاتین) — مطابق برند گاید
const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://syniq.ai"),
  title: {
    default: "SYNIQ — From Strategy to Intelligent Growth",
    template: "%s · SYNIQ",
  },
  description:
    "Nazanin Panahi, AI consultant. I help you clarify your brand and make your business processes faster and smarter with AI — from strategy to intelligent growth.",
  openGraph: {
    title: "SYNIQ — From Strategy to Intelligent Growth",
    description:
      "AI consulting by Nazanin Panahi: brand clarity first, then real AI implementation. Book a 1:1 consultation.",
    siteName: "SYNIQ",
    type: "website",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const dir = locale === "fa" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${vazir.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full antialiased">
        <NextIntlClientProvider>
          {children}
          <ChatBubble />
          <VoiceButton dir={dir} />
          <FunnelyzePanel />
        </NextIntlClientProvider>
        <Script
          src="https://unpkg.com/@elevenlabs/convai-widget-embed"
          strategy="afterInteractive"
          async
        />
      </body>
    </html>
  );
}
