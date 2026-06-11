import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/site/header";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth-actions";
import { BUSINESS_TIMEZONE } from "@/lib/config";
import { cn } from "@/lib/utils";

type BookingRow = {
  id: string;
  start_at: string;
  status: "pending" | "paid" | "confirmed" | "cancelled";
  services: { title_fa: string; title_en: string } | null;
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <>
        <Header />
        <main className="pt-28 pb-24">
          <Container>
            <p className="text-muted">Supabase تنظیم نشده است.</p>
          </Container>
        </main>
      </>
    );
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/dashboard`);

  const { data: profile } = await sb
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: bookings } = await sb
    .from("bookings")
    .select("id, start_at, status, services(title_fa, title_en)")
    .order("start_at", { ascending: false });

  const rows = (bookings ?? []) as unknown as BookingRow[];

  const fmt = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIMEZONE,
  });

  return (
    <>
      <Header />
      <main className="pt-28 pb-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="brand-rule" />
              <h1 className="mt-4 text-3xl font-bold text-fg">{t("title")}</h1>
              <p className="mt-2 text-muted">
                {t("welcome")}
                {profile?.full_name ? `، ${profile.full_name}` : ""}
              </p>
            </div>
            <form action={logout}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t("logout")}
              </button>
            </form>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">{t("myBookings")}</h2>
            <Link
              href="/book"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              <Plus size={16} /> {t("bookNow")}
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-line bg-surface/40 p-10 text-center text-muted">
              {t("noBookings")}
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {rows.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/40 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light/15 text-brand-light">
                      <CalendarClock size={18} />
                    </span>
                    <div>
                      <p className="font-medium text-fg">
                        {b.services
                          ? locale === "fa"
                            ? b.services.title_fa
                            : b.services.title_en
                          : "—"}
                      </p>
                      <p className="text-sm text-muted">
                        {fmt.format(new Date(b.start_at))}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={b.status} label={t(`statuses.${b.status}`)} />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </main>
    </>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: BookingRow["status"];
  label: string;
}) {
  const styles: Record<BookingRow["status"], string> = {
    pending: "border-gold/40 bg-gold/10 text-gold",
    paid: "border-brand-light/40 bg-brand-light/10 text-brand-light",
    confirmed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    cancelled: "border-red-500/40 bg-red-500/10 text-red-300",
  };
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        styles[status],
      )}
    >
      {label}
    </span>
  );
}
