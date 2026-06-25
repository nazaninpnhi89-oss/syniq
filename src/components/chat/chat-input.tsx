"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder: string;
  sendLabel: string;
  locale: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
  sendLabel,
  locale,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRtl = locale === "fa";

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2 border-t border-line bg-bg px-4 py-3",
        isRtl && "flex-row-reverse",
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={placeholder}
        dir="auto"
        className={cn(
          "flex-1 resize-none bg-surface rounded-xl px-4 py-2.5 text-sm text-fg placeholder:text-muted font-sans",
          "border border-line focus:outline-none focus:border-brand-light transition-colors",
          "min-h-[44px] max-h-40 leading-relaxed",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label={sendLabel}
        className={cn(
          "shrink-0 h-11 w-11 rounded-full flex items-center justify-center",
          "bg-gradient-to-b from-brand-light to-brand text-bg",
          "transition-all hover:opacity-90 active:scale-95",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "shadow-[0_6px_20px_-6px_rgba(61,178,236,0.5)]",
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={cn("w-5 h-5", isRtl ? "rotate-180" : "")}
        >
          <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
        </svg>
      </button>
    </div>
  );
}
