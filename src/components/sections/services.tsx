import { useTranslations } from "next-intl";
import { ArrowUpRight, BrainCircuit, Radio, GraduationCap } from "lucide-react";
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

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* مشاوره — فعال */}
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

          {/* وبینار — به‌زودی */}
          <Reveal delay={0.05}>
            <SoonCard
              icon={<Radio size={24} />}
              title={t("items.webinar.title")}
              desc={t("items.webinar.desc")}
              soon={t("soonLabel")}
            />
          </Reveal>

          {/* دوره — به‌زودی */}
          <Reveal delay={0.1}>
            <SoonCard
              icon={<GraduationCap size={24} />}
              title={t("items.course.title")}
              desc={t("items.course.desc")}
              soon={t("soonLabel")}
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function SoonCard({
  icon,
  title,
  desc,
  soon,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  soon: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-surface/40 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted">
          {icon}
        </div>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
          {soon}
        </span>
      </div>
      <h3 className="text-xl font-bold text-fg/90">{title}</h3>
      <p className="mt-3 flex-1 leading-relaxed text-muted">{desc}</p>
    </article>
  );
}
