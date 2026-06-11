import { useTranslations } from "next-intl";
import { Target, GitBranch, Handshake } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

type Item = { title: string; desc: string };

const icons = [GitBranch, Target, Handshake];

export function Why() {
  const t = useTranslations("why");
  const items = t.raw("items") as Item[];

  const [featured, ...rest] = items;
  const FeaturedIcon = icons[0] ?? Target;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading kicker={t("kicker")} title={t("title")} />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Featured first item */}
          {featured && (
            <Reveal>
              <div className="h-full rounded-3xl border border-brand-light/30 bg-gradient-to-br from-surface to-brand-dark/30 p-10">
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gold/10 text-gold">
                  <FeaturedIcon size={26} />
                </div>
                <h3 className="text-2xl font-bold text-fg">{featured.title}</h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
                  {featured.desc}
                </p>
              </div>
            </Reveal>
          )}

          {/* Two smaller items stacked */}
          <div className="flex flex-col gap-6">
            {rest.map((item, i) => {
              const Icon = icons[i + 1] ?? Target;
              return (
                <Reveal key={item.title} delay={(i + 1) * 0.06}>
                  <div className="flex-1 rounded-3xl border border-line bg-surface/40 p-8">
                    <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gold/10 text-gold">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-fg">{item.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{item.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
