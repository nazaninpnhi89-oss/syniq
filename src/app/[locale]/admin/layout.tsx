import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminRoleProvider } from "@/lib/admin/role-context";
import { type AdminRole, roleAtLeast } from "@/lib/admin/roles";
import { DEMO_MODE, demoUserId } from "@/lib/admin/demo-mode";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const admin = createAdminClient();

  // Classroom-demo bypass: skip the login requirement entirely when
  // ADMIN_DEMO_MODE is on, acting as the configured demo account.
  let userId: string;
  let userEmail: string | null;
  let role: AdminRole;

  if (DEMO_MODE && demoUserId()) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role, is_active, email")
      .eq("id", demoUserId()!)
      .maybeSingle();
    if (!profile || profile.is_active === false || !roleAtLeast(profile.role, "viewer")) {
      redirect(`/${locale}/login?next=/${locale}/admin`);
    }
    userId = demoUserId()!;
    userEmail = profile!.email;
    role = profile!.role as AdminRole;
  } else {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);

    const { data: profile } = await sb
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_active === false || !roleAtLeast(profile?.role, "viewer")) {
      redirect(`/${locale}`);
    }
    userId = user.id;
    userEmail = user.email ?? null;
    role = profile!.role as AdminRole;
  }

  // Fetch email/name for header
  const { data: profileData } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  const t = await getTranslations({ locale, namespace: "admin.nav" });
  const navLabels: Record<string, string> = {
    dashboard: t("dashboard"),
    knowledge: t("knowledge"),
    embedding: t("embedding"),
    models: t("models"),
    prompts: t("prompts"),
    conversations: t("conversations"),
    handoff: t("handoff"),
    leads: t("leads"),
    feedback: t("feedback"),
    channels: t("channels"),
    playground: t("playground"),
    users: t("users"),
    settings: t("settings"),
    sectionCrm: t("sectionCrm"),
    sectionChatbot: t("sectionChatbot"),
    sectionSettings: t("sectionSettings"),
    crmContacts: t("crmContacts"),
    crmCompanies: t("crmCompanies"),
    crmDeals: t("crmDeals"),
    crmActivities: t("crmActivities"),
    crmContracts: t("crmContracts"),
    crmCampaigns: t("crmCampaigns"),
    crmReports: t("crmReports"),
    crmAssistant: t("crmAssistant"),
  };

  return (
    <AdminRoleProvider role={role}>
      <div
        className="flex min-h-screen bg-bg text-fg font-sans"
        dir={locale === "fa" ? "rtl" : "ltr"}
      >
        <AdminSidebar locale={locale} t={navLabels} role={role} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            email={profileData?.email ?? userEmail ?? ""}
            locale={locale}
            navLabels={navLabels}
          />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </AdminRoleProvider>
  );
}
