import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/sections/hero";
import { Usp } from "@/components/sections/usp";
import { Services } from "@/components/sections/services";
import { About } from "@/components/sections/about";
import { Process } from "@/components/sections/process";
import { Why } from "@/components/sections/why";
import { Testimonials } from "@/components/sections/testimonials";
import { Quote } from "@/components/sections/quote";
import { FinalCta } from "@/components/sections/final-cta";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Usp />
        <Services />
        <About />
        <Process />
        <Why />
        <Testimonials />
        <Quote />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
