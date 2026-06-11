import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// در Next 16، middleware به proxy تغییر نام داده (runtime: nodejs).
export default async function proxy(request: NextRequest) {
  // ۱) ابتدا next-intl ناوبری/locale را مدیریت می‌کند.
  const response = intlMiddleware(request);

  // ۲) سپس نشست Supabase را رفرش می‌کنیم و کوکی‌ها را روی همان پاسخ ست می‌کنیم.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && url.startsWith("http")) {
    try {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });
      await supabase.auth.getUser();
    } catch {
      // اگر Supabase هنوز پیکربندی نشده باشد، صفحه باید همچنان کار کند.
    }
  }

  return response;
}

export const config = {
  // روی همه مسیرها جز فایل‌های استاتیک و API اجرا شود.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
