import { useTranslations } from "next-intl";
import { ArrowUpRight, BrainCircuit, Bot, Monitor } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";

const icons = [BrainCircuit, Bot, Monitor] as const;

export function Services() {
  const t = useTranslations("services");

  return (
    <section id="services" className="scroll-mt-24 py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading kicker={t("kicker")} title={t("title")} />
          <p className="mt-4 max-w-2xl text-muted">{t("subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {(["consult", "chatbot", "webdesign"] as const).map((key, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={key} delay={i * 0.05}>
                <article className="group flex h-full flex-col rounded-3xl border border-brand-light/30 bg-gradient-to-br from-surface to-brand-dark/30 p-8 transition-colors hover:border-brand-light/60">
                  <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand-light/15 text-brand-light">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-fg">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="mt-3 flex-1 leading-relaxed text-muted">
                    {t(`items.${key}.desc`)}
                  </p>
                  <p className="mt-5 text-sm text-fg/60">
                    {t(`items.${key}.meta`)}
                  </p>
                  <Link
                    href="/book"
                    className={buttonVariants({
                      variant: "primary",
                      size: "md",
                      className: "mt-6 w-full",
                    })}
                  >
                    {t(`items.${key}.cta`)}
                    <ArrowUpRight size={18} />
                  </Link>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
