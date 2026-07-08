import { useTranslations } from "next-intl";
import { ArrowUpRight, BrainCircuit, Bot, Monitor, Mic } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";

const icons = [BrainCircuit, Bot, Monitor, Mic] as const;

export function Services() {
  const t = useTranslations("services");

  return (
    <section id="services" className="scroll-mt-24 py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading kicker={t("kicker")} title={t("title")} />
          <p className="mt-4 max-w-2xl text-muted">{t("subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(["consult", "chatbot", "webdesign", "voiceagent"] as const).map((key, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={key} delay={i * 0.05}>
                <article className="group flex h-full flex-col rounded-2xl border border-brand-light/30 bg-gradient-to-br from-surface to-brand-dark/30 p-5 transition-colors hover:border-brand-light/60">
                  <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-brand-light/15 text-brand-light">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-base font-bold text-fg">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {t(`items.${key}.desc`)}
                  </p>
                  <p className="mt-3 text-xs text-fg/60">
                    {t(`items.${key}.meta`)}
                  </p>
                  <Link
                    href="/book"
                    className={buttonVariants({
                      variant: "primary",
                      size: "sm",
                      className: "mt-4 w-full",
                    })}
                  >
                    {t(`items.${key}.cta`)}
                    <ArrowUpRight size={16} />
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
