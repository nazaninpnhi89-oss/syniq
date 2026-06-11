import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

type TestimonialItem = {
  quote: string;
  name: string;
  role: string;
  company: string;
};

export function Testimonials() {
  const t = useTranslations("testimonials");
  const items = t.raw("items") as TestimonialItem[];

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading kicker={t("kicker")} title={t("title")} />
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.06}>
              <article className="flex h-full flex-col rounded-3xl border border-line bg-surface/40 p-8">
                {/* Stars */}
                <div
                  className="mb-5 flex gap-1"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      className="fill-gold text-gold"
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="flex-1 leading-relaxed text-fg/85">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <footer className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-light/15 font-latin text-sm font-bold text-brand-light">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-fg">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.role} · {item.company}
                    </p>
                  </div>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
