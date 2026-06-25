"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/api/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // send admin notification
  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: process.env.ADMIN_EMAIL,
      subject: "New signup on SYNIQ",
      html: `<p>A new user signed up:</p><p><strong>Name:</strong> ${fullName}<br/><strong>Email:</strong> ${email}</p>`,
    }).catch(() => {});
  }

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
