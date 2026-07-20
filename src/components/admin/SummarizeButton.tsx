"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { summarizeConversation } from "@/lib/crm/ai-summarize";

interface Props {
  locale: string;
  contactId: string;
  label: string;
}

export function SummarizeButton({ locale, contactId, label }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await summarizeConversation(contactId, locale);
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={pending}
        className="text-xs text-brand hover:underline disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
