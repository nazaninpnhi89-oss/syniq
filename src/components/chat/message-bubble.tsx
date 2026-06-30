"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface RagSource {
  id: string;
  title: string;
  similarity: number;
}

interface FeedbackT {
  sources: string;
  helpful: string;
  notHelpful: string;
  feedbackThanks: string;
}

interface Props {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  messageId?: string;
  sources?: RagSource[];
  feedbackGiven?: 1 | -1;
  onFeedback?: (messageId: string, rating: 1 | -1) => void;
  locale?: string;
  feedbackT?: FeedbackT;
}

export function MessageBubble({
  role,
  content,
  isStreaming,
  messageId,
  sources,
  feedbackGiven,
  onFeedback,
  locale,
  feedbackT,
}: Props) {
  const isUser = role === "user";
  const [showSources, setShowSources] = useState(false);
  const isRtl = locale === "fa";

  const hasSources = (sources?.length ?? 0) > 0;
  const showFeedbackRow = !isUser && !isStreaming && (Boolean(messageId) || hasSources);

  return (
    <div className={cn("flex w-full flex-col gap-1", isUser ? "items-end" : "items-start")}>
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

      {showFeedbackRow && (
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isRtl ? "flex-row-reverse" : "flex-row",
          )}
        >
          {hasSources && (
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-fg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
              {feedbackT?.sources ?? "Sources"} ({sources!.length})
            </button>
          )}

          {messageId && (
            <div className="flex items-center gap-1">
              {feedbackGiven ? (
                <span className="text-[11px] text-muted">
                  {feedbackT?.feedbackThanks ?? "Thanks!"}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => onFeedback?.(messageId, 1)}
                    aria-label={feedbackT?.helpful ?? "Helpful"}
                    className="p-1 rounded text-muted hover:text-brand transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      className="w-3.5 h-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.909m14.383-9.098a.234.234 0 0 1-.015-.087m.015.087-.007.01a.26.26 0 0 1-.008.01"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onFeedback?.(messageId, -1)}
                    aria-label={feedbackT?.notHelpful ?? "Not helpful"}
                    className="p-1 rounded text-muted hover:text-red-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      className="w-3.5 h-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showSources && hasSources && (
        <div className="max-w-[80%] ms-1 mt-0.5 space-y-1">
          {sources!.map((src, i) => (
            <div
              key={src.id ?? i}
              className="flex items-center gap-2 text-[11px] text-muted bg-surface border border-line rounded-lg px-3 py-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="w-3 h-3 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              <span className="truncate flex-1">{src.title || `Document ${i + 1}`}</span>
              <span className="shrink-0 text-muted/60">
                {Math.round(src.similarity * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
