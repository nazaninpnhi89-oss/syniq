"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setSignedIn(!!data.user))
      .catch(() => {});
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session?.user),
    );
    return () => subscription.unsubscribe();
  }, []);

  const links = [
    { href: "/#services", label: t("services") },
    { href: "/#about", label: t("about") },
    { href: "/#process", label: t("process") },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line/70 bg-bg/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="SYNIQ" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        {/* دسکتاپ */}
        <div className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-7 text-sm text-fg/80">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="transition-colors hover:text-fg"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            {signedIn ? (
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t("dashboard")}
              </Link>
            ) : (
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t("login")}
              </Link>
            )}
            <Link
              href="/book"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              {t("book")}
            </Link>
          </div>
        </div>

        {/* موبایل */}
        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher />
          <button
            type="button"
            aria-label={t("menu")}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-fg"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* منوی موبایل */}
      {open ? (
        <div className="border-t border-line/70 bg-bg/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 sm:px-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-fg/85 hover:bg-surface"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={signedIn ? "/dashboard" : "/login"}
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "outline", size: "md" })}
              >
                {signedIn ? t("dashboard") : t("login")}
              </Link>
              <Link
                href="/book"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                {t("book")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
