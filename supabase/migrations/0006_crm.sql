-- ================================================================
-- 0006_crm.sql
-- SYNIQ CRM — companies, contacts, pipeline, deals, activities,
-- contracts, campaigns, 5-tier admin roles.
-- Idempotent: safe to re-run.
-- ================================================================

-- ============================================================
-- 1. profiles — widen role to 5-tier admin hierarchy
--    ('user' untouched — public booking/dashboard customers)
-- ============================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'owner', 'admin', 'editor', 'operator', 'viewer'));

alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists last_login_at timestamptz;

-- ============================================================
-- 2. companies
-- ============================================================
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  industry    text,
  website     text,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

create index if not exists companies_name_idx on public.companies (name);

-- ============================================================
-- 3. contacts
-- ============================================================
create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references public.companies(id) on delete set null,
  full_name       text not null,
  email           text,
  phone           text,
  title           text,
  source          text,
  lead_id         uuid references public.leads(id) on delete set null,
  conversation_id text references public.chat_sessions(id) on delete set null,
  ai_summary      text,
  ai_summary_at   timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null
);

create index if not exists contacts_company_idx on public.contacts (company_id);
create index if not exists contacts_lead_idx on public.contacts (lead_id);
create index if not exists contacts_email_idx on public.contacts (email);

-- ============================================================
-- 4. pipeline_stages — config-driven kanban columns
-- ============================================================
create table if not exists public.pipeline_stages (
  key         text primary key,
  label_fa    text not null,
  label_en    text not null,
  sort_order  int not null,
  is_won      boolean not null default false,
  is_lost     boolean not null default false
);

insert into public.pipeline_stages (key, label_fa, label_en, sort_order, is_won, is_lost) values
  ('new',         'جدید',                'New',           1, false, false),
  ('reviewing',   'در حال بررسی',        'Reviewing',     2, false, false),
  ('consult',     'جلسه مشاوره',         'Consultation',  3, false, false),
  ('proposal',    'ارسال پروپوزال',      'Proposal Sent', 4, false, false),
  ('negotiation', 'مذاکره',              'Negotiation',   5, false, false),
  ('won',         'بسته‌شده موفق',        'Closed Won',    6, true,  false),
  ('lost',        'بسته‌شده ناموفق',      'Closed Lost',   7, false, true)
on conflict (key) do nothing;

-- ============================================================
-- 5. deals
-- ============================================================
create table if not exists public.deals (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  contact_id          uuid references public.contacts(id) on delete cascade,
  company_id          uuid references public.companies(id) on delete set null,
  stage_key           text not null default 'new' references public.pipeline_stages(key),
  amount_toman        bigint,
  status              text not null default 'open' check (status in ('open', 'won', 'lost')),
  lost_reason         text,
  ai_next_action      text,
  ai_next_action_at   timestamptz,
  expected_close_date date,
  stage_entered_at    timestamptz not null default now(),
  won_at              timestamptz,
  lost_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null
);

create index if not exists deals_stage_idx on public.deals (stage_key);
create index if not exists deals_contact_idx on public.deals (contact_id);

-- ============================================================
-- 6. activities — calls/meetings/notes/tasks/stage-change log
-- ============================================================
create table if not exists public.activities (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid references public.contacts(id) on delete cascade,
  deal_id       uuid references public.deals(id) on delete cascade,
  type          text not null check (type in ('call', 'meeting', 'note', 'task', 'stage_change')),
  title         text not null,
  body          text,
  due_at        timestamptz,
  completed_at  timestamptz,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

create index if not exists activities_contact_idx on public.activities (contact_id, created_at desc);
create index if not exists activities_deal_idx on public.activities (deal_id, created_at desc);
create index if not exists activities_due_idx on public.activities (due_at)
  where type = 'task' and completed_at is null;

-- ============================================================
-- 7. leads — canonicalize status enum, drop source whitelist,
--    add CRM linkage + AI scoring columns
-- ============================================================
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'converted', 'closed'));

-- source is validated at the application layer (zod) instead of a DB
-- whitelist, since the source vocabulary is expected to keep growing
-- (chatbot/website/manual/referral/import/campaign...).
alter table public.leads drop constraint if exists leads_source_check;

alter table public.leads
  add column if not exists converted_at       timestamptz,
  add column if not exists contact_id         uuid references public.contacts(id) on delete set null,
  add column if not exists ai_score           int check (ai_score between 0 and 100),
  add column if not exists ai_score_rationale text,
  add column if not exists ai_scored_at       timestamptz;

-- ============================================================
-- 8. contracts
-- ============================================================
create table if not exists public.contracts (
  id                uuid primary key default gen_random_uuid(),
  number            text not null unique,
  deal_id           uuid references public.deals(id) on delete set null,
  contact_id        uuid references public.contacts(id) on delete set null,
  company_id        uuid references public.companies(id) on delete set null,
  title             text not null,
  body_md           text not null,
  amount_toman      bigint,
  start_date        date,
  duration_label    text,
  status            text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'canceled')),
  share_token       uuid not null default gen_random_uuid() unique,
  sent_at           timestamptz,
  first_viewed_at   timestamptz,
  accepted_at       timestamptz,
  accepted_by_name  text,
  canceled_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null
);

create index if not exists contracts_deal_idx on public.contracts (deal_id);
create index if not exists contracts_share_token_idx on public.contracts (share_token);

-- ============================================================
-- 9. campaigns / campaign_emails
-- ============================================================
create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  segment_key       text not null,
  segment_def       jsonb not null default '{}'::jsonb,
  goal              text,
  status            text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'canceled')),
  created_at        timestamptz not null default now(),
  sent_at           timestamptz,
  created_by        uuid references auth.users(id) on delete set null
);

create table if not exists public.campaign_emails (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  contact_id    uuid references public.contacts(id) on delete set null,
  lead_id       uuid references public.leads(id) on delete set null,
  to_name       text,
  to_email      text not null,
  context       jsonb not null default '{}'::jsonb,
  subject       text,
  body_text     text,
  status        text not null default 'pending'
    check (status in ('pending', 'ready', 'approved', 'skipped', 'rejected', 'sent', 'failed')),
  resend_id     text,
  error         text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

create index if not exists campaign_emails_campaign_idx on public.campaign_emails (campaign_id);

-- ============================================================
-- 10. model_config — seed a 'crm' channel for AI features
-- ============================================================
insert into public.model_config (channel, provider, active_model, temperature, max_tokens, top_p)
values ('crm', 'groq', 'llama-3.3-70b-versatile', 0.3, 2048, 1.0)
on conflict (channel) do nothing;

-- ============================================================
-- 11. RLS for new tables — admin-panel read (any of the 5 tiers);
--     writes go through the service-role client after an app-layer
--     role check, matching the existing convention (see 0005).
-- ============================================================
alter table public.companies      enable row level security;
alter table public.contacts       enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals          enable row level security;
alter table public.activities     enable row level security;
alter table public.contracts      enable row level security;
alter table public.campaigns      enable row level security;
alter table public.campaign_emails enable row level security;

drop policy if exists "companies_admin_read" on public.companies;
create policy "companies_admin_read" on public.companies
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

drop policy if exists "contacts_admin_read" on public.contacts;
create policy "contacts_admin_read" on public.contacts
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

drop policy if exists "pipeline_stages_admin_read" on public.pipeline_stages;
create policy "pipeline_stages_admin_read" on public.pipeline_stages
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

drop policy if exists "deals_admin_read" on public.deals;
create policy "deals_admin_read" on public.deals
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

drop policy if exists "activities_admin_read" on public.activities;
create policy "activities_admin_read" on public.activities
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

drop policy if exists "contracts_admin_read" on public.contracts;
create policy "contracts_admin_read" on public.contracts
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

drop policy if exists "campaigns_admin_read" on public.campaigns;
create policy "campaigns_admin_read" on public.campaigns
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

drop policy if exists "campaign_emails_admin_read" on public.campaign_emails;
create policy "campaign_emails_admin_read" on public.campaign_emails
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('owner', 'admin', 'editor', 'operator', 'viewer')
    )
  );

-- Note: public.contracts has no public RLS policy for the share-token
-- page — that page is server-rendered and reads via the service-role
-- client (createAdminClient()), matching how leads_insert/other
-- unauthenticated writes are handled elsewhere without RLS exposure.
