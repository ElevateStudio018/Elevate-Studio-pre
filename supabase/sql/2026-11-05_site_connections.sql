-- The customer's own website admin, connected to the customer portal. The key is encrypted by the Worker
-- and only the Worker (service key) reads this table; customers see their data through /api/site/data.
create table if not exists public.site_connections (
  company_id uuid primary key references public.companies(id) on delete cascade,
  base_url text not null check (base_url like 'https://%'),
  key_enc text not null,
  site_name text,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now()
);
alter table public.site_connections enable row level security;
drop policy if exists "admin all" on public.site_connections;
create policy "admin all" on public.site_connections for all using (public.is_admin()) with check (public.is_admin());
-- No member policy on purpose: the encrypted key never reaches the browser.
