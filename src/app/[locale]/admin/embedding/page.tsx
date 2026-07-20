"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Config {
  provider: string;
  model: string;
  dimensions: number;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  similarity_threshold: number;
}

const PROVIDERS = [
  { value: "voyage", label: "Voyage AI", available: true },
  { value: "openai", label: "OpenAI", available: false },
  { value: "cohere", label: "Cohere", available: false },
  { value: "google", label: "Google", available: false },
];

const VOYAGE_MODELS = ["voyage-3", "voyage-3-lite", "voyage-large-2"];

export default function EmbeddingPage() {
  const t = useTranslations("admin.embedding");
  const tCommon = useTranslations("admin.common");

  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requiresReindex, setRequiresReindex] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    fetch("/api/admin/embedding-config")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setForm(data);
        setLoading(false);
      });
  }, []);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setForm((f) => f ? { ...f, [key]: value } : f);
  }

  async function save() {
    if (!form) return;
    if (requiresReindex) {
      setShowWarning(true);
      return;
    }
    await doSave();
  }

  async function doSave() {
    if (!form) return;
    setSaving(true);
    setShowWarning(false);
    const res = await fetch("/api/admin/embedding-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setConfig(form);
      setRequiresReindex(data.requiresReindex ?? false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function checkReindex() {
    if (!config || !form) return;
    const changed =
      form.provider !== config.provider ||
      form.model !== config.model ||
      form.dimensions !== config.dimensions;
    setRequiresReindex(changed);
  }

  if (loading || !form) {
    return <p className="text-muted text-sm">{tCommon("loading")}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>

      {requiresReindex && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-400">
          {t("reindexWarning")}
        </div>
      )}

      {showWarning && (
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <p className="text-sm text-fg font-semibold">{t("reindexTitle")}</p>
          <p className="text-sm text-muted">{t("reindexBody")}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowWarning(false)}
              className="px-4 py-2 rounded-xl text-sm text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {tCommon("cancel")}
            </button>
            <button
              onClick={doSave}
              className="px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors"
            >
              {t("saveReindexLater")}
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-xs text-muted mb-2">{t("provider")}</label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  if (p.available) {
                    update("provider", p.value);
                    checkReindex();
                  }
                }}
                disabled={!p.available}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
                  form.provider === p.value
                    ? "border-brand bg-brand/10 text-fg"
                    : "border-line text-muted"
                } ${!p.available ? "opacity-50 cursor-not-allowed" : "hover:border-brand/50"}`}
              >
                <span>{p.label}</span>
                {!p.available && (
                  <span className="text-[10px] text-muted/60 border border-muted/20 rounded-full px-2 py-0.5">
                    {t("soon")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        {form.provider === "voyage" && (
          <div>
            <label className="block text-xs text-muted mb-1">{t("model")}</label>
            <select
              value={form.model}
              onChange={(e) => { update("model", e.target.value); checkReindex(); }}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
            >
              {VOYAGE_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">{t("dimensions")}</label>
            <input
              type="number"
              value={form.dimensions}
              onChange={(e) => { update("dimensions", Number(e.target.value)); checkReindex(); }}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">{t("topK")}</label>
            <input
              type="number"
              value={form.top_k}
              onChange={(e) => update("top_k", Number(e.target.value))}
              min={1}
              max={20}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Chunk config */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">{t("chunkSizeChars")}</label>
            <input
              type="number"
              value={form.chunk_size}
              onChange={(e) => update("chunk_size", Number(e.target.value))}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">{t("chunkOverlapChars")}</label>
            <input
              type="number"
              value={form.chunk_overlap}
              onChange={(e) => update("chunk_overlap", Number(e.target.value))}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Similarity threshold */}
        <div>
          <label className="block text-xs text-muted mb-1">
            {t("similarityThreshold")}: <span className="text-fg">{form.similarity_threshold}</span>
          </label>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={form.similarity_threshold}
            onChange={(e) => update("similarity_threshold", Number(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>0.3 ({t("broader")})</span>
            <span>0.95 ({t("stricter")})</span>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
        >
          {saving ? t("saving") : saved ? t("saved") : requiresReindex ? t("saveAndReindex") : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
