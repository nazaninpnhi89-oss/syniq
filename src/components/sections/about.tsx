import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

type Value = { title: string; desc: string };

export function About() {
  const t = useTranslations("about");
  const values = t.raw("values") as Value[];

  return (
    <section id="about" className="scroll-mt-24 py-16 sm:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Portrait placeholder */}
          <Reveal>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-xs lg:mx-0">
              {/* Main frame */}
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] ring-1 ring-line">
                <div className="absolute inset-0 bg-gradient-to-br from-surface to-brand-dark/40" />
                <div className="bg-grid absolute inset-0 opacity-20 [mask-image:radial-gradient(70%_70%_at_50%_40%,black,transparent)]" />
                {/* Decorative rings */}
                <div className="absolute inset-8 rounded-full border border-brand-light/10" />
                <div className="absolute inset-14 rounded-full border border-gold/15" />
                {/* Ambient glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-full bg-brand-light/10 blur-2xl" />
                </div>
                {/* Portrait mark */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-light/20 to-gold/10 ring-2 ring-gold/40">
                    <span className="font-latin text-2xl font-extrabold tracking-tight text-fg">
                      NP
                    </span>
                  </div>
                  <p className="font-latin text-xs text-muted/80">{t("name")}</p>
                </div>
              </div>

              {/* Credential badge */}
              <div className="glass absolute -right-4 bottom-12 rounded-2xl px-4 py-2.5 text-center shadow-lg">
                <p className="font-latin text-lg font-bold text-gold">B2B AI</p>
                <p className="font-latin mt-0.5 text-[10px] text-muted">
                  Global Expert
                </p>
              </div>
            </div>
          </Reveal>

          {/* Text content */}
          <div>
            <Reveal>
              <div className="mb-4 flex items-center gap-3">
                <span className="brand-rule" />
                <span className="font-latin text-sm font-medium uppercase tracking-[0.2em] text-gold">
                  {t("kicker")}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-fg sm:text-4xl">
                {t("name")}
              </h2>
              <p className="mt-2 text-brand-light">{t("role")}</p>
              <p className="mt-6 max-w-2xl leading-relaxed text-muted">
                {t("body")}
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <h3 className="mt-10 mb-5 text-sm font-semibold uppercase tracking-wider text-fg/70">
                {t("valuesTitle")}
              </h3>
              <ul className="grid gap-4 sm:grid-cols-2">
                {values.map((v) => (
                  <li key={v.title} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-light/15 text-brand-light">
                      <Check size={14} />
                    </span>
                    <div>
                      <p className="font-semibold text-fg">{v.title}</p>
                      <p className="text-sm leading-relaxed text-muted">
                        {v.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
