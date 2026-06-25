-- ===== SYNIQ Chatbot — اسکیمای هوش مصنوعی گفتگو =====
-- pgvector را فعال می‌کند، شش جدول می‌سازد و داده‌های RAG اولیه را بارگذاری می‌کند.

-- ---------- pgvector extension ----------
create extension if not exists vector with schema extensions;

-- ---------- chat_documents ----------
create table if not exists public.chat_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  locale text not null default 'fa',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- chat_embeddings ----------
create table if not exists public.chat_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.chat_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1024),
  created_at timestamptz not null default now()
);

create index if not exists chat_embeddings_vector_idx
  on public.chat_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ---------- chat_sessions ----------
create table if not exists public.chat_sessions (
  id text primary key,
  locale text not null default 'fa',
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('telegram', 'web', 'widget')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- chat_messages ----------
create table if not exists public.chat_messages (
  id bigint primary key generated always as identity,
  session_id text not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx
  on public.chat_messages(session_id, created_at);

-- ---------- leads ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  session_id text references public.chat_sessions(id) on delete set null,
  name text not null,
  phone text,
  email text,
  service_interest text,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted')),
  created_at timestamptz not null default now()
);

-- ---------- registrations ----------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  service_slug text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.chat_documents enable row level security;
alter table public.chat_embeddings enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.leads enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "chat_documents_public_read" on public.chat_documents;
create policy "chat_documents_public_read" on public.chat_documents
  for select using (true);

drop policy if exists "chat_sessions_insert" on public.chat_sessions;
create policy "chat_sessions_insert" on public.chat_sessions
  for insert with check (true);

drop policy if exists "chat_sessions_select" on public.chat_sessions;
create policy "chat_sessions_select" on public.chat_sessions
  for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert with check (true);

drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select" on public.chat_messages
  for select using (true);

drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads
  for insert with check (true);

-- ---------- match_documents RPC (pgvector similarity search) ----------
create or replace function public.match_documents(
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  p_locale text default 'fa'
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    cd.id,
    cd.title,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.chat_embeddings ce
  join public.chat_documents cd on cd.id = ce.document_id
  where 1 - (ce.embedding <=> query_embedding) > match_threshold
    and cd.locale = p_locale
  order by similarity desc
  limit match_count;
end;
$$;

-- ---------- Seed RAG Documents (Persian) ----------
insert into public.chat_documents (title, content, locale) values
(
  'معرفی SYNIQ',
  'SYNIQ یک برند مشاوره هوش مصنوعی B2B است که به کسب‌وکارها کمک می‌کند عملیات را خودکار، فرایندها را بهینه و رشد را با سیستم‌های مبتنی بر هوش مصنوعی شتاب‌دار کنند. شعار ما: "Where data becomes direction" — جایی که داده به مسیر تبدیل می‌شود. خدمات اصلی شامل مشاوره استراتژی هوش مصنوعی، وبینارهای زنده و دوره‌های آنلاین است.',
  'fa'
),
(
  'خدمات مشاوره استراتژی هوش مصنوعی',
  'یک جلسه اختصاصی و متمرکز برای تعیین اینکه هوش مصنوعی کجا بیشترین بازده را برای کسب‌وکار شما دارد. مدت جلسه ۴۵ دقیقه، به صورت آنلاین. هزینه جلسه ۱۵۰ دلار. همراه با یک برنامه عملی روشن که می‌توانید اجرا کنید. برای رزرو به صفحه رزرو مشاوره مراجعه کنید یا همینجا درخواست دهید.',
  'fa'
),
(
  'فرایند همکاری با SYNIQ',
  'فرایند کار در ۴ مرحله: ۱. مشاوره — اهداف شما و جایی که هوش مصنوعی بیشترین ارزش را دارد مشخص می‌کنیم. ۲. طراحی — نقشه یک سیستم هوش مصنوعی اختصاصی، متناسب با داده‌های شما. ۳. اجرا — پیاده‌سازی و یکپارچه‌سازی در فرایندهای روزمره شما. ۴. بهینه‌سازی — اندازه‌گیری، اصلاح و بزرگ‌تر کردن نتایج. کل فرایند حدود ۳۰ روز تا تحویل نتیجه اولیه زمان می‌برد.',
  'fa'
),
(
  'ارزش‌های SYNIQ',
  'نوآوری مستمر: همیشه یک قدم جلوتر؛ فناوری روز را به حرکت بعدی تبدیل می‌کنیم. اعتماد و شفافیت: رابطه بر پایه صداقت کامل و داده روشن ساخته می‌شود. تفکر جهانی: راهکارها برای هر جای دنیا قابل استفاده‌اند. مشارکت واقعی: همکاری شانه‌به‌شانه با شما برای موفقیت مشترک. تأثیر ملموس: هر راهکار باید نتیجه واقعی و قابل‌اندازه‌گیری داشته باشد.',
  'fa'
),
(
  'رویکرد و مزیت رقابتی SYNIQ',
  'سیستم‌ها حول کسب‌وکار شما طراحی می‌شوند، نه یک قالب آماده. تصمیم‌ها با داده گرفته می‌شوند، نه با حدس و گمان. از ابتدا تا اجرا، مستقیم با خود نازنین پناهی در ارتباطید. تمرکز بر ROI و بازگشت سرمایه: نتایج قابل اندازه‌گیری در ۶۰ روز. ساخته شده حول داده‌های شما، متمرکز بر بازده.',
  'fa'
),
(
  'وبینارها و دوره‌های آموزشی',
  'وبینارهای زنده: جلسات گروهی زنده درباره کاربردهای عملی هوش مصنوعی در کسب‌وکار. دوره‌های آنلاین: آموزش گام‌به‌گام برای پیاده‌سازی هوش مصنوعی در تیم و عملیات شما. این خدمات به‌زودی ارائه می‌شوند. برای اطلاع از تاریخ شروع، در خبرنامه عضو شوید یا با ما تماس بگیرید.',
  'fa'
),
(
  'درباره نازنین پناهی',
  'نازنین پناهی مشاور هوش مصنوعی B2B است. او به بنیان‌گذاران و مدیران کمک می‌کند هوش مصنوعی را از یک شعار به رشد قابل‌اندازه‌گیری تبدیل کنند. تخصص اصلی: مشاوره استراتژی هوش مصنوعی، اتوماسیون عملیات، بهینه‌سازی فرایندها. سابقه کار با استارتاپ‌های سلامت‌محور، گروه‌های لجستیک و شرکت‌های SaaS.',
  'fa'
),
(
  'نتایج مشتریان SYNIQ',
  'نظر سارا ک. بنیان‌گذار و مدیرعامل استارتاپ سلامت‌محور: "نازنین در یک جلسه کل فرصت‌های هوش مصنوعی ما را شناسایی کرد. در طول سه هفته نمونه‌ای راه‌اندازی کردیم که زمان پردازش داده را نصف کرد." نظر داوید ر. مدیر ارشد عملیات گروه لجستیک: "با شک وارد شدیم. SYNIQ استراتژی شفافی ارائه داد و در ۳۰ روز نتایج قابل‌اندازه‌گیری دیدیم."',
  'fa'
)
on conflict do nothing;

-- ---------- Seed RAG Documents (English) ----------
insert into public.chat_documents (title, content, locale) values
(
  'About SYNIQ',
  'SYNIQ is a B2B AI consulting brand that helps businesses automate operations, optimize workflows, and accelerate growth through AI-powered systems. Our tagline: "Where data becomes direction." Core services include AI strategy consultation, live webinars, and online courses.',
  'en'
),
(
  'AI Strategy Consultation Service',
  'A focused one-to-one session to map where AI delivers the highest ROI for your business. Duration: 45 minutes, online. Price: $150. Includes a clear action plan you can execute. Book via the consultation booking page or request through this chat.',
  'en'
),
(
  'SYNIQ Collaboration Process',
  'Our 4-step process: 1. Consult — map your goals and where AI delivers the most value. 2. Design — a custom AI system blueprint tailored to your data. 3. Build — implement and integrate into your daily workflows. 4. Optimize — measure, refine, and scale the results. Initial results delivered in approximately 30 days.',
  'en'
),
(
  'SYNIQ Values',
  'Continuous innovation: always a step ahead — today''s technology turned into your next move. Trust and transparency: relationships built on full honesty and clear data. Global thinking: solutions that work anywhere in the world. Real partnership: working shoulder to shoulder with you for shared success. Tangible impact: every solution must deliver a real, measurable result.',
  'en'
),
(
  'About Nazanin Panahi',
  'Nazanin Panahi is a B2B AI consultant who helps founders and executives turn AI from hype into measurable growth. Core expertise: AI strategy consulting, operations automation, process optimization. Experience working with health-tech startups, logistics groups, and SaaS companies.',
  'en'
)
on conflict do nothing;
