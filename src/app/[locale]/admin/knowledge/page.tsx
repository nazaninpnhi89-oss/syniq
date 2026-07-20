"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatDate } from "@/lib/format";

interface Doc {
  id: string;
  title: string;
  source_type: string;
  status: string;
  tags: string[] | null;
  created_at: string;
}

interface FormState {
  title: string;
  content: string;
  source_type: string;
  source_url: string;
  tags: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  source_type: "manual",
  source_url: "",
  tags: "",
};

export default function KnowledgePage() {
  const locale = useLocale();
  const t = useTranslations("admin.knowledge");
  const tCommon = useTranslations("admin.common");

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documents");
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    const body = {
      title: form.title,
      content: form.content || undefined,
      source_type: form.source_type,
      source_url: form.source_url || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };
    const res = await fetch(
      editId ? `/api/admin/documents/${editId}` : "/api/admin/documents",
      {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      load();
    }
  }

  async function ingest(id: string) {
    setIngestingId(id);
    await fetch(`/api/admin/documents/${id}/ingest`, { method: "POST" });
    setIngestingId(null);
    setTimeout(load, 1000);
  }

  async function deleteDoc(id: string) {
    await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  function startEdit(doc: Doc) {
    setForm({
      title: doc.title,
      content: "",
      source_type: doc.source_type,
      source_url: "",
      tags: doc.tags?.join(", ") ?? "",
    });
    setEditId(doc.id);
    setShowForm(true);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors"
        >
          + {t("addDocument")}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-fg">{editId ? t("editDocument") : t("addDocument")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">{t("titleLabel")}</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand"
                placeholder={t("titlePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">{t("typeLabel")}</label>
              <select
                value={form.source_type}
                onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value }))}
                className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
              >
                <option value="manual">{t("typeManual")}</option>
                <option value="url">{t("typeUrl")}</option>
                <option value="pdf">{t("typePdf")}</option>
                <option value="word">{t("typeWord")}</option>
              </select>
            </div>
          </div>
          {form.source_type === "url" && (
            <div>
              <label className="block text-xs text-muted mb-1">{t("sourceUrl")}</label>
              <input
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand"
                placeholder={t("urlPlaceholder")}
              />
            </div>
          )}
          {form.source_type === "manual" && (
            <div>
              <label className="block text-xs text-muted mb-1">{t("docContent")}</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
                className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand resize-none"
                placeholder={t("contentPlaceholder")}
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-muted mb-1">{t("tagsLabel")}</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand"
              placeholder={t("tagsPlaceholder")}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-xl text-sm text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {tCommon("cancel")}
            </button>
            <button
              onClick={save}
              disabled={saving || !form.title.trim()}
              className="px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
            >
              {saving ? t("saving") : tCommon("save")}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("docTitle")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("docType")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("docStatus")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("docTags")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("createdAt")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {docs.map((doc) => (
                <tr key={doc.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium">{doc.title}</td>
                  <td className="px-4 py-3 text-muted">{doc.source_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} label={t(`statuses.${doc.status}`)} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {doc.tags?.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(locale, doc.created_at, { dateStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => ingest(doc.id)}
                        disabled={ingestingId === doc.id}
                        className="text-xs text-brand hover:text-brand-light transition-colors disabled:opacity-50"
                      >
                        {ingestingId === doc.id ? t("queued") : t("ingestNow")}
                      </button>
                      <button
                        onClick={() => startEdit(doc)}
                        className="text-xs text-muted hover:text-fg transition-colors"
                      >
                        {t("edit")}
                      </button>
                      <button
                        onClick={() => setDeleteId(doc.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {t("noDocumentsHint")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t("deleteTitle")}
        message={t("deleteMessage")}
        confirmLabel={t("delete")}
        cancelLabel={tCommon("cancel")}
        danger
        onConfirm={() => deleteId && deleteDoc(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
