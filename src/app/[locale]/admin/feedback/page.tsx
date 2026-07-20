"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/format";

interface FeedbackItem {
  id: string;
  message_id: number;
  rating: 1 | -1;
  comment: string | null;
  created_at: string;
}

export default function FeedbackPage() {
  const locale = useLocale();
  const t = useTranslations("admin.feedback");
  const tCommon = useTranslations("admin.common");

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filter === "positive") params.set("rating", "1");
    if (filter === "negative") params.set("rating", "-1");
    const res = await fetch(`/api/admin/feedback?${params}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const positive = items.filter((i) => i.rating === 1).length;
  const negative = items.filter((i) => i.rating === -1).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t("total"), value: items.length, filter: "all" as const },
          { label: t("positive"), value: positive, filter: "positive" as const },
          { label: t("negative"), value: negative, filter: "negative" as const },
        ].map((stat) => (
          <button
            key={stat.filter}
            onClick={() => setFilter(stat.filter)}
            className={`text-start px-5 py-4 rounded-2xl border transition-colors ${
              filter === stat.filter ? "border-brand bg-brand/10" : "border-line bg-surface hover:border-brand/40"
            }`}
          >
            <p className="text-xs text-muted mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-fg">{stat.value}</p>
          </button>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-muted text-sm">{tCommon("loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr className="text-muted text-xs">
                <th className="px-4 py-3 text-start font-medium">{t("rating")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("messageId")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("comment")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="text-fg/90 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`text-lg ${item.rating === 1 ? "text-green-400" : "text-red-400"}`}
                    >
                      {item.rating === 1 ? "👍" : "👎"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{item.message_id}</td>
                  <td className="px-4 py-3 text-muted max-w-[300px] truncate">
                    {item.comment ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(locale, item.created_at)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">{t("noFeedback")}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
