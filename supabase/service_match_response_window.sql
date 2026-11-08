-- Direct service bookings create a single offer for the chosen professional.
-- The previous 60-second window expired offers before a professional could
-- realistically open the request, making the booking impossible to accept.
-- Use a realistic half-hour window and keep the schema maximum at one hour.
alter table public.service_match_config
  alter column response_seconds set default 1800;

update public.service_match_config
set response_seconds = 1800
where id = true
  and response_seconds < 1800;
