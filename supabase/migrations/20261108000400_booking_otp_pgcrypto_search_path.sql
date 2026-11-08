-- Hosted Supabase installs pgcrypto in the `extensions` schema. Several
-- SECURITY DEFINER functions call crypt(), gen_salt() and digest() with a
-- search_path that only lists public, eazily_private and pg_temp, so the
-- unqualified calls fail on the hosted project with SQLSTATE 42883
-- ("function gen_salt(unknown) does not exist"). This broke
-- "Show booking verification code" and arrival verification.
--
-- Local PGlite installs pgcrypto into public, so the same calls already
-- resolve there. Appending the extensions schema keeps both environments
-- working: a nonexistent schema in search_path is ignored by PostgreSQL, and
-- public stays ahead of extensions so local resolution does not change.

alter function public.get_booking_otp(uuid)
  set search_path to public, eazily_private, extensions, pg_temp;

alter function public.verify_booking_arrival(uuid, text)
  set search_path to public, eazily_private, extensions, pg_temp;

alter function public.record_automation_payment_confirmation(text, uuid, bigint, text, text)
  set search_path to public, extensions, pg_temp;

alter function public.record_automation_payout_confirmation(text, uuid, bigint, text, text)
  set search_path to public, extensions, pg_temp;

alter function public.record_automation_refund_confirmation(text, uuid, bigint, text, text)
  set search_path to public, extensions, pg_temp;
