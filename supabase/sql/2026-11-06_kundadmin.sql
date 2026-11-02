-- Kundadmin: one shared admin panel for every customer website (elevatestudio.nu/kundadmin, reached from
-- the customer's own dittforetag.se/admin and from the customer portal). Run once in Supabase SQL Editor,
-- after 2026-11-02_portal.sql (uses companies, company_members, is_admin() and member_role()).
--
-- A site belongs to a company. Its members edit it: owner/admin/tech may change everything, others may read
-- and handle leads. Texts are kept as a draft and a published copy; the public site only ever sees published.

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),        -- used in the site script: data-site="lindvik"
  domain text,                                                           -- dittforetag.se
  name text not null,
  theme jsonb not null default '{"primary":"#1d3b2a","accent":"#8fd3a6","bg":"#f6f8f5","text":"#16241b"}',
  modules text[] not null default array['sidor','forfragningar','projekt','bilder','tjanster','nyheter','bokningar','recensioner','installningar'],
  settings jsonb not null default '{}'                                   -- phone, email, address, opening hours, lead e-mail
);

-- Texts and single images, one row per key (e.g. "hero.title", "hero.image")
create table if not exists public.site_content (
  site_id uuid not null references public.sites on delete cascade,
  key text not null check (key ~ '^[a-z0-9_.-]{1,80}$'),
  draft jsonb, published jsonb,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users on delete set null,
  primary key (site_id, key)
);

-- Lists: projects, services, news, reviews, images
create table if not exists public.site_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  site_id uuid not null references public.sites on delete cascade,
  kind text not null check (kind in ('project','service','news','review','image')),
  data jsonb not null default '{}', sort int not null default 0,
  published boolean not null default true
);
create index if not exists site_items_site on public.site_items (site_id, kind, sort);

-- Leads from the site's forms (inserted by the Worker, never directly by the public)
create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  site_id uuid not null references public.sites on delete cascade,
  name text, email text, phone text, service text, message text, page text,
  status text not null default 'new' check (status in ('new','answered','quoted','won','lost','done')),
  note text
);
create index if not exists site_leads_site on public.site_leads (site_id, created_at desc);

create table if not exists public.site_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  site_id uuid not null references public.sites on delete cascade,
  starts_at timestamptz not null, minutes int not null default 60,
  name text, email text, phone text, note text,
  status text not null default 'booked' check (status in ('booked','done','cancelled'))
);

-- Who may do what on a site
create or replace function public.site_role(s uuid) returns text language sql stable security definer set search_path = public as
$$ select public.member_role(company_id) from public.sites where id = s $$;
create or replace function public.site_editor(s uuid) returns boolean language sql stable security definer set search_path = public as
$$ select public.is_admin() or coalesce(public.site_role(s) in ('owner','admin','tech'), false) $$;
create or replace function public.site_member(s uuid) returns boolean language sql stable security definer set search_path = public as
$$ select public.is_admin() or public.site_role(s) is not null $$;

alter table public.sites enable row level security;
drop policy if exists "read own sites" on public.sites;
create policy "read own sites" on public.sites for select using (public.is_admin() or public.member_role(company_id) is not null);
drop policy if exists "edit own sites" on public.sites;
create policy "edit own sites" on public.sites for update using (public.site_editor(id)) with check (public.site_editor(id));
drop policy if exists "admin all" on public.sites;
create policy "admin all" on public.sites for all using (public.is_admin()) with check (public.is_admin());

do $$ declare t text; begin
  foreach t in array array['site_content','site_items','site_bookings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('create policy "members read" on public.%I for select using (public.site_member(site_id))', t);
    execute format('drop policy if exists "editors write" on public.%I', t);
    execute format('create policy "editors write" on public.%I for all using (public.site_editor(site_id)) with check (public.site_editor(site_id))', t);
  end loop;
end $$;

-- Leads: members read and update status/note; nobody inserts from the browser (the Worker uses the service key)
alter table public.site_leads enable row level security;
drop policy if exists "members read" on public.site_leads;
create policy "members read" on public.site_leads for select using (public.site_member(site_id));
drop policy if exists "members update" on public.site_leads;
create policy "members update" on public.site_leads for update using (public.site_member(site_id)) with check (public.site_member(site_id));
drop policy if exists "admin delete" on public.site_leads;
create policy "admin delete" on public.site_leads for delete using (public.site_editor(site_id));

-- Members may only change status and note on a lead, never what the visitor wrote
create or replace function public.guard_site_lead() returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    new.site_id := old.site_id; new.name := old.name; new.email := old.email; new.phone := old.phone;
    new.service := old.service; new.message := old.message; new.page := old.page; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists guard_site_lead on public.site_leads;
create trigger guard_site_lead before update on public.site_leads for each row execute function public.guard_site_lead();

-- Images: a public bucket, files under <site_id>/..., only editors of that site may upload or delete
insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true) on conflict (id) do nothing;
drop policy if exists "site media write" on storage.objects;
create policy "site media write" on storage.objects for insert with check (bucket_id = 'site-media' and public.site_editor(((storage.foldername(name))[1])::uuid));
drop policy if exists "site media delete" on storage.objects;
create policy "site media delete" on storage.objects for delete using (bucket_id = 'site-media' and public.site_editor(((storage.foldername(name))[1])::uuid));
