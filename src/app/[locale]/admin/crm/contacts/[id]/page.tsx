import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AddTimelineEntry } from "@/components/admin/AddTimelineEntry";
import { SummarizeButton } from "@/components/admin/SummarizeButton";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin.crm.contacts" });
  const tCommon = await getTranslations({ locale, namespace: "admin.common" });

  const db = createAdminClient();

  const [{ data: contact }, { data: deals }, { data: activities }] = await Promise.all([
    db.from("contacts").select("*, company:companies(id, name)").eq("id", id).maybeSingle(),
    db
      .from("deals")
      .select("id, title, stage_key, status, amount_toman")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("activities")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!contact) notFound();

  let conversation: { id: string; role: string; content: string | null; created_at: string }[] = [];
  if (contact.conversation_id) {
    const { data } = await db
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", contact.conversation_id)
      .order("created_at", { ascending: true });
    conversation = data ?? [];
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{contact.full_name}</h2>
        {contact.company && (
          <Link
            href={`/${locale}/admin/crm/companies/${contact.company.id}`}
            className="text-sm text-muted hover:text-brand hover:underline"
          >
            {contact.company.name}
          </Link>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Info card */}
        <section className="bg-surface border border-line rounded-2xl p-5 space-y-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            {t("title")}
          </h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted">{t("email")}</dt>
              <dd className="text-fg">{contact.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t("phone")}</dt>
              <dd className="text-fg">{contact.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t("source")}</dt>
              <dd className="text-fg">{contact.source ?? "—"}</dd>
            </div>
          </dl>
        </section>

        {/* AI insight card */}
        <section className="bg-surface border border-line rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
              {t("insightCard")}
            </h3>
            {contact.conversation_id && (
              <SummarizeButton locale={locale} contactId={id} label={t("summarize")} />
            )}
          </div>
          {contact.ai_summary ? (
            <div className="text-sm text-fg/90 whitespace-pre-line">{contact.ai_summary}</div>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </section>
      </div>

      {/* Deals */}
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
          {!deals?.length && <li className="text-sm text-muted">—</li>}
        </ul>
      </section>

      {/* Timeline */}
      <section className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            {t("timeline")}
          </h3>
          <AddTimelineEntry
            contactId={id}
            addNoteLabel={t("addNote")}
            addTaskLabel={t("addTask")}
            saveLabel={tCommon("save")}
            cancelLabel={tCommon("cancel")}
          />
        </div>

        <ul className="space-y-3">
          {conversation.length > 0 && (
            <li className="border border-line rounded-xl p-3">
              <details>
                <summary className="text-sm text-fg cursor-pointer">
                  {locale === "fa" ? "گفتگوی چت‌بات" : "Chatbot conversation"} ({conversation.length})
                </summary>
                <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
                  {conversation.map((m) => (
                    <div key={m.id} className="text-xs">
                      <span className="font-medium text-muted">{m.role}: </span>
                      <span className="text-fg/90">{m.content}</span>
                    </div>
                  ))}
                </div>
              </details>
            </li>
          )}
          {(activities ?? []).map((a) => (
            <li key={a.id} className="border border-line rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg">{a.title}</span>
                <span className="text-[11px] text-muted">
                  {formatDate(locale, a.created_at)}
                </span>
              </div>
              {a.body && <p className="text-xs text-muted mt-1 whitespace-pre-line">{a.body}</p>}
            </li>
          ))}
          {!activities?.length && conversation.length === 0 && (
            <li className="text-sm text-muted">{t("noTimeline")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}
