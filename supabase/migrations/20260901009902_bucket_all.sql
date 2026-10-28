-- Report every bucket actually present, not only the three expected, so a
-- mismatch shows up instead of an empty result.
insert into public._bucket_check(label, value)
select 'bucket_'||id, 'public='||public::text||' size_limit='||coalesce(file_size_limit::text,'null')
from storage.buckets
on conflict (label) do update set value = excluded.value;
