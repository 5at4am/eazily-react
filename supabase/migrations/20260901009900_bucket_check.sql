-- Verification only: reports the state of the buckets that storage.sql creates.
create table if not exists public._bucket_check(label text primary key, value text not null);
insert into public._bucket_check(label, value)
select 'bucket_'||id,
       'public='||public::text||' size_limit='||coalesce(file_size_limit::text,'null')||' mimes='||coalesce(array_length(allowed_mime_types,1)::text,'null')
from storage.buckets
where id in ('profile-media','partner-media','chat-attachments')
on conflict (label) do update set value = excluded.value;
