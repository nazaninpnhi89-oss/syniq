"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChatWindow } from "./chat-window";
import { cn } from "@/lib/utils";

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("chat");
  const isRtl = locale === "fa";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("close") : t("title")}
        className={cn(
          "fixed bottom-6 z-50 w-14 h-14 rounded-full",
          "bg-gradient-to-b from-brand-light to-brand text-bg",
          "shadow-[0_8px_30px_-8px_rgba(61,178,236,0.6)]",
          "flex items-center justify-center transition-all",
          "hover:scale-105 active:scale-95",
          isRtl ? "left-6" : "right-6",
        )}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-5 h-5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-24 z-50",
          "w-[380px] h-[580px] max-h-[80vh]",
          "rounded-2xl overflow-hidden border border-line",
          "shadow-[0_20px_60px_-12px_rgba(0,0,0,0.7)]",
          "transition-all duration-300 origin-bottom",
          isRtl ? "left-6" : "right-6",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
          // Mobile: full-width
          "max-sm:left-3 max-sm:right-3 max-sm:w-auto",
        )}
      >
        <ChatWindow
          locale={locale}
          source="widget"
          t={{
            title: t("title"),
            placeholder: t("placeholder"),
            send: t("send"),
            thinking: t("thinking"),
            newChat: t("newChat"),
            poweredBy: t("poweredBy"),
            greeting: t("greeting"),
          }}
        />
      </div>
    </>
  );
}
