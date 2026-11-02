-- Supabase stand-in: roles, auth.users, auth.uid() from the request, user_roles. Then the real migration files.
\set ON_ERROR_STOP on
do $$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; create role anon nologin; end if; end $$;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.user_roles (user_id uuid, role text, primary key (user_id, role));
grant usage on schema public, auth to authenticated, anon;
\i supabase/sql/2026-11-02_site_tests_newsletter.sql
\i supabase/sql/2026-11-02_orders.sql
\i supabase/sql/2026-11-02_portal.sql
\i supabase/sql/2026-11-03_portal_features.sql
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- people: A (owner of company 1), B (owner of company 2), F (finance in company 1), U (plain user in 1), S (staff admin)
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','a@a.se'),('00000000-0000-0000-0000-00000000000b','b@b.se'),('00000000-0000-0000-0000-00000000000f','f@a.se'),('00000000-0000-0000-0000-0000000000aa','u@a.se'),('00000000-0000-0000-0000-000000000005','s@elevate.se');
insert into public.user_roles values ('00000000-0000-0000-0000-000000000005','admin');
insert into companies (id,name) values ('11111111-1111-1111-1111-111111111111','Företag Ett'),('22222222-2222-2222-2222-222222222222','Företag Två');
insert into company_members values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','owner'),('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000b','owner'),
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000f','finance'),('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000aa','user');
insert into services (company_id,type,name) values ('11111111-1111-1111-1111-111111111111','domain','ett.se'),('22222222-2222-2222-2222-222222222222','domain','tva.se');
insert into invoices (company_id,number,amount) values ('11111111-1111-1111-1111-111111111111','1',100),('22222222-2222-2222-2222-222222222222','2',200);
insert into tickets (id,company_id,subject) values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','B:s ärende');
insert into orders (ref,email,lines) values ('ES-1','x@y.se','[]');
insert into change_requests (id,company_id,description,status,price) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','Byt bild','quoted',900),('55555555-5555-5555-5555-555555555555','22222222-2222-2222-2222-222222222222','B:s ändring','quoted',500);
insert into uptime_checks (company_id,url,ok) values ('22222222-2222-2222-2222-222222222222','https://tva.se',true);
insert into site_tests (url) values ('https://x.se');
\set ON_ERROR_STOP off

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
set role authenticated;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select 'A ser bara sitt företag' t, (select count(*) from companies) = 1 and (select name from companies) = 'Företag Ett' ok
union all select 'A ser bara sina tjänster', (select count(*) from services) = 1 and (select name from services) = 'ett.se'
union all select 'A ser inte B:s fakturor', (select count(*) from invoices) = 1
union all select 'A ser inte B:s ärende', (select count(*) from tickets) = 0
union all select 'A ser inga beställningar (bara admin)', (select count(*) from orders) = 0
union all select 'A ser inga sajttester (bara admin)', (select count(*) from site_tests) = 0;
-- A tries to change B's service, open a ticket in B's company, and write into B's ticket
update services set name = 'kapad' where name = 'tva.se';
insert into tickets (company_id, subject, created_by) values ('22222222-2222-2222-2222-222222222222','intrång','00000000-0000-0000-0000-00000000000a');
insert into ticket_messages (ticket_id, author, body) values ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-00000000000a','intrång');
insert into ticket_messages (ticket_id, author, body, from_staff) select id,'00000000-0000-0000-0000-00000000000a','låtsas vara personal',true from tickets limit 1;
insert into tickets (company_id, subject, created_by) values ('11111111-1111-1111-1111-111111111111','Eget ärende','00000000-0000-0000-0000-00000000000a');

-- A tries to change price and status on an own service, and priority on an own ticket (blocked), and auto-renew (allowed)
update services set price = 1 where name = 'ett.se';
update services set status = 'active', auto_renew = false where name = 'ett.se';
update services set auto_renew = false where name = 'ett.se';
update tickets set priority = 'urgent' where subject = 'Eget ärende';
update tickets set status = 'resolved' where subject = 'Eget ärende';
-- change requests: A lowers the price (blocked), approves B's (not visible), approves own (allowed), creates a new one with a price (blocked)
update change_requests set price = 1 where id = '44444444-4444-4444-4444-444444444444';
update change_requests set status = 'approved' where id = '55555555-5555-5555-5555-555555555555';
update change_requests set status = 'approved' where id = '44444444-4444-4444-4444-444444444444';
insert into change_requests (company_id, created_by, description, price) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','gratis tack',0);
insert into change_requests (company_id, created_by, description) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','Ny rubrik');
select 'A ser inte B:s drift eller ändringar' t, (select count(*) from uptime_checks) = 0 and (select count(*) from change_requests where company_id = '22222222-2222-2222-2222-222222222222') = 0 ok;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000aa');
select 'Vanlig användare ser inte fakturor' t, (select count(*) from invoices) = 0 ok
union all select 'Vanlig användare kan inte ändra företagsuppgifter', true;
update companies set name = 'ändrat av user';

select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select 'Ekonomiansvarig ser fakturor' t, (select count(*) from invoices) = 1 ok;

select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
select 'Admin ser alla företag' t, (select count(*) from companies) = 2 ok
union all select 'Admin ser alla beställningar', (select count(*) from orders) = 1
union all select 'B:s tjänst är oförändrad', (select name from services where company_id = '22222222-2222-2222-2222-222222222222') = 'tva.se'
union all select 'Inget intrångsärende skapades', (select count(*) from tickets where subject = 'intrång') = 0
union all select 'Inget intrångsmeddelande skapades', (select count(*) from ticket_messages where body like 'intr%' or from_staff) = 0
union all select 'A:s egna ärende skapades', (select count(*) from tickets where subject = 'Eget ärende') = 1
union all select 'Kunden kunde inte ändra priset', (select price from services where name = 'ett.se') is null
union all select 'Kunden kunde stänga av automatisk förnyelse', (select auto_renew from services where name = 'ett.se') = false
union all select 'Kunden kunde inte ändra prioritet men kunde markera som löst', (select priority = 'normal' and status = 'resolved' from tickets where subject = 'Eget ärende')
union all select 'Kunden godkände sitt pris utan att kunna ändra det', (select status = 'approved' and price = 900 and decided_at is not null from change_requests where id = '44444444-4444-4444-4444-444444444444')
union all select 'Kunden kunde inte godkänna B:s ändring', (select status from change_requests where id = '55555555-5555-5555-5555-555555555555') = 'quoted'
union all select 'Ny ändring utan pris skapades, med pris stoppades', (select count(*) from change_requests where description = 'Ny rubrik') = 1 and (select count(*) from change_requests where description = 'gratis tack') = 0
union all select 'Företagsnamnet ändrades inte av vanlig användare', (select name from companies where id = '11111111-1111-1111-1111-111111111111') = 'Företag Ett';

select pg_temp.as_user('');
select 'Utloggad ser ingenting' t, (select count(*) from companies) + (select count(*) from services) + (select count(*) from invoices) = 0 ok;
