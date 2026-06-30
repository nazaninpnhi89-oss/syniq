"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface Session {
  id: string;
  source: string;
  locale: string;
  status: string;
  created_at: string;
}

export default function HandoffPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/conversations?status=handed_off&limit=50");
    if (res.ok) setSessions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(sessionId: string) {
    setResolving(sessionId);
    await fetch("/api/admin/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, status: "closed" }),
    });
    setResolving(null);
    load();
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h2 className="text-sm font-semibold text-fg">Handoff Queue</h2>
      <p className="text-sm text-muted">
        Sessions where the AI requested human support. Resolve them after attending to the user.
      </p>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="px-4 py-12 text-center text-muted text-sm">No active handoffs.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">Session</th>
                <th className="px-4 py-3 text-start font-medium">Source</th>
                <th className="px-4 py-3 text-start font-medium">Locale</th>
                <th className="px-4 py-3 text-start font-medium">Requested at</th>
                <th className="px-4 py-3 text-start font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((s) => (
                <tr key={s.id} className="text-fg/90">
                  <td className="px-4 py-3 font-mono text-xs text-muted max-w-[160px] truncate">{s.id}</td>
                  <td className="px-4 py-3">{s.source}</td>
                  <td className="px-4 py-3">{s.locale}</td>
                  <td className="px-4 py-3 text-xs text-muted">{fmt(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => resolve(s.id)}
                      disabled={resolving === s.id}
                      className="text-xs text-brand hover:text-brand-light transition-colors disabled:opacity-50"
                    >
                      {resolving === s.id ? "Resolving…" : "Mark Resolved"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
