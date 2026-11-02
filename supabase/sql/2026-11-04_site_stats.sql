-- Daily visitor statistics per customer site (filled by the worker, read in the customer portal).
create table if not exists public.site_stats (
  company_id uuid not null references public.companies(id) on delete cascade,
  day date not null,
  visitors int not null default 0,
  pageviews int not null default 0,
  leads int not null default 0,
  sources jsonb not null default '{}',
  pages jsonb not null default '{}',
  devices jsonb not null default '{}',
  cities jsonb not null default '{}',
  queries jsonb not null default '{}',
  primary key (company_id, day)
);
alter table public.site_stats enable row level security;
drop policy if exists "admin all" on public.site_stats;
create policy "admin all" on public.site_stats for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "member read" on public.site_stats;
create policy "member read" on public.site_stats for select using (public.member_role(company_id) is not null);
