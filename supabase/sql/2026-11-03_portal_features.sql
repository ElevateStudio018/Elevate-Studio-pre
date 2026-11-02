-- Kör efter 2026-11-02_portal.sql. Månadsrapport, driftövervakning och ändringsförfrågningar i kundportalen.
-- Hemsidans adress läggs i services.details som {"url": "https://kund.se"} på tjänsten med type = 'website'.

create table if not exists public.site_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies on delete cascade,
  url text not null, performance int, accessibility int, best_practices int, seo int, lcp_ms int, issues jsonb default '[]'::jsonb
);
create table if not exists public.uptime_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  company_id uuid not null references public.companies on delete cascade,
  url text not null, ok boolean not null, status int, ms int
);
create index if not exists uptime_checks_company on public.uptime_checks (company_id, checked_at desc);
create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies on delete cascade,
  created_by uuid references auth.users,
  page text, description text not null, image text,           -- image: a small screenshot as data URL (max ~2 MB)
  status text not null default 'new' check (status in ('new','quoted','approved','declined','in_progress','done')),
  price numeric, quote_note text, quoted_at timestamptz, decided_at timestamptz
);

do $$ declare t text; begin
  foreach t in array array['site_reports','uptime_checks','change_requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format('create policy "admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists "member read" on public.%I', t);
    execute format('create policy "member read" on public.%I for select to authenticated using (public.member_role(company_id) is not null)', t);
  end loop;
end $$;

drop policy if exists "member new change" on public.change_requests;
create policy "member new change" on public.change_requests for insert to authenticated
  with check (public.member_role(company_id) is not null and created_by = auth.uid() and status = 'new' and price is null);
drop policy if exists "member decide change" on public.change_requests;
create policy "member decide change" on public.change_requests for update to authenticated
  using (public.member_role(company_id) in ('owner','admin','finance'));

-- A customer can only answer a price: quoted -> approved or declined. Price, text and everything else is ours.
create or replace function public.guard_change_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    if new.price is distinct from old.price and new.price is not null then new.quoted_at := now(); end if;
    return new;
  end if;
  if old.status <> 'quoted' or new.status not in ('approved','declined')
     or (to_jsonb(new) - 'status' - 'decided_at') is distinct from (to_jsonb(old) - 'status' - 'decided_at') then
    raise exception 'Bara ett lämnat pris kan godkännas eller avböjas';
  end if;
  new.decided_at := now();
  return new;
end $$;
drop trigger if exists guard_change on public.change_requests;
create trigger guard_change before update on public.change_requests for each row execute function public.guard_change_request();
