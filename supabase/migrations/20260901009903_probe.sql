insert into public._bucket_check(label, value)
select 'probe_marker', 'insert-works'
on conflict (label) do update set value = excluded.value;
