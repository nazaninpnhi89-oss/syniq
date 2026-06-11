import type { Metadata } from "next";
import { Vazirmatn, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://syniq.ai"),
  title: {
    default: "SYNIQ — Scale Your Next Intelligent Growth",
    template: "%s · SYNIQ",
  },
  description:
    "We help businesses automate operations, optimize workflows, and accelerate growth through AI-powered systems.",
  openGraph: {
    title: "SYNIQ — Scale Your Next Intelligent Growth",
    description:
      "We help businesses automate operations, optimize workflows, and accelerate growth through AI-powered systems.",
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
      className={`${vazir.variable} ${poppins.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
