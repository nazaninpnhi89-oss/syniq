"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const other = locale === "fa" ? "en" : "fa";

  return (
    <button
      type="button"
      aria-label="Switch language"
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          router.replace(pathname, { locale: other });
        })
      }
      className={cn(
        "font-latin rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fg/80 transition-colors hover:border-brand-light hover:text-brand-light",
        className,
      )}
    >
      {other === "en" ? "EN" : "فا"}
    </button>
  );
}
