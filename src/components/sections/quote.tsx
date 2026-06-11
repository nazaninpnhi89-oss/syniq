import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function Quote() {
  const t = useTranslations("quote");
  return (
    <section className="py-12 sm:py-16">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-r from-brand-dark via-brand to-brand-dark px-8 py-14 text-center sm:py-20">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />

            {/* Decorative opening quote mark */}
            <span
              aria-hidden
              className="font-latin pointer-events-none absolute left-6 top-2 select-none text-[9rem] font-black leading-none text-white/[0.06] sm:text-[12rem]"
            >
              &ldquo;
            </span>
            {/* Decorative closing quote mark */}
            <span
              aria-hidden
              className="font-latin pointer-events-none absolute right-6 bottom-0 select-none text-[9rem] font-black leading-none text-white/[0.06] sm:text-[12rem]"
            >
              &rdquo;
            </span>

            <p className="font-latin relative text-2xl font-bold text-white text-balance sm:text-4xl">
              {t("main")}
            </p>
            <span className="brand-rule relative mx-auto mt-6 block" />
            <p className="relative mt-5 text-lg text-white/80">{t("sub")}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
