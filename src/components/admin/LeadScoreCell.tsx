"use client";

import { useState, useTransition } from "react";
import { scoreLead } from "@/lib/crm/ai-lead-score";

interface Props {
  locale: string;
  leadId: string;
  score: number | null;
  rationale: string | null;
  scoreLabel: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-green-500/15 text-green-400";
  if (score >= 40) return "bg-yellow-500/15 text-yellow-400";
  return "bg-red-500/15 text-red-400";
}

export function LeadScoreCell({ locale, leadId, score, rationale, scoreLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState({ score, rationale });
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await scoreLead(leadId, locale);
      if (res?.error) {
        setError(res.error);
      } else if (res?.ok) {
        setCurrent({ score: res.score, rationale: res.rationale });
      }
    });
  }

  if (current.score != null) {
    return (
      <span
        title={current.rationale ?? undefined}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${scoreColor(current.score)}`}
      >
        {current.score}
      </span>
    );
  }

  return (
    <button
      onClick={run}
      disabled={pending}
      className="text-xs text-brand hover:underline disabled:opacity-50"
    >
      {error ?? (pending ? "…" : scoreLabel)}
    </button>
  );
}
