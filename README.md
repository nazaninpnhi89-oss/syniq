# SYNIQ — وب‌سایت برند نازنین پناهی

> **Scale Your Next Intelligent Growth** · _Where data becomes direction._

وب‌سایت دو‌زبانه (فارسی RTL + انگلیسی) برند مشاوره‌ی هوش مصنوعی، با لندینگ حرفه‌ای،
ثبت‌نام کاربر، رزرو وقت مشاوره و پرداخت آنلاین. ساخته‌شده با Next.js + Supabase + Stripe،
آماده‌ی انتشار روی Vercel.

---

## امکانات
- 🎨 لندینگ مدرن و کاملاً برندشده (رنگ‌ها/فونت/لحن از روی برند گاید)
- 🌐 دو‌زبانه فارسی (RTL) و انگلیسی (LTR) با کلید تغییر زبان
- 🔐 ثبت‌نام و ورود کاربر (Supabase Auth)
- 📅 رزرو وقت مشاوره با نمایش اسلات‌های خالی و مدیریت تایم‌زون
- 💳 پرداخت آنلاین با Stripe Checkout (دلار/یورو)
- 📧 ایمیل تأیید رزرو (Resend)
- 🗄 دیتابیس Supabase (آماده برای افزودن وبینار/کلاس در آینده)
- 👤 پنل ادمین برای مشاهده‌ی رزروها

## تکنولوژی
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · next-intl · Supabase · Stripe · Resend · motion

---

## راه‌اندازی محلی

### ۱) نصب وابستگی‌ها
```bash
npm install
```

### ۲) متغیرهای محیطی
```bash
cp .env.example .env.local
```
سپس مقادیر را در `.env.local` پر کنید (پایین‌تر توضیح داده شده).

### ۳) اجرا
```bash
npm run dev
```
سایت روی http://localhost:3000 بالا می‌آید (`/` به‌صورت خودکار به `/fa` یا `/en` می‌رود).

> تا وقتی کلیدهای Supabase/Stripe خالی باشند، لندینگ کامل نمایش داده می‌شود اما
> رزرو و ورود غیرفعال است.

---

## پیکربندی سرویس‌ها

### Supabase (دیتابیس + احراز هویت)
1. در [supabase.com](https://supabase.com) یک پروژه بسازید.
2. **SQL Editor** → محتوای `supabase/migrations/0001_init.sql` را اجرا کنید
   (جداول، RLS، خدمت مشاوره و ساعات کاری پیش‌فرض را می‌سازد).
3. **Project Settings → API** → این مقادیر را در `.env.local` بگذارید:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (محرمانه — فقط سرور)
4. **Authentication → Providers → Email** را فعال کنید. برای تست سریع می‌توانید
   «Confirm email» را موقتاً خاموش کنید تا ثبت‌نام بدون تأیید ایمیل وارد شود.

#### تنظیم قیمت و مدت مشاوره
در **Table Editor → services** ردیف `consultation` را ویرایش کنید:
`price_cents` (مثلاً `15000` = ۱۵۰ دلار)، `duration_min`، `currency`.

#### تنظیم ساعات کاری
جدول **availability_rules** را ویرایش کنید. `weekday`: `0`=یکشنبه … `6`=شنبه.
ساعت‌ها به وقت `BUSINESS_TIMEZONE` تفسیر می‌شوند.

#### ادمین کردن حساب خودتان
پس از ثبت‌نام، در **SQL Editor** اجرا کنید:
```sql
update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
```
سپس `/fa/admin` در دسترس شماست.

### Stripe (پرداخت)
1. در [stripe.com](https://stripe.com) حساب بسازید.
2. **Developers → API keys** → بگذارید:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. **Webhook** برای تأیید پرداخت لازم است:
   - محلی: `stripe login` و سپس
     ```bash
     stripe listen --forward-to localhost:3000/api/stripe/webhook
     ```
     مقدار `whsec_...` چاپ‌شده را در `STRIPE_WEBHOOK_SECRET` بگذارید.
   - روی Vercel: در داشبورد Stripe یک Webhook به آدرس
     `https://YOUR_DOMAIN/api/stripe/webhook` با رویداد
     `checkout.session.completed` بسازید و امضای آن را در `STRIPE_WEBHOOK_SECRET` بگذارید.
4. کارت تست: `4242 4242 4242 4242` با هر تاریخ آینده و CVC دلخواه.

### Resend (ایمیل)
1. در [resend.com](https://resend.com) کلید بسازید → `RESEND_API_KEY`.
2. دامنه‌ی فرستنده را تأیید کنید و `EMAIL_FROM` را تنظیم کنید
   (برای تست می‌توانید از `onboarding@resend.dev` استفاده کنید).
3. `ADMIN_EMAIL` = ایمیلی که می‌خواهید اعلان رزرو جدید را بگیرد.

### لینک جلسه (اختیاری)
`MEETING_LINK` در env = لینک ثابت جلسه (Google Meet/Zoom) که در ایمیل تأیید برای مشتری ارسال می‌شود.

### منطقه‌ی زمانی
`BUSINESS_TIMEZONE` (مثل `America/Toronto` یا `Asia/Tehran`) منطقه‌ی زمانی شماست که
ساعات کاری بر اساس آن تعریف می‌شوند. اسلات‌ها برای هر کاربر به وقت محلی خودش نمایش داده می‌شوند.

---

## انتشار روی Vercel
1. پروژه را به یک ریپوی GitHub پوش کنید.
2. در [vercel.com](https://vercel.com) ریپو را Import کنید.
3. همه‌ی متغیرهای `.env.local` را در **Project Settings → Environment Variables** اضافه کنید
   (با این تفاوت که `NEXT_PUBLIC_SITE_URL` را روی دامنه‌ی واقعی بگذارید).
4. Deploy.
5. Webhook استرایپ را روی دامنه‌ی production تنظیم کنید (بالا توضیح داده شد).

---

## ساختار پروژه
```
src/
  app/[locale]/            # صفحات دو‌زبانه (لندینگ، رزرو، ورود، داشبورد، ادمین)
  app/api/                 # slots / checkout / stripe webhook
  components/              # site (هدر/فوتر)، sections (بخش‌های لندینگ)، booking، auth، ui
  i18n/                    # پیکربندی next-intl
  lib/                     # supabase، stripe، email، slots، days، config
  proxy.ts                 # (جایگزین middleware در Next 16) i18n + رفرش نشست
messages/{fa,en}.json      # تمام متن‌های سایت
supabase/migrations/       # اسکیمای دیتابیس
```

## چیزهایی که باید جایگزین شوند (placeholder)
- **عکس نازنین**: در `hero.tsx` و `about.tsx` به‌جای نشان «AI» قرار می‌گیرد.
- **بیوگرافی**: متن `about.body` در `messages/fa.json` و `messages/en.json`.
- **قیمت مشاوره**: ردیف `services` در Supabase.
