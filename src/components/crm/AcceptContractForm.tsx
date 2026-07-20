"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptContractPublic } from "@/lib/crm/contracts";

interface Props {
  shareToken: string;
  label: string;
  namePlaceholder: string;
  submitLabel: string;
}

export function AcceptContractForm({ shareToken, label, namePlaceholder, submitLabel }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await acceptContractPublic({ shareToken, acceptedByName: name.trim() });
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="print:hidden bg-surface border border-line rounded-2xl p-5 space-y-3"
    >
      <p className="text-sm text-fg">{label}</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={namePlaceholder}
        className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
        required
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
