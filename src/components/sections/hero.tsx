import { useTranslations } from "next-intl";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

type Stat = { value: string; label: string };

export function Hero() {
  const t = useTranslations("hero");
  const stats = useTranslations("stats");
  const items = stats.raw("items") as Stat[];

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="brand-glow pointer-events-none absolute inset-0 -z-10" />
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />

      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Text */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted">
                <Sparkles size={14} className="text-gold" />
                {t("badge")}
              </span>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-6 text-4xl font-bold leading-[1.1] text-fg text-balance sm:text-5xl lg:text-6xl">
                {t("titleLead")}{" "}
                <span className="text-gradient">{t("titleHighlight")}</span>{" "}
                {t("titleTail")}
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                {t("subtitle")}
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/book"
                  className={buttonVariants({ variant: "primary", size: "lg" })}
                >
                  {t("ctaPrimary")}
                  <ArrowUpRight size={18} />
                </Link>
                <Link
                  href="/#services"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  {t("ctaSecondary")}
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Portrait */}
          <Reveal delay={0.2}>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm">
              {/* Main frame */}
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] ring-1 ring-line">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand/70 to-surface" />
                <div className="bg-grid absolute inset-0 opacity-25 [mask-image:radial-gradient(80%_80%_at_50%_50%,black,transparent)]" />
                {/* Decorative rings */}
                <div className="absolute inset-10 rounded-full border border-gold/15" />
                <div className="absolute inset-16 rounded-full border border-brand-light/20" />
                {/* Ambient glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-56 w-56 rounded-full bg-brand-light/10 blur-3xl" />
                </div>
                {/* Portrait mark */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-light/20 to-brand/20 ring-2 ring-gold/50">
                    <span className="font-latin text-3xl font-extrabold tracking-tight text-fg">
                      NP
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="font-latin text-sm font-semibold text-fg">
                      Nazanin Panahi
                    </p>
                    <p className="font-latin mt-0.5 text-xs text-muted">
                      {t("badge")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating badge — ROI */}
              <div className="glass absolute -left-4 top-10 rounded-2xl px-4 py-2.5 shadow-lg">
                <p className="font-latin text-xs font-semibold text-fg">
                  ⚡ 30-day results
                </p>
                <p className="font-latin mt-0.5 text-[10px] text-muted">
                  Measurable ROI focus
                </p>
              </div>

              {/* Floating badge — availability */}
              <div className="glass absolute -right-3 bottom-14 flex items-center gap-2 rounded-full px-3.5 py-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-latin text-xs font-medium text-fg">
                  Available now
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Stats */}
        <Reveal delay={0.1}>
          <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
            {items.map((s) => (
              <div
                key={s.label}
                className="bg-surface/60 px-6 py-7 text-center"
              >
                <dt className="font-latin text-2xl font-bold text-gold sm:text-3xl">
                  {s.value}
                </dt>
                <dd className="mt-1 text-sm text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
