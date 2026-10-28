-- Verification only: grants read access to this temporary reporting table so the
-- bucket state can be read over PostgREST. Removed by the next migration.
grant select on public._bucket_check to anon, authenticated;
