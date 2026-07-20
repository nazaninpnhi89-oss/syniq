"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContract } from "@/lib/crm/contracts";

interface Contact {
  id: string;
  full_name: string;
}

interface Props {
  locale: string;
  onClose: () => void;
  t: Record<string, string>;
  tCommon: Record<string, string>;
}

export function NewContractModal({ locale, onClose, t, tCommon }: Props) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [scope, setScope] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/crm/contacts?limit=200")
      .then((r) => r.json())
      .then((body) => setContacts(body.data ?? []));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !title.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createContract({
        locale,
        contactId,
        title,
        amountToman: amount ? parseInt(amount, 10) : undefined,
        scope: scope || undefined,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
      router.push(`/${locale}/admin/crm/contracts/${res.id}`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form
        onSubmit={submit}
        className="bg-surface border border-line rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-3"
      >
        <h3 className="text-sm font-semibold text-fg">{t.new}</h3>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
          required
        >
          <option value="">{t.contact}</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.title}
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
          required
        />
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t.amount}
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
        />
        <textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder={t.scope}
          rows={3}
          className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-fg px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
          >
            {tCommon.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {tCommon.save}
          </button>
        </div>
      </form>
    </div>
  );
}
