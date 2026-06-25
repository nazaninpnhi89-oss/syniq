"use client";

import { cn } from "@/lib/utils";

interface Props {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: Props) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        dir="auto"
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed font-sans",
          isUser
            ? "bg-brand text-bg rounded-br-sm"
            : "bg-surface text-fg rounded-bl-sm border border-line",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {isStreaming && (
          <span className="inline-block h-4 w-0.5 bg-brand-light animate-pulse ms-0.5" />
        )}
      </div>
    </div>
  );
}
