-- ===== SYNIQ — اسکلت خدمات آینده (وبینار و دوره‌ی آنلاین) =====
-- این فایل را بعد از 0001_init.sql اجرا کنید.
-- هدف: آماده‌سازی دیتابیس برای وبینارها و کلاس‌های آنلاینِ آینده،
-- بدون اینکه روی جریان فعلیِ مشاوره/رزرو اثری بگذارد.

-- ---------- webinars ----------
create table if not exists public.webinars (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_fa text not null,
  title_en text not null,
  desc_fa text,
  desc_en text,
  starts_at timestamptz,             -- زمان برگزاری
  duration_min int not null default 60,
  capacity int,                      -- ظرفیت (null = نامحدود)
  price_cents int not null default 0,
  currency text not null default 'usd',
  join_url text,                     -- لینک ورود (Zoom/Meet) — بعد از ثبت‌نام نمایش داده می‌شود
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- courses ----------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_fa text not null,
  title_en text not null,
  desc_fa text,
  desc_en text,
  price_cents int not null default 0,
  currency text not null default 'usd',
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- enrollments ----------
-- ثبت‌نام کاربر در یک وبینار یا دوره (دقیقاً یکی از دو ستون پر می‌شود).
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  webinar_id uuid references public.webinars(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','paid','confirmed','cancelled')),
  stripe_session_id text,
  amount_cents int,
  currency text,
  created_at timestamptz not null default now(),
  constraint enrollment_target_exactly_one check (
    (webinar_id is not null)::int + (course_id is not null)::int = 1
  )
);

create index if not exists enrollments_user_idx on public.enrollments(user_id);
create unique index if not exists enrollments_unique_webinar
  on public.enrollments(user_id, webinar_id)
  where webinar_id is not null and status in ('pending','paid','confirmed');
create unique index if not exists enrollments_unique_course
  on public.enrollments(user_id, course_id)
  where course_id is not null and status in ('pending','paid','confirmed');

-- ---------- Row Level Security ----------
alter table public.webinars enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;

-- وبینار/دوره‌ی منتشرشده برای همه قابل‌خواندن است
drop policy if exists "webinars_public_read" on public.webinars;
create policy "webinars_public_read" on public.webinars
  for select using (is_published = true);
drop policy if exists "courses_public_read" on public.courses;
create policy "courses_public_read" on public.courses
  for select using (is_published = true);

-- ثبت‌نام: هر کاربر فقط ثبت‌نام‌های خودش را می‌بیند و می‌سازد
drop policy if exists "enrollments_self_select" on public.enrollments;
create policy "enrollments_self_select" on public.enrollments
  for select using (auth.uid() = user_id);
drop policy if exists "enrollments_self_insert" on public.enrollments;
create policy "enrollments_self_insert" on public.enrollments
  for insert with check (auth.uid() = user_id);

-- توجه: به‌روزرسانی وضعیت پرداخت توسط Webhook استرایپ با کلید service_role انجام می‌شود (RLS را دور می‌زند).
