import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";

export default async function LoginPage({
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
      <h1 className="text-2xl font-bold text-fg">{t("loginTitle")}</h1>
      <p className="mt-2 mb-7 text-sm text-muted">{t("loginSubtitle")}</p>
      <AuthForm mode="login" next={next} />
    </div>
  );
}
