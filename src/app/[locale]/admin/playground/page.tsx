"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface PlaygroundResult {
  response: string;
  messageId?: string;
  sources: Array<{ id: string; title: string; similarity: number }>;
  modelUsed?: string;
  tokensIn?: number;
  tokensOut?: number;
}

const CHANNELS = ["web", "widget", "telegram"];
const LOCALES = ["fa", "en"];

export default function PlaygroundPage() {
  const t = useTranslations("admin.playground");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("web");
  const [locale, setLocale] = useState("fa");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/admin/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, channel, locale }),
    });

    setSending(false);

    if (!res.ok) {
      setError(t("errorGeneric"));
      return;
    }

    setResult(await res.json());
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Left: Input */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-fg">{t("title")}</h2>
          <div className="flex gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">{t("channel")}</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="bg-surface border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">{t("locale")}</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="bg-surface border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">{t("message")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              rows={8}
              dir="auto"
              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand resize-none"
              placeholder={t("messagePlaceholder")}
            />
            <p className="text-[10px] text-muted mt-1">{t("cmdEnterHint")}</p>
          </div>

          <button
            onClick={send}
            disabled={sending || !message.trim()}
            className="w-full py-2.5 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
          >
            {sending ? t("processing") : t("send")}
          </button>
        </div>

        {/* Right: Result */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-fg">{t("response")}</h2>

          {sending && (
            <div className="bg-surface border border-line rounded-xl p-4 min-h-[120px] flex items-center justify-center">
              <p className="text-sm text-muted animate-pulse">{t("processing")}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-[11px] text-muted">
                {result.modelUsed && (
                  <span className="bg-surface border border-line rounded-full px-2.5 py-1">
                    {result.modelUsed}
                  </span>
                )}
                {result.tokensIn !== undefined && (
                  <span className="bg-surface border border-line rounded-full px-2.5 py-1">
                    {result.tokensIn} {t("tokensInOut").split(" / ")[0]} / {result.tokensOut} {t("tokensInOut").split(" / ")[1]}
                  </span>
                )}
              </div>

              {/* Response text */}
              <div className="bg-surface border border-line rounded-xl p-4 text-sm text-fg whitespace-pre-wrap" dir="auto">
                {result.response}
              </div>

              {/* Sources */}
              {result.sources?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-2">{t("sources")} ({result.sources.length})</p>
                  <div className="space-y-1.5">
                    {result.sources.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-surface border border-line rounded-lg px-3 py-2"
                      >
                        <span className="text-muted truncate">{s.title || `#${i + 1}`}</span>
                        <span className="text-muted/60 shrink-0 ms-2">{Math.round(s.similarity * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!sending && !result && !error && (
            <div className="bg-surface border border-line rounded-xl p-4 min-h-[120px] flex items-center justify-center">
              <p className="text-sm text-muted">{t("responseWillAppear")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
