import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/site/header";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  return (
    <>
      <Header />
      <main className="grid min-h-dvh place-items-center pt-24 pb-16">
        <Container>
          <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface/50 p-10 text-center">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-brand-light/15 text-brand-light">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-2xl font-bold text-fg">{t("successTitle")}</h1>
            <p className="mt-3 text-muted">{t("successBody")}</p>
            <Link
              href="/dashboard"
              className={buttonVariants({
                variant: "primary",
                size: "lg",
                className: "mt-8",
              })}
            >
              {t("backToDashboard")}
            </Link>
          </div>
        </Container>
      </main>
    </>
  );
}
