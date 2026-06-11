import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/site/header";
import { Container } from "@/components/ui/container";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { BUSINESS_TIMEZONE } from "@/lib/config";

type Row = {
  id: string;
  start_at: string;
  status: string;
  notes: string | null;
  user_id: string;
  services: { title_en: string } | null;
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return (
      <>
        <Header />
        <main className="pt-28 pb-24">
          <Container>
            <p className="text-muted">
              برای پنل ادمین، کلید SUPABASE_SERVICE_ROLE_KEY لازم است.
            </p>
          </Container>
        </main>
      </>
    );
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/admin`);

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect(`/${locale}`);

  const admin = createAdminClient();
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, start_at, status, notes, user_id, services(title_en)")
    .order("start_at", { ascending: true });
  const rows = (bookings ?? []) as unknown as Row[];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const pmap = new Map(
    (profiles ?? []).map((p) => [p.id, p as { full_name: string; email: string }]),
  );

  const fmt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIMEZONE,
  });

  return (
    <>
      <Header />
      <main className="pt-28 pb-24">
        <Container>
          <span className="brand-rule" />
          <h1 className="mt-4 text-3xl font-bold text-fg">Admin · Bookings</h1>
          <p className="mt-2 text-muted">
            Times in {BUSINESS_TIMEZONE}. {rows.length} total.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-surface/60 text-left text-fg/70">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const p = pmap.get(r.user_id);
                  return (
                    <tr key={r.id} className="text-fg/90">
                      <td className="px-4 py-3">
                        {fmt.format(new Date(r.start_at))}
                      </td>
                      <td className="px-4 py-3">
                        {p?.full_name || "—"}
                        <span className="block text-xs text-muted">
                          {p?.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.services?.title_en ?? "—"}</td>
                      <td className="px-4 py-3">{r.status}</td>
                      <td className="px-4 py-3 max-w-[220px] text-muted">
                        {r.notes}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      No bookings yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Container>
      </main>
    </>
  );
}
