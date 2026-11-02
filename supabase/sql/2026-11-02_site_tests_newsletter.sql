-- Kör en gång i Supabase: SQL Editor -> New query -> klistra in -> Run.
-- Skapar tabellerna för "Sajttester" och "Nyhetsbrev" i admin.
-- Bara servern (service-nyckeln) skriver; inloggade admins (user_roles) läser.

create table if not exists public.site_tests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  url text not null,
  test_type text not null default 'quick',      -- quick = snabbtest, deep = djupanalys
  strategy text,                                  -- mobile / desktop
  performance int, accessibility int, best_practices int, seo int,
  security int, links int,
  pages int, issues int,
  summary text,
  country text
);
create index if not exists site_tests_created_at on public.site_tests (created_at desc);

create table if not exists public.newsletter_signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null unique,
  page text
);

alter table public.site_tests enable row level security;
alter table public.newsletter_signups enable row level security;

drop policy if exists "admin read site_tests" on public.site_tests;
create policy "admin read site_tests" on public.site_tests for select to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));

drop policy if exists "admin read newsletter" on public.newsletter_signups;
create policy "admin read newsletter" on public.newsletter_signups for select to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));

drop policy if exists "admin delete newsletter" on public.newsletter_signups;
create policy "admin delete newsletter" on public.newsletter_signups for delete to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));
