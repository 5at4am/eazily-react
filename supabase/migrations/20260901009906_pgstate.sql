-- Authoritative check straight from the catalogue, bypassing PostgREST entirely.
create table if not exists public._pgstate(label text primary key, value text not null);
delete from public._pgstate;
insert into public._pgstate values
 ('public_tables', (select count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r')),
 ('buckets', (select count(*)::text from storage.buckets)),
 ('storage_policies', (select count(*)::text from pg_policies where schemaname='storage'));
