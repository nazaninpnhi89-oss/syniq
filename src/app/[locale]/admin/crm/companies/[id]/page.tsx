import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatCurrency } from "@/lib/format";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin.crm.companies" });
  const tContacts = await getTranslations({ locale, namespace: "admin.crm.contacts" });
  const tDeals = await getTranslations({ locale, namespace: "admin.crm.deals" });

  const db = createAdminClient();

  const [{ data: company }, { data: contacts }, { data: deals }] = await Promise.all([
    db.from("companies").select("*").eq("id", id).maybeSingle(),
    db
      .from("contacts")
      .select("id, full_name, email, phone, title")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("deals")
      .select("id, title, stage_key, status, amount_toman")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!company) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{company.name}</h2>
        {company.industry && <p className="text-sm text-muted mt-1">{company.industry}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <section className="bg-surface border border-line rounded-2xl p-5 space-y-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            {t("title")}
          </h3>
          <dl className="text-sm space-y-1.5">
            {company.website && (
              <div className="flex justify-between">
                <dt className="text-muted">Website</dt>
                <dd className="text-fg">{company.website}</dd>
              </div>
            )}
            {company.phone && (
              <div className="flex justify-between">
                <dt className="text-muted">{tContacts("phone")}</dt>
                <dd className="text-fg">{company.phone}</dd>
              </div>
            )}
            {company.address && (
              <div className="flex justify-between">
                <dt className="text-muted">Address</dt>
                <dd className="text-fg">{company.address}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="bg-surface border border-line rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            {t("contacts")}
          </h3>
          <ul className="space-y-2">
            {(contacts ?? []).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${locale}/admin/crm/contacts/${c.id}`}
                  className="text-sm text-fg hover:text-brand hover:underline"
                >
                  {c.full_name}
                </Link>
                {c.title && <span className="text-xs text-muted ms-2">{c.title}</span>}
              </li>
            ))}
            {!contacts?.length && (
              <li className="text-sm text-muted">{t("noContacts")}</li>
            )}
          </ul>
        </section>
      </div>

      <section className="bg-surface border border-line rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          {t("deals")}
        </h3>
        <ul className="space-y-2">
          {(deals ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between text-sm">
              <span className="text-fg">{d.title}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted text-xs">{formatCurrency(locale, d.amount_toman)}</span>
                <StatusBadge status={d.status} />
              </span>
            </li>
          ))}
          {!deals?.length && <li className="text-sm text-muted">{tDeals("noDeals")}</li>}
        </ul>
      </section>
    </div>
  );
}
