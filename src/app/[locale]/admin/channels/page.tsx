"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface WidgetConfig {
  color_primary: string;
  position: "left" | "right";
  welcome_message_fa: string;
  welcome_message_en: string;
  allowed_domains: string[];
}

export default function ChannelsPage() {
  const t = useTranslations("admin.channels");
  const tCommon = useTranslations("admin.common");
  const [widget, setWidget] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [broadcast, setBroadcast] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/widget-config")
      .then((r) => r.json())
      .then((data) => {
        setWidget(data);
        setLoading(false);
      });
  }, []);

  function updateWidget<K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) {
    setWidget((w) => w ? { ...w, [key]: value } : w);
  }

  async function saveWidget() {
    if (!widget) return;
    setSaving(true);
    await fetch("/api/admin/widget-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(widget),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addDomain() {
    const d = domainInput.trim().replace(/^https?:\/\//, "").split("/")[0];
    if (!d || !widget) return;
    if (!widget.allowed_domains.includes(d)) {
      updateWidget("allowed_domains", [...widget.allowed_domains, d]);
    }
    setDomainInput("");
  }

  function removeDomain(d: string) {
    updateWidget("allowed_domains", widget!.allowed_domains.filter((x) => x !== d));
  }

  async function sendBroadcast() {
    if (!broadcast.trim()) return;
    setBroadcasting(true);
    const res = await fetch("/api/admin/telegram/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: broadcast }),
    });
    const data = await res.json();
    setBroadcasting(false);
    setBroadcastResult(data);
    setBroadcast("");
  }

  if (loading || !widget) return <p className="text-muted text-sm">{tCommon("loading")}</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Widget config */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">{t("widget")}</h2>
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">{t("colorPrimary")}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={widget.color_primary}
                  onChange={(e) => updateWidget("color_primary", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-line cursor-pointer bg-transparent"
                />
                <input
                  value={widget.color_primary}
                  onChange={(e) => updateWidget("color_primary", e.target.value)}
                  className="flex-1 bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg font-mono focus:outline-none focus:border-brand"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">{t("position")}</label>
              <div className="flex gap-2">
                {(["left", "right"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateWidget("position", p)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                      widget.position === p
                        ? "border-brand bg-brand/10 text-fg"
                        : "border-line text-muted hover:border-brand/40"
                    }`}
                  >
                    {p === "left" ? t("positionLeft") : t("positionRight")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">{t("welcomeMessageFa")}</label>
            <input
              value={widget.welcome_message_fa}
              onChange={(e) => updateWidget("welcome_message_fa", e.target.value)}
              dir="rtl"
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">{t("welcomeMessageEn")}</label>
            <input
              value={widget.welcome_message_en}
              onChange={(e) => updateWidget("welcome_message_en", e.target.value)}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
            />
          </div>

          {/* Allowed domains */}
          <div>
            <label className="block text-xs text-muted mb-2">{t("allowedDomainsHint")}</label>
            <div className="flex gap-2 mb-2">
              <input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDomain()}
                placeholder={t("domainPlaceholder")}
                className="flex-1 bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand"
              />
              <button
                onClick={addDomain}
                className="px-4 py-2 rounded-xl bg-brand/20 text-brand text-sm font-medium hover:bg-brand/30 transition-colors"
              >
                {t("add")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {widget.allowed_domains.map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-1.5 text-xs bg-surface-2 border border-line rounded-full px-3 py-1"
                >
                  {d}
                  <button onClick={() => removeDomain(d)} className="text-muted hover:text-red-400 transition-colors">
                    ×
                  </button>
                </span>
              ))}
              {widget.allowed_domains.length === 0 && (
                <span className="text-xs text-muted">{t("allDomainsAllowed")}</span>
              )}
            </div>
          </div>

          <button
            onClick={saveWidget}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
          >
            {saving ? t("saving") : saved ? t("saved") : t("saveWidgetConfig")}
          </button>
        </div>
      </section>

      {/* Telegram broadcast */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">{t("telegram")} · {t("broadcast")}</h2>
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <p className="text-xs text-muted">{t("broadcastDesc")}</p>
          <textarea
            value={broadcast}
            onChange={(e) => setBroadcast(e.target.value)}
            rows={4}
            className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand resize-none"
            placeholder={t("broadcastPlaceholder")}
          />
          {broadcastResult && (
            <p className="text-sm text-muted">
              {t("sent")}: <span className="text-green-400">{broadcastResult.sent}</span>
              {" · "}{t("failed")}: <span className="text-red-400">{broadcastResult.failed}</span>
            </p>
          )}
          <button
            onClick={sendBroadcast}
            disabled={broadcasting || !broadcast.trim()}
            className="px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
          >
            {broadcasting ? t("sending") : t("broadcastSend")}
          </button>
        </div>
      </section>
    </div>
  );
}
