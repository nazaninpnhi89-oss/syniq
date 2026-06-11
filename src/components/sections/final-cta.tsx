import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";

export function FinalCta() {
  const t = useTranslations("finalCta");
  return (
    <section id="contact" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-8 py-16 text-center sm:px-16 sm:py-20">
            <div className="brand-glow pointer-events-none absolute inset-0 opacity-80" />
            <div className="relative">
              {/* Brand accent row */}
              <div className="mb-6 flex items-center justify-center gap-4">
                <span className="brand-rule" />
                <span className="font-latin text-xs font-bold uppercase tracking-[0.25em] text-gold">
                  SYNIQ
                </span>
                <span className="brand-rule" />
              </div>

              <h2 className="mx-auto max-w-2xl text-3xl font-bold text-fg text-balance sm:text-4xl">
                {t("title")}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
                {t("subtitle")}
              </p>
              <Link
                href="/book"
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  className: "mt-9",
                })}
              >
                {t("button")}
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
