-- ===== SYNIQ — اسکیمای اولیه =====
-- این فایل را در Supabase → SQL Editor اجرا کنید (یا با Supabase CLI).

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  locale text default 'fa',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- ساخت خودکار پروفایل هنگام ثبت‌نام کاربر جدید
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- services ----------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_fa text not null,
  title_en text not null,
  desc_fa text,
  desc_en text,
  duration_min int not null default 45,
  price_cents int not null default 0,      -- به کوچک‌ترین واحد ارز (مثلاً سنت)
  currency text not null default 'usd',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- خدمت اولیه: مشاوره (قیمت را در داشبورد/همین‌جا ویرایش کنید)
insert into public.services (slug, title_fa, title_en, desc_fa, desc_en, duration_min, price_cents, currency, is_active)
values (
  'consultation',
  'مشاوره استراتژی هوش مصنوعی',
  'AI Strategy Consultation',
  'یک جلسه‌ی اختصاصی برای تعیین اینکه هوش مصنوعی کجا بیشترین بازده را برای کسب‌وکار شما دارد.',
  'A focused session to map where AI delivers the highest ROI for your business.',
  45,
  15000,   -- مثال: ۱۵۰ دلار — مقدار واقعی را بگذارید
  'usd',
  true
)
on conflict (slug) do nothing;

-- ---------- availability_rules ----------
-- ساعات کاری نازنین به وقت BUSINESS_TIMEZONE (پیش‌فرض روزهای دوشنبه تا جمعه ۹ تا ۱۷)
create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6), -- 0=یکشنبه ... 6=شنبه
  start_time time not null,
  end_time time not null
);

insert into public.availability_rules (weekday, start_time, end_time)
select wd, '09:00', '17:00'
from unnest(array[1,2,3,4,5]) as wd  -- دوشنبه تا جمعه
where not exists (select 1 from public.availability_rules);

-- ---------- bookings ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.services(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','paid','confirmed','cancelled')),
  stripe_session_id text,
  amount_cents int,
  currency text,
  meet_link text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_idx on public.bookings(user_id);
create index if not exists bookings_start_idx on public.bookings(start_at);
-- جلوگیری از رزرو هم‌زمان دو نفر برای یک بازه (برای رزروهای فعال)
create unique index if not exists bookings_unique_active_slot
  on public.bookings(start_at)
  where status in ('pending','paid','confirmed');

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.bookings enable row level security;

-- profiles: هر کاربر فقط خودش
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- services و availability: خواندن عمومی
drop policy if exists "services_public_read" on public.services;
create policy "services_public_read" on public.services
  for select using (true);
drop policy if exists "availability_public_read" on public.availability_rules;
create policy "availability_public_read" on public.availability_rules
  for select using (true);

-- bookings: کاربر فقط رزروهای خودش را می‌بیند و می‌سازد
drop policy if exists "bookings_self_select" on public.bookings;
create policy "bookings_self_select" on public.bookings
  for select using (auth.uid() = user_id);
drop policy if exists "bookings_self_insert" on public.bookings;
create policy "bookings_self_insert" on public.bookings
  for insert with check (auth.uid() = user_id);

-- توجه: آپدیت وضعیت پرداخت توسط Webhook با کلید service_role انجام می‌شود که RLS را دور می‌زند.
-- توجه: دسترسی ادمین (نازنین) به همه‌ی رزروها از طریق کلید service_role در صفحه‌ی /admin انجام می‌شود.
