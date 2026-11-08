-- Persisted seller levels.
-- Adds a stored tier column to partner_applications, maintained by a trigger when
-- an order completes, and exposes it through a public read-only view following the
-- existing internal-reader pattern (eazily_public_read_internal + invoker view).

alter table public.partner_applications add column if not exists level text not null default 'new';

create or replace function public.compute_partner_level(p_partner uuid)
returns text language sql stable security definer set search_path=public,eazily_private,pg_temp as $$
  select case
    when completed_jobs >= 25 and avg_rating is not null and avg_rating >= 4.5 then 'top-rated'
    when completed_jobs >= 10 and avg_rating is not null and avg_rating >= 4.3 then 'level-2'
    when completed_jobs >= 1 and avg_rating is not null and avg_rating >= 4 then 'level-1'
    else 'new'
  end
  from (
    select count(*) filter (where o.status = 'completed') as completed_jobs,
           (select avg(r.rating) from public.seller_reviews r where r.partner_id = p_partner and r.published) as avg_rating
    from public.partner_orders o
    where o.partner_id = p_partner
  ) s;
$$;

create or replace function eazily_private.maintain_partner_level()
returns trigger language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
begin
  update public.partner_applications
     set level = public.compute_partner_level(new.partner_id)
   where id = new.partner_id;
  return new;
end $$;

drop trigger if exists maintain_partner_level on public.partner_orders;
create trigger maintain_partner_level
  after insert or update of status on public.partner_orders
  for each row when (new.status = 'completed')
  execute function eazily_private.maintain_partner_level();

revoke all on function eazily_private.maintain_partner_level() from public, anon, authenticated;

update public.partner_applications a
   set level = public.compute_partner_level(a.id);

create or replace function eazily_public_read_internal.read_customer_professional_levels()
returns table(partner_id uuid, level text)
language sql stable security definer set search_path=public,eazily_private,pg_temp as $$
  select id, level from public.partner_applications;
$$;

create or replace view public.customer_professional_levels with (security_invoker=true) as
select * from eazily_public_read_internal.read_customer_professional_levels();

revoke all on function eazily_public_read_internal.read_customer_professional_levels() from public, anon, authenticated;
grant execute on function eazily_public_read_internal.read_customer_professional_levels() to anon, authenticated;
grant select on public.customer_professional_levels to anon, authenticated;
