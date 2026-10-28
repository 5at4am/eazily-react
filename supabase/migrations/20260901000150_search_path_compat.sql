-- Hosted Supabase compatibility shim.
--
-- schema.sql runs `create extension if not exists "pgcrypto"`. On hosted Supabase
-- pgcrypto is already installed in the `extensions` schema, so that statement is a
-- no-op and never installs anything into `public`. A later migration then calls
-- gen_random_bytes() unqualified, which fails with SQLSTATE 42883 because
-- `extensions` is not on the migration session's search_path.
--
-- Local PGlite resolves the bare name, which is why this only appears on hosted
-- Supabase. Rather than edit experience.sql (its checksum is recorded in
-- migration-manifest.json), publish a guarded alias in `public` so the existing
-- call sites resolve unchanged.
do $$
begin
  if to_regprocedure('gen_random_bytes(integer)') is null then
    execute $shim$
      create function public.gen_random_bytes(bytes integer)
      returns bytea
      language sql
      volatile
      as $fn$ select extensions.gen_random_bytes(bytes) $fn$
    $shim$;
    raise notice 'created public.gen_random_bytes alias for extensions.pgcrypto';
  end if;
end $$;