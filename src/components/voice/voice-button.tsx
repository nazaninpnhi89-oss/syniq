"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type ConvaiElement = HTMLElement & {
  startConversation?: () => Promise<void> | void;
  endConversation?: () => Promise<void> | void;
};

export function VoiceButton() {
  const locale = useLocale();
  const isRtl = locale === "fa";
  const [inCall, setInCall] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const toggle = async () => {
    setError(null);

    if (inCall) {
      const widget = document.querySelector("elevenlabs-convai") as ConvaiElement | null;
      await widget?.endConversation?.();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        isRtl
          ? "این مرورگر داخلی (مثلاً تلگرام) اجازه دسترسی به میکروفون را نمی‌دهد. لینک را در Safari یا Chrome باز کنید."
          : "This in-app browser (e.g. Telegram) doesn't allow microphone access. Open the link in Safari or Chrome instead.",
      );
      return;
    }

    // Request mic access ourselves first, as close to the click as possible.
    // This surfaces the *real* browser error (denied / no device / blocked
    // by an in-app browser) instead of relying on the widget's own handling,
    // which can swallow the failure and leave the button doing nothing.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const name = err instanceof Error ? err.name : "UnknownError";
      setError(
        (isRtl
          ? "دسترسی به میکروفون رد شد. اگر از داخل تلگرام باز کردی، لینک را در Safari یا Chrome باز کن."
          : "Microphone access was denied. If you opened this from Telegram, open the link in Safari or Chrome instead.") +
          ` (${name})`,
      );
      return;
    }

    // The widget script loads async; wait for the custom element to upgrade
    // before calling its methods, otherwise a fast tap right after page load
    // silently no-ops.
    await customElements.whenDefined("elevenlabs-convai").catch(() => {});

    const widget = document.querySelector("elevenlabs-convai") as ConvaiElement | null;
    if (!widget || typeof widget.startConversation !== "function") {
      setError(
        isRtl
          ? "ویجت صوتی هنوز بارگذاری نشده. چند ثانیه صبر کن و دوباره امتحان کن."
          : "The voice widget hasn't loaded yet. Wait a moment and try again.",
      );
      return;
    }

    try {
      await widget.startConversation?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        (isRtl ? "شروع تماس با خطا مواجه شد: " : "Failed to start the call: ") + message,
      );
    }
  };

  return (
    <>
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

      {error && (
        <div
          role="alert"
          className={cn(
            "fixed bottom-[10.5rem] z-50 max-w-[240px] text-xs leading-relaxed",
            "bg-bg border border-line text-fg rounded-xl px-3 py-2 shadow-lg",
            isRtl ? "left-6 text-right" : "right-6 text-left",
          )}
        >
          {error}
        </div>
      )}
    </>
  );
}
