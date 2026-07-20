"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/format";
import { useCanWrite } from "@/lib/admin/role-context";

interface Activity {
  id: string;
  type: string;
  title: string;
  body: string | null;
  due_at: string | null;
  completed_at: string | null;
  contact_id: string | null;
}

interface Contact {
  id: string;
  full_name: string;
}

function ActivitySection({
  label,
  items,
  tone,
  locale,
  canWrite,
  markDoneLabel,
  onToggle,
}: {
  label: string;
  items: Activity[];
  tone?: "danger" | "gold";
  locale: string;
  canWrite: boolean;
  markDoneLabel: string;
  onToggle: (id: string, completed: boolean) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3
        className={
          "text-xs font-semibold uppercase tracking-wide " +
          (tone === "danger" ? "text-red-400" : tone === "gold" ? "text-gold" : "text-muted")
        }
      >
        {label} ({items.length})
      </h3>
      <div className="space-y-2">
        {items.map((a) => (
          <div
            key={a.id}
            className="bg-surface border border-line rounded-xl p-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm text-fg">{a.title}</p>
              {a.due_at && (
                <p className="text-[11px] text-muted mt-0.5">{formatDate(locale, a.due_at)}</p>
              )}
            </div>
            {canWrite && (
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={!!a.completed_at}
                  onChange={(e) => onToggle(a.id, e.target.checked)}
                />
                {markDoneLabel}
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  const locale = useLocale();
  const t = useTranslations("admin.crm.activities");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [contactId, setContactId] = useState("");
  const [type, setType] = useState<"call" | "meeting" | "note" | "task">("task");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [actRes, contactsRes] = await Promise.all([
      fetch(`/api/admin/crm/activities?type=task`),
      fetch(`/api/admin/crm/contacts?limit=200`),
    ]);
    if (actRes.ok) setActivities((await actRes.json()).data ?? []);
    if (contactsRes.ok) setContacts((await contactsRes.json()).data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDone(id: string, completed: boolean) {
    await fetch(`/api/admin/crm/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    load();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !contactId) return;
    setSaving(true);
    await fetch("/api/admin/crm/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_id: contactId,
        type,
        title,
        due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
      }),
    });
    setSaving(false);
    setTitle("");
    setDueAt("");
    setShowNew(false);
    load();
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const open = activities.filter((a) => !a.completed_at);
  const overdue = open.filter((a) => a.due_at && new Date(a.due_at) < startOfToday);
  const today = open.filter(
    (a) => a.due_at && new Date(a.due_at) >= startOfToday && new Date(a.due_at) < endOfToday,
  );
  const upcoming = open.filter((a) => !a.due_at || new Date(a.due_at) >= endOfToday);
  const completed = activities.filter((a) => a.completed_at);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        {canWrite && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t("new")}
          </button>
        )}
      </div>

      {showNew && (
        <form
          onSubmit={createTask}
          className="bg-surface border border-line rounded-2xl p-4 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
              required
            >
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
            >
              {(["task", "call", "meeting", "note"] as const).map((tp) => (
                <option key={tp} value={tp}>
                  {t(`types.${tp}`)}
                </option>
              ))}
            </select>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("title")}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
            required
          />
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="text-xs font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {tCommon("save")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-center text-muted text-sm py-8">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-6">
          <ActivitySection
            label={t("overdue")}
            items={overdue}
            tone="danger"
            locale={locale}
            canWrite={canWrite}
            markDoneLabel={t("markDone")}
            onToggle={toggleDone}
          />
          <ActivitySection
            label={t("today")}
            items={today}
            tone="gold"
            locale={locale}
            canWrite={canWrite}
            markDoneLabel={t("markDone")}
            onToggle={toggleDone}
          />
          <ActivitySection
            label={t("upcoming")}
            items={upcoming}
            locale={locale}
            canWrite={canWrite}
            markDoneLabel={t("markDone")}
            onToggle={toggleDone}
          />
          <ActivitySection
            label={t("completed")}
            items={completed}
            locale={locale}
            canWrite={canWrite}
            markDoneLabel={t("markDone")}
            onToggle={toggleDone}
          />
          {activities.length === 0 && (
            <p className="text-center text-muted text-sm py-8">{t("noActivities")}</p>
          )}
        </div>
      )}
    </div>
  );
}
