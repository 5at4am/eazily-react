-- Raised so DDL-heavy migrations complete on hosted Supabase.
-- The Free plan defaults statement_timeout to 2 minutes; the policy/trigger
-- creation in this schema exceeds that. Local PGlite has no such default, which is
-- why every migration passed locally and then timed out once applied remotely.
alter database postgres set statement_timeout = '600s';
alter database postgres set lock_timeout = '60s';