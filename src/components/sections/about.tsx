import Image from "next/image";
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
          {/* Logo — بدون باکس، با هاله‌ی ملایم */}
          <Reveal>
            <div className="relative mx-auto w-full max-w-sm lg:mx-0">
              <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
                <div className="h-48 w-48 rounded-full bg-brand-light/10 blur-3xl" />
              </div>
              <Image
                src="/logo.jpg"
                alt={t("name")}
                width={1280}
                height={698}
                className="h-auto w-full"
              />
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
