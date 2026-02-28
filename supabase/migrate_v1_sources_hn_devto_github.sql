-- V1 source migration:
-- Keep only Hacker News + Dev.to + GitHub Discussions enabled.
-- Safe to run multiple times.

alter type public.source_name add value if not exists 'github_discussions';
alter type public.source_name add value if not exists 'producthunt';

insert into public.keyword_sources (keyword_id, source, enabled)
select k.id, 'github_discussions'::public.source_name, true
from public.keywords k
on conflict (keyword_id, source) do update
set enabled = true,
    updated_at = now();

insert into public.keyword_source_state (keyword_id, source, next_poll_at)
select k.id, 'github_discussions'::public.source_name, now()
from public.keywords k
on conflict (keyword_id, source) do nothing;

insert into public.keyword_sources (keyword_id, source, enabled)
select k.id, 'producthunt'::public.source_name, false
from public.keywords k
on conflict (keyword_id, source) do update
set enabled = false,
    updated_at = now();

insert into public.keyword_source_state (keyword_id, source, next_poll_at)
select k.id, 'producthunt'::public.source_name, now()
from public.keywords k
on conflict (keyword_id, source) do nothing;

-- Ensure v1 sources are enabled.
update public.keyword_sources
set enabled = true,
    updated_at = now()
where source in ('hackernews', 'devto', 'github_discussions');

-- Disable non-v1 sources globally.
update public.keyword_sources
set enabled = false,
    updated_at = now()
where source in ('reddit', 'google', 'brave', 'producthunt');
