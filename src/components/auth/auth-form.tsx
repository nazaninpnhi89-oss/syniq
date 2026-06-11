"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { login, signup, type AuthState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {mode === "signup" ? (
        <Field
          label={t("fullName")}
          name="full_name"
          type="text"
          autoComplete="name"
          required
        />
      ) : null}

      <Field
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        minLength={6}
      />

      {state?.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}
      {state?.info === "checkEmail" ? (
        <p className="rounded-xl border border-brand-light/30 bg-brand-light/10 px-4 py-2.5 text-sm text-brand-light">
          {t("checkEmail")}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "…" : mode === "login" ? t("loginButton") : t("signupButton")}
      </Button>

      <p className="pt-2 text-center text-sm text-muted">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-medium text-brand-light hover:underline"
        >
          {mode === "login" ? t("goSignup") : t("goLogin")}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-fg/80">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-line bg-surface/60 px-4 py-3 text-fg outline-none transition-colors placeholder:text-muted/60 focus:border-brand-light"
      />
    </label>
  );
}
