import { getTranslations, setRequestLocale } from "next-intl/server";
import { XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/site/header";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export default async function BookingCancelPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ booking?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("booking");
  const { booking: bookingId } = await searchParams;

  // رزرو pending را آزاد می‌کنیم تا اسلات دوباره در دسترس قرار گیرد.
  if (bookingId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const sb = await createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient();
        await admin
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", bookingId)
          .eq("user_id", user.id)
          .eq("status", "pending");
      }
    } catch {
      // غیرحیاتی
    }
  }

  return (
    <>
      <Header />
      <main className="grid min-h-dvh place-items-center pt-24 pb-16">
        <Container>
          <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface/50 p-10 text-center">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-red-500/15 text-red-400">
              <XCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-fg">{t("cancelTitle")}</h1>
            <p className="mt-3 text-muted">{t("cancelBody")}</p>
            <Link
              href="/book"
              className={buttonVariants({
                variant: "primary",
                size: "lg",
                className: "mt-8",
              })}
            >
              {t("tryAgain")}
            </Link>
          </div>
        </Container>
      </main>
    </>
  );
}
