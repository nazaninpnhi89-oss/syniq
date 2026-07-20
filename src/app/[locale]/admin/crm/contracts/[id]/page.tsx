"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useCanWrite } from "@/lib/admin/role-context";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  sendContract,
  cancelContract,
  rewriteContractWithAi,
  generateFollowUpMessage,
} from "@/lib/crm/contracts";

interface Contract {
  id: string;
  number: string;
  title: string;
  body_md: string;
  status: string;
  amount_toman: number | null;
  share_token: string;
  sent_at: string | null;
  first_viewed_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  contact: { id: string; full_name: string } | null;
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const t = useTranslations("admin.crm.contracts");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();

  const [contract, setContract] = useState<Contract | null>(null);
  const [bodyMd, setBodyMd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/crm/contracts/${id}`)
      .then((r) => r.json())
      .then((body) => {
        setContract(body.data);
        setBodyMd(body.data?.body_md ?? "");
        setLoading(false);
      });
  }, [id]);

  async function saveBody() {
    setSaving(true);
    await fetch(`/api/admin/crm/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body_md: bodyMd }),
    });
    setSaving(false);
  }

  async function handleSend() {
    setBusy("send");
    const res = await sendContract({ locale, contractId: id });
    if (!res?.error && contract) setContract({ ...contract, status: "sent", sent_at: new Date().toISOString() });
    setBusy(null);
  }

  async function handleCancel() {
    setBusy("cancel");
    const res = await cancelContract({ locale, contractId: id });
    if (!res?.error && contract) setContract({ ...contract, status: "canceled" });
    setBusy(null);
  }

  async function handleRewrite() {
    setBusy("rewrite");
    setError(null);
    const res = await rewriteContractWithAi({ locale, contractId: id });
    if (res?.error) setError(res.error);
    else if (res?.bodyMd) setBodyMd(res.bodyMd);
    setBusy(null);
  }

  async function handleFollowUp() {
    setBusy("followup");
    setError(null);
    const res = await generateFollowUpMessage({ locale, contractId: id });
    if (res?.error) setError(res.error);
    else if (res?.message) setFollowUp(res.message);
    setBusy(null);
  }

  function copyLink() {
    if (!contract) return;
    const url = `${window.location.origin}/${locale}/contract/${contract.share_token}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading) return <p className="text-center text-muted text-sm py-8">{tCommon("loading")}</p>;
  if (!contract) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fg font-mono">{contract.number}</h2>
          <p className="text-xs text-muted mt-1">
            {contract.contact?.full_name} · {formatCurrency(locale, contract.amount_toman)}
          </p>
        </div>
        <StatusBadge status={contract.status} label={t(`statuses.${contract.status}`)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canWrite && contract.status === "draft" && (
          <button
            onClick={handleSend}
            disabled={busy === "send"}
            className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {t("send")}
          </button>
        )}
        <button
          onClick={copyLink}
          className="text-xs text-muted hover:text-fg px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors"
        >
          {linkCopied ? "✓" : t("copyLink")}
        </button>
        {canWrite && contract.status === "draft" && (
          <button
            onClick={handleRewrite}
            disabled={busy === "rewrite"}
            className="text-xs text-brand hover:underline disabled:opacity-50"
          >
            {busy === "rewrite" ? "…" : t("rewrite")}
          </button>
        )}
        {canWrite && (contract.status === "sent" || contract.status === "viewed") && (
          <button
            onClick={handleFollowUp}
            disabled={busy === "followup"}
            className="text-xs text-brand hover:underline disabled:opacity-50"
          >
            {busy === "followup" ? "…" : t("followUp")}
          </button>
        )}
        {canWrite && ["draft", "sent", "viewed"].includes(contract.status) && (
          <button
            onClick={handleCancel}
            disabled={busy === "cancel"}
            className="text-xs text-red-400 hover:underline disabled:opacity-50"
          >
            {t("cancelContract")}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {followUp && (
        <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            {t("followUpResult")}
          </h3>
          <p className="text-sm text-fg/90 whitespace-pre-line">{followUp}</p>
          <button
            onClick={() => navigator.clipboard.writeText(followUp)}
            className="text-xs text-brand hover:underline"
          >
            {t("copy")}
          </button>
        </div>
      )}

      {contract.status === "accepted" && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-sm text-green-400">
          {t("acceptedBy")}: {contract.accepted_by_name} —{" "}
          {contract.accepted_at && formatDate(locale, contract.accepted_at)}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {t("editor")}
        </h3>
        <textarea
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          onBlur={saveBody}
          disabled={!canWrite || contract.status === "accepted"}
          rows={20}
          dir="auto"
          className="w-full bg-surface border border-line rounded-2xl p-4 text-sm text-fg font-mono focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-70"
        />
        {saving && <p className="text-[11px] text-muted">{tCommon("save")}…</p>}
      </div>
    </div>
  );
}
