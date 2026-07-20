"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  contactId: string;
  dealId?: string;
  addNoteLabel: string;
  addTaskLabel: string;
  saveLabel: string;
  cancelLabel: string;
}

export function AddTimelineEntry({
  contactId,
  dealId,
  addNoteLabel,
  addTaskLabel,
  saveLabel,
  cancelLabel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<"note" | "task" | null>(null);
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!open) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          deal_id: dealId,
          type: open,
          title: open === "note" ? "Note" : "Task",
          body: body || undefined,
          due_at: open === "task" && dueAt ? new Date(dueAt).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setBody("");
        setDueAt("");
        setOpen(null);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setOpen("note")}
          className="text-xs text-brand hover:underline"
        >
          {addNoteLabel}
        </button>
        <button
          onClick={() => setOpen("task")}
          className="text-xs text-brand hover:underline"
        >
          {addTaskLabel}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 bg-surface-2 border border-line rounded-xl p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
        autoFocus
      />
      {open === "task" && (
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-brand"
        />
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(null)}
          className="text-xs text-muted hover:text-fg px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {saveLabel}
        </button>
      </div>
    </form>
  );
}
