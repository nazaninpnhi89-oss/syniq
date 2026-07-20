"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useCanWrite, useRoleAtLeast } from "@/lib/admin/role-context";
import { generateCampaignEmail, reviewCampaignEmail, sendCampaign } from "@/lib/crm/campaigns";

interface CampaignEmail {
  id: string;
  to_name: string;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const t = useTranslations("admin.crm.campaigns");
  const tCommon = useTranslations("admin.common");
  const canWrite = useCanWrite();
  const canSend = useRoleAtLeast("editor");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [emails, setEmails] = useState<CampaignEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/crm/campaigns/${id}`);
    if (res.ok) {
      const body = await res.json();
      setCampaign(body.data);
      setEmails(body.emails ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateAll() {
    setGenerating(true);
    setError(null);
    for (const email of emails.filter((e) => e.status === "pending")) {
      const res = await generateCampaignEmail({ locale, campaignEmailId: email.id });
      if (res?.error || !res?.ok) {
        setError(res?.error ?? "AI generation failed");
        break;
      }
      const { subject, body } = res;
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, subject, body_text: body, status: "ready" } : e,
        ),
      );
    }
    setGenerating(false);
  }

  async function review(emailId: string, status: "approved" | "rejected") {
    const email = emails.find((e) => e.id === emailId);
    await reviewCampaignEmail({
      locale,
      campaignEmailId: emailId,
      status,
      subject: email?.subject ?? undefined,
      body: email?.body_text ?? undefined,
    });
    setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, status } : e)));
  }

  function updateDraft(emailId: string, field: "subject" | "body_text", value: string) {
    setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, [field]: value } : e)));
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    setResult(null);
    const res = await sendCampaign({ locale, campaignId: id });
    setSending(false);
    if (res?.error) {
      setError(res.error === "missingApiKey" ? t("missingKey") : res.error);
      return;
    }
    setResult(`${res.sent} / ${res.failed} ${t("sendResult")}`);
    load();
  }

  if (loading) return <p className="text-center text-muted text-sm py-8">{tCommon("loading")}</p>;
  if (!campaign) return null;

  const pendingCount = emails.filter((e) => e.status === "pending").length;
  const approvedCount = emails.filter((e) => e.status === "approved").length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{campaign.name}</h2>
        <StatusBadge status={campaign.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canWrite && pendingCount > 0 && (
          <button
            onClick={generateAll}
            disabled={generating}
            className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {generating ? "…" : t("generateAll")}
          </button>
        )}
        {canSend && approvedCount > 0 && campaign.status !== "sent" && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="text-xs font-medium bg-gold text-bg px-3 py-1.5 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {sending ? "…" : t("send")}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {result && <p className="text-xs text-green-400">{result}</p>}

      <div className="space-y-3">
        {emails.map((email) => (
          <div key={email.id} className="bg-surface border border-line rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-fg font-medium">{email.to_name}</p>
                <p className="text-xs text-muted">{email.to_email}</p>
              </div>
              <StatusBadge status={email.status} label={t(`emailStatuses.${email.status}`)} />
            </div>
            {(email.status === "ready" || email.status === "approved") && (
              <>
                <input
                  value={email.subject ?? ""}
                  onChange={(e) => updateDraft(email.id, "subject", e.target.value)}
                  disabled={!canWrite}
                  placeholder={t("subject")}
                  className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
                />
                <textarea
                  value={email.body_text ?? ""}
                  onChange={(e) => updateDraft(email.id, "body_text", e.target.value)}
                  disabled={!canWrite}
                  rows={4}
                  placeholder={t("body")}
                  className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-fg"
                />
                {canWrite && email.status === "ready" && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => review(email.id, "rejected")}
                      className="text-xs text-red-400 hover:underline"
                    >
                      {t("reject")}
                    </button>
                    <button
                      onClick={() => review(email.id, "approved")}
                      className="text-xs text-brand hover:underline"
                    >
                      {t("approve")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
