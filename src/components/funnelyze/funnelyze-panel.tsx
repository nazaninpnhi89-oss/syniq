"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { onFunnelyzePanelToggle } from "@/lib/funnelyze-panel";

const FUNNELYZE_URL = "https://funnelyze-sand.vercel.app";

export function FunnelyzePanel() {
  const [open, setOpen] = useState(false);
  const iframeSrcSet = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const locale = useLocale();
  const t = useTranslations("funnelyze");
  const isRtl = locale === "fa";

  useEffect(() => {
    return onFunnelyzePanelToggle(() => setOpen((v) => !v));
  }, []);

  useEffect(() => {
    if (open && !iframeSrcSet.current && iframeRef.current) {
      iframeRef.current.src = `${FUNNELYZE_URL}/${locale}`;
      iframeSrcSet.current = true;
    }
  }, [open, locale]);

  return (
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
        "max-sm:left-3 max-sm:right-3 max-sm:w-auto",
      )}
    >
      <button
        onClick={() => setOpen(false)}
        aria-label={t("close")}
        className={cn(
          "absolute top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-bg/80 text-fg backdrop-blur-sm hover:bg-bg",
          isRtl ? "left-2" : "right-2",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <iframe
        ref={iframeRef}
        title={t("title")}
        className="h-full w-full border-none"
      />
    </div>
  );
}
