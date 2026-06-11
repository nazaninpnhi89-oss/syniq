import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { buildSelectableDays } from "@/lib/days";
import { CONSULTATION_SLUG } from "@/lib/config";
import { Header } from "@/components/site/header";
import { Container } from "@/components/ui/container";
import { BookingClient } from "@/components/booking/booking-client";

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <>
      <Header />
      <main className="pt-28 pb-24">
        <Container>
          <div className="mb-10">
            <span className="brand-rule" />
            <h1 className="mt-4 text-3xl font-bold text-fg sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-muted">{t("subtitle")}</p>
          </div>

          {configured ? (
            <BookingInner locale={locale} />
          ) : (
            <NotConfigured locale={locale} />
          )}
        </Container>
      </main>
    </>
  );
}

async function BookingInner({ locale }: { locale: string }) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/book`);

  const { data: service } = await sb
    .from("services")
    .select("*")
    .eq("slug", CONSULTATION_SLUG)
    .eq("is_active", true)
    .maybeSingle();

  if (!service) return <NotConfigured locale={locale} />;

  const { data: rules } = await sb
    .from("availability_rules")
    .select("weekday");
  const weekdays = [
    ...new Set((rules ?? []).map((r) => r.weekday as number)),
  ];
  const days = buildSelectableDays(weekdays, locale);
  const title = locale === "fa" ? service.title_fa : service.title_en;

  return (
    <BookingClient
      days={days}
      durationMin={service.duration_min}
      priceCents={service.price_cents}
      currency={service.currency}
      serviceTitle={title}
    />
  );
}

function NotConfigured({ locale }: { locale: string }) {
  const fa = locale === "fa";
  return (
    <div className="rounded-3xl border border-line bg-surface/50 p-8 text-muted">
      <p className="text-fg">
        {fa
          ? "برای فعال‌شدن رزرو و پرداخت، کلیدهای Supabase و Stripe را در فایل "
          : "To enable booking and payment, set your Supabase and Stripe keys in "}
        <code className="mx-1 rounded bg-bg px-1.5 py-0.5">.env.local</code>
        {fa ? " تنظیم کنید. راهنما در " : ". See "}
        <code>README.md</code>
        {fa ? " آمده است." : "."}
      </p>
    </div>
  );
}
