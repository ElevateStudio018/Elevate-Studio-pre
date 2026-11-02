-- Kör en gång i Supabase (SQL Editor). Beställningar från kassan på /kassa.
-- Betalning och leverans har egna statusar. Bara servern skriver; admins läser och uppdaterar.
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ref text not null unique,
  email text not null, name text, company text, org_nr text, phone text, address text,
  lines jsonb not null, totals jsonb, vat numeric, demo_prices boolean default true,
  status text not null default 'awaiting_quote',          -- awaiting_quote, confirmed, done, cancelled
  payment_status text not null default 'not_required_yet', -- not_required_yet, pending, paid, failed, refunded
  delivery_status text not null default 'manual',          -- manual, queued, registered, failed
  registrar text, registrar_ref text, error text, notes text,
  terms_version text
);
create index if not exists orders_created_at on public.orders (created_at desc);
alter table public.orders enable row level security;
drop policy if exists "admin read orders" on public.orders;
create policy "admin read orders" on public.orders for select to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders for update to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));

-- Domain watch (Bevaka): a mail when a taken domain becomes free. Only the server writes; admins read.
create table if not exists public.domain_watches (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null, domain text not null, notified_at timestamptz,
  unique (email, domain)
);
alter table public.domain_watches enable row level security;
drop policy if exists "admin read watches" on public.domain_watches;
create policy "admin read watches" on public.domain_watches for select to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid()));
