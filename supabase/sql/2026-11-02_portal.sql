-- Kundportal (/portal). Kör en gång i Supabase SQL Editor, efter de andra filerna.
-- Ett företag kan ha flera användare med roller; en användare kan tillhöra flera företag och ser bara sina.
-- Admins (user_roles) ser och ändrar allt. Kunder kan aldrig se andra kunders data (RLS).

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null, org_nr text, billing_email text, billing_address text, phone text
);
create table if not exists public.company_members (
  company_id uuid references public.companies on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null default 'user' check (role in ('owner','admin','finance','tech','user')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies on delete cascade,
  type text not null check (type in ('domain','mail','website','hosting','ssl','support','other')),
  name text not null, status text not null default 'active',     -- active, pending, expiring, suspended, cancelled
  price numeric, period text,                                     -- month, year, once
  renews_at date, auto_renew boolean default true, details jsonb default '{}'::jsonb
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies on delete cascade,
  number text not null, amount numeric not null, vat numeric default 0, due_date date,
  status text not null default 'open',                            -- open, paid, overdue, credited
  pdf_url text, description text
);
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references public.companies on delete cascade,
  service_id uuid references public.services on delete set null,
  created_by uuid references auth.users, subject text not null,
  status text not null default 'open', priority text not null default 'normal'
);
create table if not exists public.ticket_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ticket_id uuid not null references public.tickets on delete cascade,
  author uuid references auth.users, from_staff boolean default false, body text not null
);
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  company_id uuid references public.companies on delete cascade,
  user_id uuid references auth.users on delete cascade,
  kind text, title text not null, body text, read_at timestamptz
);
create table if not exists public.data_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users on delete cascade, kind text check (kind in ('export','delete')), status text default 'new'
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.user_roles where user_id = auth.uid()) $$;
create or replace function public.member_role(c uuid) returns text language sql stable security definer set search_path = public as
$$ select role from public.company_members where company_id = c and user_id = auth.uid() $$;

do $$ declare t text; begin
  foreach t in array array['companies','company_members','services','invoices','tickets','ticket_messages','notifications','data_requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format('create policy "admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "member read" on public.companies;
create policy "member read" on public.companies for select to authenticated using (public.member_role(id) is not null);
drop policy if exists "owner update" on public.companies;
create policy "owner update" on public.companies for update to authenticated using (public.member_role(id) in ('owner','admin','finance'));

drop policy if exists "member read" on public.company_members;
create policy "member read" on public.company_members for select to authenticated using (public.member_role(company_id) is not null);

drop policy if exists "member read" on public.services;
create policy "member read" on public.services for select to authenticated using (public.member_role(company_id) is not null);
drop policy if exists "owner renew" on public.services;
create policy "owner renew" on public.services for update to authenticated using (public.member_role(company_id) in ('owner','admin','tech'));

-- invoices: everyone but plain users
drop policy if exists "finance read" on public.invoices;
create policy "finance read" on public.invoices for select to authenticated using (public.member_role(company_id) in ('owner','admin','finance'));

drop policy if exists "member tickets" on public.tickets;
create policy "member tickets" on public.tickets for select to authenticated using (public.member_role(company_id) is not null);
drop policy if exists "member new ticket" on public.tickets;
create policy "member new ticket" on public.tickets for insert to authenticated with check (public.member_role(company_id) is not null and created_by = auth.uid());
drop policy if exists "member close ticket" on public.tickets;
create policy "member close ticket" on public.tickets for update to authenticated using (public.member_role(company_id) is not null);

drop policy if exists "member messages" on public.ticket_messages;
create policy "member messages" on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id and public.member_role(t.company_id) is not null));
drop policy if exists "member reply" on public.ticket_messages;
create policy "member reply" on public.ticket_messages for insert to authenticated
  with check (author = auth.uid() and from_staff = false and exists (select 1 from public.tickets t where t.id = ticket_id and public.member_role(t.company_id) is not null));

drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid() or public.member_role(company_id) is not null);
drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications for update to authenticated using (user_id = auth.uid());

drop policy if exists "own requests" on public.data_requests;
create policy "own requests" on public.data_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Customers may only change what the portal offers: auto-renew on a service, and open/resolved on a ticket.
-- Everything else (price, status, company, priority) is for admins only, whatever the request contains.
create or replace function public.guard_customer_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_table_name = 'services' then
    if (to_jsonb(new) - 'auto_renew') is distinct from (to_jsonb(old) - 'auto_renew') then raise exception 'Bara automatisk förnyelse kan ändras'; end if;
  elsif tg_table_name = 'tickets' then
    if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') or new.status not in ('open','resolved') then raise exception 'Bara status kan ändras'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_services on public.services;
create trigger guard_services before update on public.services for each row execute function public.guard_customer_update();
drop trigger if exists guard_tickets on public.tickets;
create trigger guard_tickets before update on public.tickets for each row execute function public.guard_customer_update();
