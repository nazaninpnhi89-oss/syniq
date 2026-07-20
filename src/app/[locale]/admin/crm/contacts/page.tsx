"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useCanWrite } from "@/lib/admin/role-context";

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  company: { id: string; name: string } | null;
}

export default function ContactsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.crm.contacts");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/crm/contacts?limit=100${query ? `&q=${encodeURIComponent(query)}` : ""}`);
    if (res.ok) {
      const body = await res.json();
      setContacts(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(q), 300);
    return () => clearTimeout(timer);
  }, [q, load]);

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: newName, email: newEmail || undefined, phone: newPhone || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setShowNew(false);
      load(q);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {canWrite && (
            <button
              onClick={() => setShowNew((v) => !v)}
              className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
            >
              {t("new")}
            </button>
          )}
        </div>
      </div>

      {showNew && (
        <form
          onSubmit={createContact}
          className="bg-surface border border-line rounded-2xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="space-y-1">
            <label className="text-xs text-muted">{t("name")}</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">{t("email")}</label>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">{t("phone")}</label>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="text-xs font-medium bg-brand text-white px-4 py-1.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {tCommon("save")}
          </button>
        </form>
      )}

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("company")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("email")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("phone")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("source")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contacts.map((c) => (
                <tr key={c.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/${locale}/admin/crm/contacts/${c.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.company ? (
                      <Link
                        href={`/${locale}/admin/crm/companies/${c.company.id}`}
                        className="hover:text-brand hover:underline"
                      >
                        {c.company.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{c.source ?? "—"}</td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    {t("noContacts")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
