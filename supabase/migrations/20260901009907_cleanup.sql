-- Remove the temporary verification tables and helpers from the rehearsal leftovers.
drop table if exists public._pgstate cascade;
drop table if exists public._bucket_check cascade;
