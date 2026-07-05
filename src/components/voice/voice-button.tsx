"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const AGENT_ID = "agent_0501kwpgjqxbf3xvj6fa4xtp5mn6";

export function VoiceButton({ dir }: { dir: "ltr" | "rtl" }) {
  const hostRef = useRef<HTMLElement | null>(null);
  const isRtl = dir === "rtl";
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let observer: MutationObserver | null = null;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      const root = host.shadowRoot;
      const button = root?.querySelector("button");
      if (!button) {
        setTimeout(attach, 200);
        return;
      }
      const sync = () => setInCall(button.getAttribute("aria-label") === "End");
      sync();
      observer = new MutationObserver(sync);
      observer.observe(button, { attributes: true, attributeFilter: ["aria-label"] });
    };
    attach();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  const handleClick = () => {
    const button = hostRef.current?.shadowRoot?.querySelector("button");
    button?.click();
  };

  return (
    <>
      {/*
        The real widget has no public JS API to start a call (verified by
        reading its bundle) — only its own button does. So it stays mounted
        and functional, just visually hidden; this button forwards real
        clicks to its actual <button> so the call flow keeps working while
        we get pixel-parity with ChatBubble's circle.
      */}
      <div
        aria-hidden
        style={{ position: "fixed", inset: "auto -9999px -9999px auto", opacity: 0, pointerEvents: "none" }}
      >
        <elevenlabs-convai
          ref={hostRef}
          agent-id={AGENT_ID}
          variant="tiny"
          text-input="false"
        />
      </div>

      <button
        onClick={handleClick}
        aria-label={inCall ? "End call" : "Start call"}
        className={cn(
          "fixed bottom-24 z-50 w-14 h-14 rounded-full",
          "bg-gradient-to-b from-brand-light to-brand text-bg",
          "shadow-[0_8px_30px_-8px_rgba(61,178,236,0.6)]",
          "flex items-center justify-center transition-all",
          "hover:scale-105 active:scale-95",
          isRtl ? "left-6" : "right-6",
        )}
      >
        {inCall ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 9c-1.6 0-3.1.3-4.5.8-.4.2-.7.5-.7 1v3.1c0 .4.3.8.7 1 .4.1.7.3.9.6.2.4.3.8.2 1.2l-.4 1.7c-.1.5-.5.9-1 1-3.2.7-6-1.9-6-5.1V9C1.2 4 6 1 12 1s10.8 3 10.8 8v4.3c0 3.2-2.8 5.8-6 5.1-.5-.1-.9-.5-1-1l-.4-1.7c-.1-.4 0-.8.2-1.2.2-.3.5-.5.9-.6.4-.2.7-.6.7-1v-3.1c0-.5-.3-.8-.7-1C15.1 9.3 13.6 9 12 9z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.6c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1.1l-2 2.1z" />
          </svg>
        )}
      </button>
    </>
  );
}
