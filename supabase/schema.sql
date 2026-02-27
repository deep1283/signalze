-- Mention Tracker core schema
-- Apply this in Supabase SQL editor or via migrations.

create extension if not exists pgcrypto;

create type public.plan_tier as enum ('starter_9', 'growth_15');
create type public.source_name as enum ('reddit', 'hackernews', 'devto');
create type public.alert_status as enum ('pending', 'sent', 'failed', 'dead_letter');

create table if not exists public.plan_limits (
  plan_tier public.plan_tier primary key,
  max_brands integer,
  max_keywords integer not null check (max_keywords > 0),
  updated_at timestamptz not null default now()
);

insert into public.plan_limits (plan_tier, max_brands, max_keywords)
values
  ('starter_9', 1, 7),
  ('growth_15', null, 35)
on conflict (plan_tier) do update
set max_brands = excluded.max_brands,
    max_keywords = excluded.max_keywords,
    updated_at = now();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan_tier public.plan_tier not null default 'starter_9',
  billing_mode text check (billing_mode in ('trial', 'paid')),
  plan_selected_at timestamptz,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  onboarding_completed boolean not null default false,
  slack_webhook_url_enc text,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists billing_mode text;
alter table public.profiles add column if not exists plan_selected_at timestamptz;
alter table public.profiles add column if not exists trial_started_at timestamptz;
alter table public.profiles add column if not exists trial_ends_at timestamptz;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles drop constraint if exists profiles_billing_mode_check;
alter table public.profiles add constraint profiles_billing_mode_check check (billing_mode in ('trial', 'paid'));

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brands_user_name_lower_uq
  on public.brands(user_id, lower(name));

create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  query text not null,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint keyword_query_len check (char_length(btrim(query)) between 2 and 120)
);

create unique index if not exists keywords_user_brand_query_lower_uq
  on public.keywords(user_id, coalesce(brand_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(query)));

create table if not exists public.keyword_sources (
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  source public.source_name not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (keyword_id, source)
);

create table if not exists public.mentions (
  id bigint generated always as identity primary key,
  platform public.source_name not null,
  external_id text not null,
  url text not null,
  title text,
  body_excerpt text,
  author text,
  community text,
  published_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (platform, external_id)
);

create index if not exists mentions_platform_published_idx
  on public.mentions(platform, published_at desc);

create table if not exists public.mention_matches (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  mention_id bigint not null references public.mentions(id) on delete cascade,
  matched_query text not null,
  matched_at timestamptz not null default now(),
  unique (user_id, mention_id, keyword_id)
);

create index if not exists mention_matches_user_time_idx
  on public.mention_matches(user_id, matched_at desc);

create table if not exists public.alert_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mention_id bigint not null references public.mentions(id) on delete cascade,
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  channel text not null default 'slack_webhook',
  status public.alert_status not null default 'pending',
  retry_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mention_id, keyword_id, channel)
);

create index if not exists alert_deliveries_pending_idx
  on public.alert_deliveries(status, next_attempt_at)
  where status in ('pending', 'failed');

create table if not exists public.keyword_source_state (
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  source public.source_name not null,
  last_checked_at timestamptz,
  cursor text,
  next_poll_at timestamptz not null default now(),
  last_error text,
  updated_at timestamptz not null default now(),
  primary key (keyword_id, source)
);

create index if not exists keyword_source_state_next_poll_idx
  on public.keyword_source_state(next_poll_at);

create table if not exists public.worker_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'failed')),
  stats jsonb not null default '{}'::jsonb,
  error text
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists set_keywords_updated_at on public.keywords;
create trigger set_keywords_updated_at
before update on public.keywords
for each row execute function public.set_updated_at();

drop trigger if exists set_keyword_sources_updated_at on public.keyword_sources;
create trigger set_keyword_sources_updated_at
before update on public.keyword_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_alert_deliveries_updated_at on public.alert_deliveries;
create trigger set_alert_deliveries_updated_at
before update on public.alert_deliveries
for each row execute function public.set_updated_at();

drop trigger if exists set_keyword_source_state_updated_at on public.keyword_source_state;
create trigger set_keyword_source_state_updated_at
before update on public.keyword_source_state
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- sync auth.users -> profiles
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.enforce_plan_limits()
returns trigger
language plpgsql
as $$
declare
  tier public.plan_tier;
  allowed_brands integer;
  allowed_keywords integer;
  brand_count integer;
  keyword_count integer;
begin
  select p.plan_tier, l.max_brands, l.max_keywords
    into tier, allowed_brands, allowed_keywords
  from public.profiles p
  join public.plan_limits l on l.plan_tier = p.plan_tier
  where p.id = new.user_id;

  if tier is null then
    raise exception 'Profile not found for user_id=%', new.user_id;
  end if;

  if tg_table_name = 'brands' then
    if new.is_active then
      select count(*) into brand_count
      from public.brands b
      where b.user_id = new.user_id
        and b.is_active
        and (tg_op = 'INSERT' or b.id <> new.id);

      if allowed_brands is not null and brand_count >= allowed_brands then
        raise exception 'Plan % allows at most % active brand(s). Upgrade required.', tier, allowed_brands;
      end if;
    end if;
  elsif tg_table_name = 'keywords' then
    if new.is_active then
      select count(*) into keyword_count
      from public.keywords k
      where k.user_id = new.user_id
        and k.is_active
        and not k.is_system
        and (tg_op = 'INSERT' or k.id <> new.id);

      if keyword_count >= allowed_keywords then
        raise exception 'Plan % allows at most % active keyword(s). Upgrade required.', tier, allowed_keywords;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_brand_plan_limits on public.brands;
create trigger enforce_brand_plan_limits
before insert or update of user_id, is_active on public.brands
for each row execute function public.enforce_plan_limits();

drop trigger if exists enforce_keyword_plan_limits on public.keywords;
create trigger enforce_keyword_plan_limits
before insert or update of user_id, is_active on public.keywords
for each row execute function public.enforce_plan_limits();

create or replace function public.seed_keyword_sources_and_state()
returns trigger
language plpgsql
as $$
begin
  insert into public.keyword_sources (keyword_id, source, enabled)
  values
    (new.id, 'reddit', true),
    (new.id, 'hackernews', true),
    (new.id, 'devto', false)
  on conflict (keyword_id, source) do nothing;

  insert into public.keyword_source_state (keyword_id, source, next_poll_at)
  values
    (new.id, 'reddit', now()),
    (new.id, 'hackernews', now()),
    (new.id, 'devto', now())
  on conflict (keyword_id, source) do nothing;

  return new;
end;
$$;

drop trigger if exists seed_keyword_source_defaults on public.keywords;
create trigger seed_keyword_source_defaults
after insert on public.keywords
for each row execute function public.seed_keyword_sources_and_state();

create or replace function public.sync_brand_system_keyword()
returns trigger
language plpgsql
as $$
declare
  existing_keyword_id uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.keywords (user_id, brand_id, query, is_system, is_active)
    values (new.user_id, new.id, new.name, true, new.is_active)
    on conflict do nothing;
  elsif tg_op = 'UPDATE' then
    select id into existing_keyword_id
    from public.keywords
    where brand_id = new.id
      and is_system = true
    limit 1;

    if existing_keyword_id is null then
      insert into public.keywords (user_id, brand_id, query, is_system, is_active)
      values (new.user_id, new.id, new.name, true, new.is_active)
      on conflict do nothing;
    else
      update public.keywords
      set query = new.name,
          is_active = new.is_active
      where id = existing_keyword_id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.delete_brand_system_keyword()
returns trigger
language plpgsql
as $$
begin
  delete from public.keywords
  where brand_id = old.id
    and is_system = true;

  return old;
end;
$$;

drop trigger if exists brand_system_keyword_insert on public.brands;
create trigger brand_system_keyword_insert
after insert on public.brands
for each row execute function public.sync_brand_system_keyword();

drop trigger if exists brand_system_keyword_update on public.brands;
create trigger brand_system_keyword_update
after update of name, is_active on public.brands
for each row execute function public.sync_brand_system_keyword();

drop trigger if exists brand_system_keyword_delete on public.brands;
create trigger brand_system_keyword_delete
before delete on public.brands
for each row execute function public.delete_brand_system_keyword();

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.keywords enable row level security;
alter table public.keyword_sources enable row level security;
alter table public.mentions enable row level security;
alter table public.mention_matches enable row level security;
alter table public.alert_deliveries enable row level security;
alter table public.keyword_source_state enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "brands_owner_all" on public.brands;
create policy "brands_owner_all"
on public.brands for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "keywords_owner_all" on public.keywords;
create policy "keywords_owner_all"
on public.keywords for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "keyword_sources_owner_all" on public.keyword_sources;
create policy "keyword_sources_owner_all"
on public.keyword_sources for all
using (
  exists (
    select 1
    from public.keywords k
    where k.id = keyword_sources.keyword_id
      and k.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.keywords k
    where k.id = keyword_sources.keyword_id
      and k.user_id = auth.uid()
  )
);

drop policy if exists "mentions_select_for_owner" on public.mentions;
create policy "mentions_select_for_owner"
on public.mentions for select
using (
  exists (
    select 1
    from public.mention_matches mm
    where mm.mention_id = mentions.id
      and mm.user_id = auth.uid()
  )
);

drop policy if exists "mention_matches_owner_all" on public.mention_matches;
create policy "mention_matches_owner_all"
on public.mention_matches for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "alert_deliveries_owner_select" on public.alert_deliveries;
create policy "alert_deliveries_owner_select"
on public.alert_deliveries for select
using (auth.uid() = user_id);

drop policy if exists "keyword_source_state_owner_select" on public.keyword_source_state;
create policy "keyword_source_state_owner_select"
on public.keyword_source_state for select
using (
  exists (
    select 1
    from public.keywords k
    where k.id = keyword_source_state.keyword_id
      and k.user_id = auth.uid()
  )
);
