-- Durable webhook idempotency + distributed API rate limiting

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists webhook_events_received_at_idx
  on public.webhook_events(received_at desc);

create table if not exists public.api_rate_limits (
  bucket text primary key,
  count integer not null,
  window_started_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists api_rate_limits_window_started_idx
  on public.api_rate_limits(window_started_at);

create or replace function public.take_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  current_count integer;
  window_start timestamptz;
  window_secs integer := greatest(p_window_seconds, 1);
  effective_limit integer := greatest(p_limit, 1);
  reset_at timestamptz;
begin
  if p_bucket is null or btrim(p_bucket) = '' then
    raise exception 'Rate limit bucket cannot be empty';
  end if;

  insert into public.api_rate_limits as arl (bucket, count, window_started_at, updated_at)
  values (p_bucket, 1, now_ts, now_ts)
  on conflict (bucket)
  do update set
    count = case
      when arl.window_started_at + make_interval(secs => window_secs) <= now_ts then 1
      else arl.count + 1
    end,
    window_started_at = case
      when arl.window_started_at + make_interval(secs => window_secs) <= now_ts then now_ts
      else arl.window_started_at
    end,
    updated_at = now_ts;

  select count, window_started_at
    into current_count, window_start
  from public.api_rate_limits
  where bucket = p_bucket;

  reset_at := window_start + make_interval(secs => window_secs);

  if current_count > effective_limit then
    return query
      select
        false,
        0,
        greatest(ceil(extract(epoch from (reset_at - now_ts)))::integer, 1);
  else
    return query
      select
        true,
        greatest(effective_limit - current_count, 0),
        greatest(ceil(extract(epoch from (reset_at - now_ts)))::integer, 1);
  end if;
end;
$$;

revoke all on function public.take_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_rate_limit(text, integer, integer) to service_role;

alter table public.webhook_events enable row level security;
alter table public.api_rate_limits enable row level security;

drop policy if exists "webhook_events_service_role_only" on public.webhook_events;
create policy "webhook_events_service_role_only"
on public.webhook_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "api_rate_limits_service_role_only" on public.api_rate_limits;
create policy "api_rate_limits_service_role_only"
on public.api_rate_limits for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
