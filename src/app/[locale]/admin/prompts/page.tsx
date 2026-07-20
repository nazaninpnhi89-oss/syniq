"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/format";

interface PromptVersion {
  id: string;
  content: string;
  persona: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromptsPage() {
  const locale = useLocale();
  const t = useTranslations("admin.prompts");
  const tCommon = useTranslations("admin.common");

  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newPersona, setNewPersona] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/prompt-versions");
    if (res.ok) setVersions(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function activate(id: string) {
    setActivating(id);
    await fetch(`/api/admin/prompt-versions/${id}/activate`, { method: "POST" });
    setActivating(null);
    load();
  }

  async function create() {
    if (!newContent.trim()) return;
    setCreating(true);
    await fetch("/api/admin/prompt-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, persona: newPersona || undefined }),
    });
    setCreating(false);
    setShowNew(false);
    setNewContent("");
    setNewPersona("");
    load();
  }

  const selectedVersion = versions.find((v) => v.id === selectedId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors"
        >
          + {t("newVersion")}
        </button>
      </div>

      <div className="text-xs text-muted bg-surface border border-line rounded-xl px-4 py-3">
        {t("templateVars")}
      </div>

      {showNew && (
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-fg">{t("newVersionTitle")}</h3>
          <div>
            <label className="block text-xs text-muted mb-1">{t("persona")}</label>
            <input
              value={newPersona}
              onChange={(e) => setNewPersona(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand"
              placeholder={t("personaPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">{t("contentLabel")}</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={12}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand resize-none font-mono"
              placeholder={t("contentPlaceholder")}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-xl text-sm text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {tCommon("cancel")}
            </button>
            <button
              onClick={create}
              disabled={creating || !newContent.trim()}
              className="px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
            >
              {creating ? t("creating") : t("createInactive")}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-5">
        {/* Version list */}
        <div className="w-64 shrink-0 space-y-2">
          {loading ? (
            <p className="text-sm text-muted">{tCommon("loading")}</p>
          ) : (
            versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`w-full text-start px-4 py-3 rounded-xl border transition-colors ${
                  selectedId === v.id
                    ? "border-brand bg-brand/10"
                    : "border-line hover:border-brand/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted">{v.id.slice(0, 8)}</span>
                  {v.is_active && (
                    <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                      {t("active")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {formatDate(locale, v.created_at)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1">
          {selectedVersion ? (
            <div className="bg-surface border border-line rounded-2xl p-5 space-y-4 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted mb-0.5">{t("version")} {selectedVersion.id.slice(0, 8)}</p>
                  {selectedVersion.persona && (
                    <p className="text-xs text-brand">{t("personaLabel")}: {selectedVersion.persona}</p>
                  )}
                </div>
                {!selectedVersion.is_active && (
                  <button
                    onClick={() => activate(selectedVersion.id)}
                    disabled={activating === selectedVersion.id}
                    className="px-4 py-2 rounded-xl bg-brand/20 text-brand text-sm font-medium hover:bg-brand/30 transition-colors disabled:opacity-50"
                  >
                    {activating === selectedVersion.id ? t("activating") : t("activate")}
                  </button>
                )}
                {selectedVersion.is_active && (
                  <span className="text-xs text-green-400 bg-green-500/15 px-3 py-1.5 rounded-xl">
                    {t("currentlyActive")}
                  </span>
                )}
              </div>
              <pre className="text-xs text-muted font-mono whitespace-pre-wrap bg-bg border border-line rounded-xl p-4 overflow-auto max-h-96">
                {selectedVersion.content}
              </pre>
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-2xl flex items-center justify-center h-48">
              <p className="text-sm text-muted">{t("selectVersion")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
