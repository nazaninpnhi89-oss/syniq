/**
 * منطقه‌ی زمانی کسب‌وکار (محل تعیین ساعات کاری نازنین).
 * ساعات کاری در availability_rules به این وقت ذخیره می‌شوند و
 * اسلات‌ها بر اساس همین تبدیل به UTC می‌شوند. مقدار را در .env تنظیم کنید.
 */
export const BUSINESS_TIMEZONE =
  process.env.BUSINESS_TIMEZONE || "America/Toronto";

/** حداقل فاصله‌ی زمانی تا اولین اسلات قابل‌رزرو (میلی‌ثانیه) */
export const MIN_LEAD_MS = 60 * 60 * 1000; // ۱ ساعت

/** تعداد روزهای آینده که برای رزرو باز است */
export const BOOKING_WINDOW_DAYS = 30;

export const CONSULTATION_SLUG = "consultation";
