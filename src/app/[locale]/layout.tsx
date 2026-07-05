import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import { ChatBubble } from "@/components/chat/chat-bubble";
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
        </NextIntlClientProvider>
        {/*
          The widget has no public JS API to start a call directly (verified
          by reading its actual bundle) — it only works through its own UI:
          tap to expand, then tap "Start a call". So we show the real widget
          (styled to be as compact/circular as its attributes allow) instead
          of faking a single custom button, to keep the call flow reliable.
        */}
        <elevenlabs-convai
          agent-id="agent_0501kwpgjqxbf3xvj6fa4xtp5mn6"
          variant="compact"
          avatar-image-url="/voice-call-icon.svg"
          avatar-orb-color-1="#1F7BB5"
          avatar-orb-color-2="#1F7BB5"
          action-text=""
          disable-banner="true"
          start-call-text={dir === "rtl" ? "شروع تماس" : "Start call"}
          end-call-text={dir === "rtl" ? "پایان تماس" : "End call"}
          style={{
            position: "fixed",
            bottom: "6rem",
            [dir === "rtl" ? "left" : "right"]: "1.5rem",
            zIndex: 50,
          }}
        />
        <Script
          src="https://unpkg.com/@elevenlabs/convai-widget-embed"
          strategy="afterInteractive"
          async
        />
      </body>
    </html>
  );
}
