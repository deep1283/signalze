-- Add Product Hunt source and make keyword source seeding data-driven.
-- Safe to run multiple times.

alter type public.source_name add value if not exists 'producthunt';

create or replace function public.seed_keyword_sources_and_state()
returns trigger
language plpgsql
as $$
declare
  src public.source_name;
  v1_enabled boolean;
begin
  for src in
    select unnest(enum_range(null::public.source_name))
  loop
    v1_enabled := src in ('hackernews'::public.source_name, 'devto'::public.source_name, 'github_discussions'::public.source_name);

    insert into public.keyword_sources (keyword_id, source, enabled)
    values (new.id, src, v1_enabled)
    on conflict (keyword_id, source) do nothing;

    insert into public.keyword_source_state (keyword_id, source, next_poll_at)
    values (new.id, src, now())
    on conflict (keyword_id, source) do nothing;
  end loop;

  return new;
end;
$$;

-- Backfill existing keywords with new source rows.
insert into public.keyword_sources (keyword_id, source, enabled)
select k.id, 'producthunt'::public.source_name, false
from public.keywords k
on conflict (keyword_id, source) do nothing;

insert into public.keyword_source_state (keyword_id, source, next_poll_at)
select k.id, 'producthunt'::public.source_name, now()
from public.keywords k
on conflict (keyword_id, source) do nothing;
