import { useTranslations } from "next-intl";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ParticlePortrait } from "./particle-portrait";

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

          {/* عکس نازنین — افکت ذرات شبکه‌ای */}
          <Reveal delay={0.2}>
            <ParticlePortrait
              src="/logo-icon.jpg"
              className="relative mx-auto aspect-square w-full max-w-sm"
            />
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
                <dt className="text-2xl font-bold text-brand-light sm:text-3xl">
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
