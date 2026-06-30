"use client";

import { useEffect, useState } from "react";

interface ChannelConfig {
  channel: string;
  active_model: string;
  temperature: number;
  max_tokens: number;
}

const OPENROUTER_MODELS = [
  { slug: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5 (Fast)" },
  { slug: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { slug: "anthropic/claude-opus-4-8", label: "Claude Opus 4.8 (Powerful)" },
  { slug: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { slug: "openai/gpt-4o", label: "GPT-4o" },
  { slug: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
  { slug: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
  { slug: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { slug: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B" },
];

const CHANNELS = ["default", "web", "widget", "telegram"];

export default function ModelsPage() {
  const [configs, setConfigs] = useState<Record<string, ChannelConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/model-config")
      .then((r) => r.json())
      .then((data: ChannelConfig[]) => {
        const map: Record<string, ChannelConfig> = {};
        for (const ch of CHANNELS) {
          const found = data.find((d) => d.channel === ch);
          map[ch] = found ?? {
            channel: ch,
            active_model: "anthropic/claude-haiku-4-5",
            temperature: 0.7,
            max_tokens: 1024,
          };
        }
        setConfigs(map);
        setLoading(false);
      });
  }, []);

  function update(channel: string, key: keyof ChannelConfig, value: string | number) {
    setConfigs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [key]: value },
    }));
  }

  async function save(channel: string) {
    setSaving(channel);
    const cfg = configs[channel];
    await fetch("/api/admin/model-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setSaving(null);
    setSaved(channel);
    setTimeout(() => setSaved(null), 2000);
  }

  if (loading) return <p className="text-muted text-sm">Loading…</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-fg">Model Config</h2>
      <div className="grid gap-5">
        {CHANNELS.map((ch) => {
          const cfg = configs[ch];
          if (!cfg) return null;
          return (
            <div key={ch} className="bg-surface border border-line rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-fg capitalize">{ch} channel</h3>
                {ch === "default" && (
                  <span className="text-[10px] text-muted border border-line rounded-full px-2 py-0.5">
                    Fallback for unspecified channels
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Model</label>
                  <select
                    value={cfg.active_model}
                    onChange={(e) => update(ch, "active_model", e.target.value)}
                    className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
                  >
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m.slug} value={m.slug}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">
                    Temperature: <span className="text-fg">{cfg.temperature}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={cfg.temperature}
                    onChange={(e) => update(ch, "temperature", Number(e.target.value))}
                    className="w-full accent-brand mt-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={cfg.max_tokens}
                    onChange={(e) => update(ch, "max_tokens", Number(e.target.value))}
                    min={128}
                    max={8192}
                    step={128}
                    className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <button
                onClick={() => save(ch)}
                disabled={saving === ch}
                className="px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
              >
                {saving === ch ? "Saving…" : saved === ch ? "Saved!" : "Save"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
