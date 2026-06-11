import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // فارسی پیش‌فرض است؛ برای تغییر به انگلیسی کافی است defaultLocale را "en" کنید.
  locales: ["fa", "en"],
  defaultLocale: "fa",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
