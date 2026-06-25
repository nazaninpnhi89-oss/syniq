import { useTranslations } from "next-intl";
import { ArrowUpRight, BrainCircuit, Bot } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";

export function Services() {
  const t = useTranslations("services");

  return (
    <section id="services" className="scroll-mt-24 py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading kicker={t("kicker")} title={t("title")} />
          <p className="mt-4 max-w-2xl text-muted">{t("subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="group flex h-full flex-col rounded-3xl border border-brand-light/30 bg-gradient-to-br from-surface to-brand-dark/30 p-8 transition-colors hover:border-brand-light/60">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand-light/15 text-brand-light">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-xl font-bold text-fg">
                {t("items.consult.title")}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-muted">
                {t("items.consult.desc")}
              </p>
              <p className="mt-5 text-sm text-fg/60">
                {t("items.consult.meta")}
              </p>
              <Link
                href="/book"
                className={buttonVariants({
                  variant: "primary",
                  size: "md",
                  className: "mt-6 w-full",
                })}
              >
                {t("items.consult.cta")}
                <ArrowUpRight size={18} />
              </Link>
            </article>
          </Reveal>

          <Reveal delay={0.05}>
            <article className="group flex h-full flex-col rounded-3xl border border-brand-light/30 bg-gradient-to-br from-surface to-brand-dark/30 p-8 transition-colors hover:border-brand-light/60">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand-light/15 text-brand-light">
                <Bot size={24} />
              </div>
              <h3 className="text-xl font-bold text-fg">
                {t("items.chatbot.title")}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-muted">
                {t("items.chatbot.desc")}
              </p>
              <p className="mt-5 text-sm text-fg/60">
                {t("items.chatbot.meta")}
              </p>
              <Link
                href="/book"
                className={buttonVariants({
                  variant: "primary",
                  size: "md",
                  className: "mt-6 w-full",
                })}
              >
                {t("items.chatbot.cta")}
                <ArrowUpRight size={18} />
              </Link>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
