"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type ConvaiElement = HTMLElement & {
  startConversation?: () => void;
  endConversation?: () => void;
};

export function VoiceButton() {
  const locale = useLocale();
  const isRtl = locale === "fa";
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    const widget = document.querySelector("elevenlabs-convai") as ConvaiElement | null;
    if (!widget) return;

    const onStart = () => setInCall(true);
    const onEnd = () => setInCall(false);
    widget.addEventListener("conversationStarted", onStart);
    widget.addEventListener("conversationEnded", onEnd);
    return () => {
      widget.removeEventListener("conversationStarted", onStart);
      widget.removeEventListener("conversationEnded", onEnd);
    };
  }, []);

  const toggle = () => {
    const widget = document.querySelector("elevenlabs-convai") as ConvaiElement | null;
    if (!widget) return;
    if (inCall) widget.endConversation?.();
    else widget.startConversation?.();
  };

  return (
    <button
      onClick={toggle}
      aria-label="Voice agent"
      className={cn(
        "fixed bottom-24 z-50 w-14 h-14 rounded-full",
        "bg-gradient-to-b from-brand-light to-brand text-bg",
        "shadow-[0_8px_30px_-8px_rgba(61,178,236,0.6)]",
        "flex items-center justify-center transition-all",
        "hover:scale-105 active:scale-95",
        isRtl ? "left-6" : "right-6",
        inCall && "animate-pulse",
      )}
    >
      {inCall ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-5 h-5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.5 6.5l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.8z" />
        </svg>
      )}
    </button>
  );
}
