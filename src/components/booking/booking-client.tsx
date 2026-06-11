"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock, CreditCard, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SelectableDay } from "@/lib/days";
import { cn } from "@/lib/utils";

type Props = {
  days: SelectableDay[];
  durationMin: number;
  priceCents: number;
  currency: string;
  serviceTitle: string;
};

export function BookingClient({
  days,
  durationMin,
  priceCents,
  currency,
  serviceTitle,
}: Props) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const intlLocale = locale === "fa" ? "fa-IR" : "en-US";

  const [selectedDay, setSelectedDay] = useState<string | null>(
    days[0]?.iso ?? null,
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const priceLabel = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(priceCents / 100);

  useEffect(() => {
    if (!selectedDay) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/slots?date=${selectedDay}`)
      .then((r) => r.json())
      .then((d) => setSlots(Array.isArray(d.slots) ? d.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDay]);

  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  async function onContinue() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot: selectedSlot, notes, locale }),
      });
      if (res.status === 401) {
        window.location.href = `/${locale}/login?next=/book`;
        return;
      }
      const data = await res.json();
      if (res.status === 409) {
        setError("slot_taken");
        // به‌روزرسانی اسلات‌ها
        if (selectedDay) {
          const d = await fetch(`/api/slots?date=${selectedDay}`).then((r) =>
            r.json(),
          );
          setSlots(Array.isArray(d.slots) ? d.slots : []);
          setSelectedSlot(null);
        }
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("generic");
      }
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
      {/* انتخاب روز و ساعت */}
      <div className="space-y-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg/70">
            {t("pickDate")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <button
                key={d.iso}
                type="button"
                onClick={() => setSelectedDay(d.iso)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm transition-colors",
                  selectedDay === d.iso
                    ? "border-brand-light bg-brand-light/15 text-fg"
                    : "border-line bg-surface/40 text-muted hover:border-brand-light/50",
                )}
              >
                {d.label}
              </button>
            ))}
            {days.length === 0 ? (
              <p className="text-muted">{t("noSlots")}</p>
            ) : null}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg/70">
            {t("pickTime")}
          </h2>
          {loadingSlots ? (
            <p className="text-muted">…</p>
          ) : slots.length === 0 ? (
            <p className="text-muted">{t("noSlots")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    selectedSlot === s
                      ? "border-gold bg-gold/15 text-fg"
                      : "border-line bg-surface/40 text-fg/90 hover:border-gold/50",
                  )}
                >
                  {fmtTime(s)}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
            <Globe size={13} /> {t("yourTimezone")}: {tz}
          </p>
        </div>

        <div>
          <label className="block">
            <span className="mb-1.5 block text-sm text-fg/80">
              {t("notes")}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("notesPlaceholder")}
              className="w-full rounded-xl border border-line bg-surface/60 px-4 py-3 text-fg outline-none transition-colors placeholder:text-muted/60 focus:border-brand-light"
            />
          </label>
        </div>
      </div>

      {/* خلاصه و پرداخت */}
      <aside className="h-fit rounded-3xl border border-line bg-surface/50 p-7">
        <h3 className="text-lg font-bold text-fg">{serviceTitle}</h3>
        <ul className="mt-5 space-y-3 text-sm">
          <li className="flex items-center justify-between text-muted">
            <span className="inline-flex items-center gap-2">
              <Clock size={15} /> {t("duration")}
            </span>
            <span className="text-fg">
              {durationMin} {t("minutes")}
            </span>
          </li>
          <li className="flex items-center justify-between text-muted">
            <span className="inline-flex items-center gap-2">
              <CreditCard size={15} /> {t("price")}
            </span>
            <span className="font-latin text-fg">{priceLabel}</span>
          </li>
          {selectedSlot ? (
            <li className="flex items-center justify-between border-t border-line pt-3 text-muted">
              <span>{t("pickTime")}</span>
              <span className="text-fg">{fmtTime(selectedSlot)}</span>
            </li>
          ) : null}
        </ul>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === "slot_taken" ? t("noSlots") : t("processing")}
          </p>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          className="mt-6 w-full"
          disabled={!selectedSlot || submitting}
          onClick={onContinue}
        >
          {submitting ? t("processing") : t("continue")}
        </Button>
        <p className="mt-3 text-center text-xs text-muted">
          {t("timezoneNote")}
        </p>
      </aside>
    </div>
  );
}
