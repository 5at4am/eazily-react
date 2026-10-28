-- Report whether the storage schema objects the migrations depend on exist, and
-- whether RLS on storage.objects is enabled (a prerequisite for create policy).
insert into public._bucket_check(label, value)
select 'has_storage_schema', count(*)::text from pg_namespace where nspname='storage'
on conflict (label) do update set value = excluded.value;

insert into public._bucket_check(label, value)
select 'storage_objects_relrowsecurity', relrowsecurity::text
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='storage' and c.relname='objects'
on conflict (label) do update set value = excluded.value;

insert into public._bucket_check(label, value)
select 'bucket_count', count(*)::text from storage.buckets
on conflict (label) do update set value = excluded.value;

insert into public._bucket_check(label, value)
select 'storage_policy_count', count(*)::text from pg_policies where schemaname='storage'
on conflict (label) do update set value = excluded.value;
