"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const locale = useLocale();
  const t = useTranslations("admin.crm.assistant");

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const message = input.trim();
    if (!message || pending) return;
    setError(null);
    setInput("");
    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setPending(true);

    const res = await fetch("/api/admin/crm/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: messages, locale }),
    });
    const body = await res.json();
    setPending(false);
    if (body.error) {
      setError(body.error);
      return;
    }
    setMessages([...nextMessages, { role: "assistant", content: body.reply }]);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <h2 className="text-sm font-semibold text-fg mb-3">{t("title")}</h2>

      <div className="flex-1 overflow-y-auto space-y-3 bg-surface border border-line rounded-2xl p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ms-auto bg-brand text-white"
                : "me-auto bg-surface-2 text-fg/90"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && <p className="text-xs text-muted">…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          className="flex-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-medium bg-brand text-white px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {t("send")}
        </button>
      </form>
    </div>
  );
}
