import { useTranslations } from "next-intl";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

type Step = { no: string; title: string; desc: string };

export function Process() {
  const t = useTranslations("process");
  const steps = t.raw("steps") as Step[];

  return (
    <section id="process" className="scroll-mt-24 py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading kicker={t("kicker")} title={t("title")} />
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.no} delay={i * 0.06}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-line bg-surface/40 p-7 transition-colors hover:border-brand-light/30">
                {/* Top accent bar — reveals on hover */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-dark via-brand-light to-brand-dark opacity-0 transition-opacity duration-300 group-hover:opacity-80" />

                {/* Step badge */}
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-light/10 ring-1 ring-brand-light/30">
                  <span className="font-latin text-xs font-bold text-brand-light">
                    {s.no}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-fg">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.desc}
                </p>

                {/* Watermark number */}
                <span
                  aria-hidden
                  className="font-latin pointer-events-none absolute -bottom-3 -right-1 select-none text-7xl font-black text-fg/[0.03]"
                >
                  {s.no}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
