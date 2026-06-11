import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** نمونه‌ی Stripe را به‌صورت تنبل می‌سازد تا نبودن کلید، بیلد را نشکند. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY تنظیم نشده است.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}
