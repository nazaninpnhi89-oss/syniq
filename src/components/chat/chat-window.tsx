"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  locale: string;
  source: "web" | "widget";
  t: {
    title: string;
    placeholder: string;
    send: string;
    thinking: string;
    newChat: string;
    poweredBy: string;
    greeting: string;
  };
}

const SESSION_KEY = "syniq_session_id";

export function ChatWindow({ locale, source, t }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "greeting", role: "assistant", content: t.greeting },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(SESSION_KEY);
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isWidget = source === "widget";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    };
    const assistantMsgId = `a_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantMsgId, role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId ?? undefined,
          locale,
          source,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Chat request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "session") {
              setSessionId(evt.id);
              localStorage.setItem(SESSION_KEY, evt.id);
            } else if (evt.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + evt.content }
                    : m,
                ),
              );
            } else if (evt.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, streaming: false } : m,
                ),
              );
            } else if (evt.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content:
                          locale === "fa"
                            ? "خطایی رخ داد. لطفاً دوباره تلاش کنید."
                            : "Something went wrong. Please try again.",
                        streaming: false,
                      }
                    : m,
                ),
              );
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  locale === "fa"
                    ? "متأسفم، مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
                    : "Sorry, something went wrong. Please try again.",
                streaming: false,
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, sessionId, locale, source]);

  function resetChat() {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([{ id: "greeting", role: "assistant", content: t.greeting }]);
  }

  const isRtl = locale === "fa";

  return (
    <div
      className={cn(
        "flex flex-col bg-bg font-sans",
        isWidget ? "h-full" : "h-screen",
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-bg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-fg leading-none">SYNIQ AI</p>
            <p className="text-xs text-muted mt-0.5">{t.title}</p>
          </div>
        </div>
        <button
          onClick={resetChat}
          title={t.newChat}
          className="text-muted hover:text-fg transition-colors p-1.5 rounded-lg hover:bg-surface-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={
              msg.streaming && !msg.content
                ? `${t.thinking}...`
                : msg.content
            }
            isStreaming={msg.streaming}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
        disabled={isStreaming}
        placeholder={t.placeholder}
        sendLabel={t.send}
        locale={locale}
      />

      {/* Footer */}
      <p className="text-center text-[11px] text-muted/60 py-1.5 shrink-0">
        {t.poweredBy}
      </p>
    </div>
  );
}
