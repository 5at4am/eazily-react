-- Forward-only local source: disable all authenticated admin/staff authorization.
-- Historic schema/migration files are retained; this migration retires access without
-- dropping customer/partner data or changing service-role database privileges.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select false
$$;

create or replace function public.has_staff_permission(p_permission text)
returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select false
$$;

drop policy if exists "Admins configure referrals" on public.referral_config;

-- Leave staff-attention workflows dormant when their only authenticated readers
-- and operators have been retired.
update public.automation_configuration
set booking_attention_enabled = false,
    urgent_ticket_attention_enabled = false
where id = true;
