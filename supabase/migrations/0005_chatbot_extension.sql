-- ================================================================
-- 0005_chatbot_extension.sql
-- SYNIQ Chatbot Platform — Multi-channel RAG + Admin Panel
-- ================================================================

-- ============================================================
-- 0. Drop old ivfflat index (required 41 MB — over free plan's 32 MB).
--    We do NOT recreate it here to stay within memory limits.
--    Run the separate index creation SQL after this migration succeeds.
-- ============================================================
drop index if exists public.chat_embeddings_vector_idx;

-- ============================================================
-- 1. unified_users — must come before chat_sessions FK
-- ============================================================
create table if not exists public.unified_users (
  id            uuid    primary key default gen_random_uuid(),
  channel       text    not null check (channel in ('telegram', 'web', 'widget')),
  external_id   text    not null,
  name          text,
  first_seen    timestamptz not null default now(),
  constraint unified_users_channel_external_id_key unique (channel, external_id)
);

-- ============================================================
-- 2. prompt_versions — DB-driven system prompts with versioning
-- ============================================================
create table if not exists public.prompt_versions (
  id          uuid    primary key default gen_random_uuid(),
  content     text    not null,
  persona     text,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

-- At most one active prompt at a time
create unique index if not exists prompt_versions_one_active
  on public.prompt_versions (is_active)
  where is_active = true;

-- ============================================================
-- 3. model_config — per-channel LLM configuration
-- ============================================================
create table if not exists public.model_config (
  id                uuid    primary key default gen_random_uuid(),
  channel           text    not null default 'default',
  provider          text    not null default 'openrouter',
  active_model      text    not null default 'anthropic/claude-haiku-4-5',
  temperature       numeric not null default 0.7,
  max_tokens        int     not null default 1024,
  top_p             numeric not null default 1.0,
  fallback_provider text,
  fallback_model    text,
  schedule          jsonb   not null default '[]'::jsonb,
  updated_at        timestamptz not null default now(),
  constraint model_config_channel_key unique (channel)
);

insert into public.model_config (channel, provider, active_model, temperature, max_tokens, top_p)
values ('default', 'openrouter', 'anthropic/claude-haiku-4-5', 0.7, 1024, 1.0)
on conflict (channel) do nothing;

-- Per-channel overrides
insert into public.model_config (channel, provider, active_model, temperature, max_tokens, top_p)
values
  ('web',      'openrouter', 'anthropic/claude-haiku-4-5', 0.7, 1024, 1.0),
  ('widget',   'openrouter', 'anthropic/claude-haiku-4-5', 0.7, 1024, 1.0),
  ('telegram', 'openrouter', 'anthropic/claude-haiku-4-5', 0.7, 512,  1.0)
on conflict (channel) do nothing;

-- ============================================================
-- 4. embedding_config — RAG embedding provider settings
-- ============================================================
create table if not exists public.embedding_config (
  id                   uuid    primary key default gen_random_uuid(),
  provider             text    not null default 'voyage',
  model                text    not null default 'voyage-3',
  dimensions           int     not null default 1024,
  chunk_size           int     not null default 500,
  chunk_overlap        int     not null default 50,
  top_k                int     not null default 5,
  similarity_threshold numeric not null default 0.65,
  reranker_enabled     boolean not null default false,
  reranker_model       text,
  updated_at           timestamptz not null default now()
);

insert into public.embedding_config
  (provider, model, dimensions, chunk_size, chunk_overlap, top_k, similarity_threshold)
select 'voyage', 'voyage-3', 1024, 500, 50, 5, 0.65
where not exists (select 1 from public.embedding_config);

-- ============================================================
-- 5. feedback — user thumbs up/down on assistant messages
-- ============================================================
create table if not exists public.feedback (
  id         uuid   primary key default gen_random_uuid(),
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  rating     int    not null check (rating in (1, -1)),
  comment    text,
  created_at timestamptz not null default now(),
  constraint feedback_message_id_key unique (message_id)
);

-- ============================================================
-- 6. audit_log — admin action trail
-- ============================================================
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action        text not null,
  target        text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 7. widget_config — embeddable widget customization
-- ============================================================
create table if not exists public.widget_config (
  id                  uuid    primary key default gen_random_uuid(),
  color_primary       text    not null default '#1f7bb5',
  position            text    not null default 'right' check (position in ('left', 'right')),
  welcome_message_fa  text    not null default 'سلام! چطور می‌تونم کمکتون کنم؟',
  welcome_message_en  text    not null default 'Hello! How can I help you today?',
  allowed_domains     text[]  not null default '{}',
  updated_at          timestamptz not null default now()
);

insert into public.widget_config
  (color_primary, position, welcome_message_fa, welcome_message_en, allowed_domains)
select '#1f7bb5', 'right', 'سلام! چطور می‌تونم کمکتون کنم؟', 'Hello! How can I help you today?', '{}'
where not exists (select 1 from public.widget_config);

-- ============================================================
-- 8. Extend chat_sessions
-- ============================================================
alter table public.chat_sessions
  add column if not exists status text not null default 'active'
    check (status in ('active', 'closed', 'handed_off')),
  add column if not exists summary text,
  add column if not exists unified_user_id uuid
    references public.unified_users(id) on delete set null;

-- ============================================================
-- 9. Extend chat_messages
-- ============================================================
alter table public.chat_messages
  add column if not exists model_used        text,
  add column if not exists tokens_in         int,
  add column if not exists tokens_out        int,
  add column if not exists retrieved_chunk_ids uuid[];

-- ============================================================
-- 10. Extend chat_documents
-- ============================================================
alter table public.chat_documents
  add column if not exists source_type text
    check (source_type in ('pdf', 'word', 'text', 'url', 'manual')),
  add column if not exists source_url  text,
  add column if not exists status text not null default 'indexed'
    check (status in ('pending', 'processing', 'indexed', 'failed')),
  add column if not exists tags text[];

-- ============================================================
-- 11. Extend chat_embeddings
-- ============================================================
alter table public.chat_embeddings
  add column if not exists token_count int;
-- chunk_index already exists from 0002_chat.sql

-- ============================================================
-- 12. Extend leads
-- ============================================================
alter table public.leads
  add column if not exists source          text check (source in ('chat', 'form')),
  add column if not exists conversation_id text
    references public.chat_sessions(id) on delete set null;

-- ============================================================
-- 13. match_documents_v2 — accepts vector without fixed size
-- ============================================================
create or replace function public.match_documents_v2(
  query_embedding  vector,
  match_threshold  float,
  match_count      int,
  p_locale         text default 'fa'
)
returns table (
  id         uuid,
  title      text,
  content    text,
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

-- ============================================================
-- 14. get_daily_analytics RPC
-- ============================================================
create or replace function public.get_daily_analytics(
  from_date date default (current_date - interval '30 days')::date,
  to_date   date default current_date
)
returns table (
  day      date,
  sessions bigint,
  messages bigint,
  leads    bigint
)
language plpgsql
as $$
begin
  return query
  select
    d::date as day,
    coalesce((
      select count(*) from public.chat_sessions
      where created_at::date = d::date
    ), 0) as sessions,
    coalesce((
      select count(*) from public.chat_messages cm
      join public.chat_sessions cs on cs.id = cm.session_id
      where cm.created_at::date = d::date
        and cm.role = 'user'
    ), 0) as messages,
    coalesce((
      select count(*) from public.leads
      where created_at::date = d::date
    ), 0) as leads
  from generate_series(from_date::timestamp, to_date::timestamp, interval '1 day') as d
  order by day;
end;
$$;

-- ============================================================
-- 15. RLS for new tables
-- ============================================================
alter table public.unified_users    enable row level security;
alter table public.prompt_versions  enable row level security;
alter table public.model_config     enable row level security;
alter table public.embedding_config enable row level security;
alter table public.feedback         enable row level security;
alter table public.audit_log        enable row level security;
alter table public.widget_config    enable row level security;

-- unified_users: admin read (service role bypasses for writes)
drop policy if exists "unified_users_admin_read" on public.unified_users;
create policy "unified_users_admin_read" on public.unified_users
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- prompt_versions: admin read
drop policy if exists "prompt_versions_admin_read" on public.prompt_versions;
create policy "prompt_versions_admin_read" on public.prompt_versions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- model_config: admin read
drop policy if exists "model_config_admin_read" on public.model_config;
create policy "model_config_admin_read" on public.model_config
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- embedding_config: admin read
drop policy if exists "embedding_config_admin_read" on public.embedding_config;
create policy "embedding_config_admin_read" on public.embedding_config
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- feedback: anyone can insert; admin can read
drop policy if exists "feedback_insert" on public.feedback;
create policy "feedback_insert" on public.feedback
  for insert with check (true);

drop policy if exists "feedback_admin_read" on public.feedback;
create policy "feedback_admin_read" on public.feedback
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- audit_log: admin read only
drop policy if exists "audit_log_admin_read" on public.audit_log;
create policy "audit_log_admin_read" on public.audit_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- widget_config: public read (widget.js needs this without auth)
drop policy if exists "widget_config_public_read" on public.widget_config;
create policy "widget_config_public_read" on public.widget_config
  for select using (true);

-- ============================================================
-- 16. Seed first prompt_versions row (current system prompt as template)
-- ============================================================
insert into public.prompt_versions (content, is_active)
select
$prompt$You are SYNIQ's AI assistant — bilingual in English and Persian (Farsi).

RULES:
- Detect the language the user writes in and ALWAYS respond in that same language.
- ONLY use Persian or English. NEVER use Polish, French, Arabic, or any other language — not even a single word.
- If the user writes in Persian, respond entirely in fluent, natural Persian. Never mix in English words — always use Persian equivalents (مثال: «هوش مصنوعی» نه «AI»، «رزرو» نه «book»، «وب‌سایت» نه «website»، «جلسه» نه «session»). Only the brand name «Syniq» and proper nouns may stay in Latin script.
- Be concise, warm, and professional.
- Use the knowledge base below to answer accurately. If you do not know, say so honestly.
- When asked for the website or site address, share: {{SITE_URL}}
- When a user wants to book, direct them to: {{BOOK_URL}}
- When a user expresses interest in being contacted or shares their info, call the capture_lead tool.
- When a user asks about their booking or payment status, call get_customer_status (ask for email first).

KNOWLEDGE BASE (live from knowledge.json — always up to date):
{{KNOWLEDGE}}

{{RAG_CONTEXT}}$prompt$,
true
where not exists (select 1 from public.prompt_versions where is_active = true);
