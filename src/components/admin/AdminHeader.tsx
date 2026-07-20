"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
  locale: string;
  navLabels: Record<string, string>;
}

export function AdminHeader({ email, locale, navLabels }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const parts = pathname.split("/").filter(Boolean);
  const segment = parts.at(-1) ?? "admin";
  const crmKey =
    parts.includes("crm") && segment !== "crm"
      ? `crm${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
      : null;
  const title =
    segment === "admin"
      ? navLabels.dashboard
      : (crmKey && navLabels[crmKey]) || navLabels[segment] || segment;

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push(`/${locale}/login`);
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-line bg-surface shrink-0">
      <h1 className="text-sm font-semibold text-fg capitalize">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted hidden sm:block">{email}</span>
        <button
          onClick={logout}
          className="text-xs text-muted hover:text-fg transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-2"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
