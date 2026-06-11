"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string } | undefined;

function safeNext(next: FormDataEntryValue | null, locale: string) {
  const n = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";
  return `/${locale}${n}`;
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = String(formData.get("locale") || "fa");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(safeNext(formData.get("next"), locale));
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = String(formData.get("locale") || "fa");
  const fullName = String(formData.get("full_name") || "");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // اگر تأیید ایمیل فعال باشد، نشستی ساخته نمی‌شود.
  if (!data.session) return { info: "checkEmail" };

  redirect(safeNext(formData.get("next"), locale));
}

export async function logout(formData: FormData) {
  const locale = String(formData.get("locale") || "fa");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
