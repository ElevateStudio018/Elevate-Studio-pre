-- Kundadmin RLS: customers only see and edit their own site; leads keep what the visitor wrote.
\set ON_ERROR_STOP on
do $$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; create role anon nologin; end if; end $$;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.user_roles (user_id uuid, role text, primary key (user_id, role));
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id serial primary key, bucket_id text, name text);
create function storage.foldername(n text) returns text[] language sql immutable as $$ select string_to_array(n, '/') $$;
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to authenticated, anon;
\i supabase/sql/2026-11-02_portal.sql
\i supabase/sql/2026-11-06_kundadmin.sql
grant select, insert, update, delete on all tables in schema public, storage to authenticated;
grant usage on all sequences in schema public, storage to authenticated;
grant execute on all functions in schema public, storage to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','a@a.se'),('00000000-0000-0000-0000-00000000000b','b@b.se'),('00000000-0000-0000-0000-0000000000aa','u@a.se');
insert into companies (id,name) values ('11111111-1111-1111-1111-111111111111','Ett'),('22222222-2222-2222-2222-222222222222','Två');
insert into company_members values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','owner'),('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000b','owner'),('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000aa','user');
insert into sites (id,company_id,slug,name) values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','ett','Ett'),('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','tva','Två');
insert into site_leads (id,site_id,name,message) values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Karin','Badrum'),('cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Olle','Tak');
set role authenticated;
-- A (owner of Ett)
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'A ser bara sin sajt' as t, count(*) = 1 as ok from sites;
select 'A ser bara sina leads', count(*) = 1 from site_leads;
insert into site_content (site_id,key,draft) values ('aaaaaaaa-0000-0000-0000-000000000001','hero.title','"Hej"');
select 'A kan skriva text', count(*) = 1 from site_content;
update site_leads set status = 'answered', message = 'ändrat' where id = 'cccccccc-0000-0000-0000-000000000001';
select 'A ändrar status men inte besökarens text', status = 'answered' and message = 'Badrum' from site_leads;
insert into storage.objects (bucket_id,name) values ('site-media','aaaaaaaa-0000-0000-0000-000000000001/bild.jpg');
select 'A laddar upp bild i sin mapp', true;
\set ON_ERROR_STOP off
insert into site_content (site_id,key,draft) values ('bbbbbbbb-0000-0000-0000-000000000002','hero.title','"Hack"');
insert into storage.objects (bucket_id,name) values ('site-media','bbbbbbbb-0000-0000-0000-000000000002/hack.jpg');
insert into site_leads (site_id,name) values ('aaaaaaaa-0000-0000-0000-000000000001','Fake');
\set ON_ERROR_STOP on
-- U (plain user in Ett): reads, cannot edit texts
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
select 'U ser texten', count(*) = 1 from site_content;
\set ON_ERROR_STOP off
update site_content set draft = '"U"';
\set ON_ERROR_STOP on
select 'U kan inte ändra texten', draft = '"Hej"' from site_content;
-- B (owner of Två)
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select 'B ser inte Ett:s text', count(*) = 0 from site_content;
select 'B ser inte Ett:s leads', count(*) = 1 from site_leads;
reset role;
select 'ingen främmande bild', count(*) = 1 from storage.objects;
select 'ingen falsk lead från webbläsaren', count(*) = 2 from site_leads;
