import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/site/logo";
import { LocaleSwitcher } from "@/components/site/locale-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh place-items-center px-5 py-12">
      <div className="brand-glow pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/">
          <Logo />
        </Link>
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
