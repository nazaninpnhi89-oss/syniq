"use client";

import { useEffect, useState } from "react";

interface PromptVersion {
  id: string;
  content: string;
  persona: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromptsPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newPersona, setNewPersona] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/prompt-versions");
    if (res.ok) setVersions(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function activate(id: string) {
    setActivating(id);
    await fetch(`/api/admin/prompt-versions/${id}/activate`, { method: "POST" });
    setActivating(null);
    load();
  }

  async function create() {
    if (!newContent.trim()) return;
    setCreating(true);
    await fetch("/api/admin/prompt-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, persona: newPersona || undefined }),
    });
    setCreating(false);
    setShowNew(false);
    setNewContent("");
    setNewPersona("");
    load();
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });

  const selectedVersion = versions.find((v) => v.id === selectedId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">Prompt Versions</h2>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors"
        >
          + New Version
        </button>
      </div>

      <div className="text-xs text-muted bg-surface border border-line rounded-xl px-4 py-3">
        Template variables: <code className="text-brand">{"{{SITE_URL}}"}</code>, <code className="text-brand">{"{{BOOK_URL}}"}</code>, <code className="text-brand">{"{{KNOWLEDGE}}"}</code>, <code className="text-brand">{"{{RAG_CONTEXT}}"}</code>
      </div>

      {showNew && (
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-fg">New Prompt Version</h3>
          <div>
            <label className="block text-xs text-muted mb-1">Persona (optional)</label>
            <input
              value={newPersona}
              onChange={(e) => setNewPersona(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand"
              placeholder="e.g. formal, friendly, concise"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">System Prompt Content *</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={12}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand resize-none font-mono"
              placeholder="You are SYNIQ's AI assistant…"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-xl text-sm text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={create}
              disabled={creating || !newContent.trim()}
              className="px-4 py-2 rounded-xl bg-brand text-bg text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create (Inactive)"}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-5">
        {/* Version list */}
        <div className="w-64 shrink-0 space-y-2">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`w-full text-start px-4 py-3 rounded-xl border transition-colors ${
                  selectedId === v.id
                    ? "border-brand bg-brand/10"
                    : "border-line hover:border-brand/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted">{v.id.slice(0, 8)}</span>
                  {v.is_active && (
                    <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">{fmt(v.created_at)}</p>
              </button>
            ))
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1">
          {selectedVersion ? (
            <div className="bg-surface border border-line rounded-2xl p-5 space-y-4 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted mb-0.5">Version {selectedVersion.id.slice(0, 8)}</p>
                  {selectedVersion.persona && (
                    <p className="text-xs text-brand">Persona: {selectedVersion.persona}</p>
                  )}
                </div>
                {!selectedVersion.is_active && (
                  <button
                    onClick={() => activate(selectedVersion.id)}
                    disabled={activating === selectedVersion.id}
                    className="px-4 py-2 rounded-xl bg-brand/20 text-brand text-sm font-medium hover:bg-brand/30 transition-colors disabled:opacity-50"
                  >
                    {activating === selectedVersion.id ? "Activating…" : "Activate"}
                  </button>
                )}
                {selectedVersion.is_active && (
                  <span className="text-xs text-green-400 bg-green-500/15 px-3 py-1.5 rounded-xl">
                    Currently Active
                  </span>
                )}
              </div>
              <pre className="text-xs text-muted font-mono whitespace-pre-wrap bg-bg border border-line rounded-xl p-4 overflow-auto max-h-96">
                {selectedVersion.content}
              </pre>
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-2xl flex items-center justify-center h-48">
              <p className="text-sm text-muted">Select a version to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
