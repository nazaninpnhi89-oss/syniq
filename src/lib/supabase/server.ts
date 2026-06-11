import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * کلاینت Supabase برای سرور (Server Components / Route Handlers / Server Actions).
 * در Next 16 تابع cookies() ناهمگام (async) است.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // فراخوانی از داخل Server Component — نادیده گرفته می‌شود (proxy رفرش را انجام می‌دهد).
          }
        },
      },
    },
  );
}

/**
 * کلاینت با کلید سرویس (service_role) برای عملیات سمت‌سرور مثل Webhook استرایپ
 * که نیاز به دور زدن RLS دارند. فقط در محیط سرور استفاده شود.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
