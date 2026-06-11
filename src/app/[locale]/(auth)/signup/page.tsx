import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="glass rounded-3xl p-8 sm:p-10">
      <h1 className="text-2xl font-bold text-fg">{t("signupTitle")}</h1>
      <p className="mt-2 mb-7 text-sm text-muted">{t("signupSubtitle")}</p>
      <AuthForm mode="signup" next={next} />
    </div>
  );
}
