import { useTranslations } from "next-intl";
import { ShieldCheck, Sparkles, LineChart } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

type Item = { title: string; desc: string };

const icons = [ShieldCheck, Sparkles, LineChart];

export function Principles() {
  const t = useTranslations("principles");
  const items = t.raw("items") as Item[];

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading kicker={t("kicker")} title={t("title")} />
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[i] ?? Sparkles;
            return (
              <Reveal key={item.title} delay={i * 0.06}>
                <article className="flex h-full flex-col rounded-3xl border border-line bg-surface/40 p-8 transition-colors hover:border-brand-light/40">
                  <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand-light/15 text-brand-light">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-fg">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{item.desc}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
