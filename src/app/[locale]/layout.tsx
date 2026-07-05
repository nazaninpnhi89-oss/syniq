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
          by reading its actual bundle) — it only works through its own UI,
          so we render the real widget rather than faking a button, to keep
          the call flow reliable. variant="tiny" gives a bare icon button;
          the built-in agent-avatar slot next to it is made transparent
          (avatar-image-url) and its wrapper background too (--el-base) so
          only the phone-icon call button is visible, matching ChatBubble.
        */}
        <elevenlabs-convai
          agent-id="agent_0501kwpgjqxbf3xvj6fa4xtp5mn6"
          variant="tiny"
          avatar-image-url="/voice-call-icon-transparent.svg"
          text-input="false"
          style={{
            position: "fixed",
            bottom: "6rem",
            [dir === "rtl" ? "left" : "right"]: "1.5rem",
            zIndex: 50,
            // @ts-expect-error -- CSS custom property recognized by the widget's shadow DOM
            "--el-accent": "#1f7bb5",
            "--el-accent-hover": "#3db2ec",
            "--el-accent-active": "#1a4d72",
            "--el-base": "transparent",
            "--el-base-border": "transparent",
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
