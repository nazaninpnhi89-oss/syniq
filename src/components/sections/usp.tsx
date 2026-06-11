import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function Usp() {
  const t = useTranslations("usp");
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <Reveal>
          <div className="rounded-3xl border border-line bg-gradient-to-br from-brand-dark/40 to-surface px-8 py-12 sm:px-14 sm:py-16">
            <div className="mb-5 flex items-center gap-3">
              <span className="brand-rule" />
              <span className="font-latin text-sm font-medium uppercase tracking-[0.2em] text-gold">
                {t("kicker")}
              </span>
            </div>
            <h2 className="max-w-3xl text-2xl font-bold leading-snug text-fg text-balance sm:text-3xl">
              {t("title")}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              {t("body")}
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
