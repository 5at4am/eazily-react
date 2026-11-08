-- Request photo uploads.
-- Customers attach up to three images to a professional booking. Files live in a
-- private `request-media` bucket; the owner can upload/read, and the linked
-- partner (or customer) can read them once an order carries the same idempotency
-- key. Photo references are kept on the private booking intake.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('request-media', 'request-media', false, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

drop policy if exists "Request media owner" on storage.objects;
create policy "Request media owner"
  on storage.objects for all
  using (bucket_id = 'request-media' and auth.uid()::text = owner_id)
  with check (bucket_id = 'request-media' and auth.uid()::text = owner_id);

drop policy if exists "Request media participant read" on storage.objects;
create policy "Request media participant read"
  on storage.objects for select
  using (bucket_id = 'request-media' and exists(
    select 1 from public.partner_orders o
    where o.request_key = ((metadata ->> 'key'))::uuid
      and (o.customer_id = auth.uid()
           or exists(select 1 from public.partner_applications a
                     where a.id = o.partner_id and a.customer_id = auth.uid()))
  ));

alter table eazily_private.service_booking_intake
  add column if not exists photos text[] not null default '{}';

create or replace function public.get_service_booking_intake(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path=public,eazily_private,pg_temp as $$
declare booking public.partner_orders; intake eazily_private.service_booking_intake;
  owner_access boolean; staff_access boolean; offered_access boolean; assigned_access boolean;
begin
  if auth.uid() is null then raise exception 'Sign in to view booking details'; end if;
  select * into booking from public.partner_orders where id=p_order and role='professional';
  if booking.id is null then return null; end if;
  owner_access := booking.customer_id=auth.uid();
  staff_access := public.is_admin() or public.has_staff_permission('orders.view');
  select exists(
    select 1 from public.service_booking_offers offer
    join public.partner_applications partner on partner.id=offer.partner_id
    where offer.order_id=p_order and offer.status in ('offered','accepted')
      and partner.customer_id=auth.uid()
      and offer.partner_id=booking.partner_id
  ) into offered_access;
  select exists(
    select 1 from public.partner_applications partner
    where partner.id=booking.partner_id and partner.customer_id=auth.uid()
      and booking.status in ('accepted','active','awaiting_acceptance','completed','disputed')
  ) into assigned_access;
  if not (owner_access or staff_access or offered_access or assigned_access) then
    raise exception 'Booking details are not available to this account';
  end if;
  select * into intake from eazily_private.service_booking_intake where order_id=p_order;
  if intake.order_id is null then return null; end if;
  if owner_access or staff_access or assigned_access then
    return jsonb_build_object('requirement',intake.requirement,'address',intake.address,'photos',intake.photos);
  end if;
  return jsonb_build_object('requirement',intake.requirement);
end $$;
revoke all on function public.get_service_booking_intake(uuid) from public,anon,authenticated;
grant execute on function public.get_service_booking_intake(uuid) to authenticated;

create or replace function public.request_professional_booking_with_intake(
  p_post uuid, p_slot timestamptz, p_key uuid, p_backup boolean, p_city text,
  p_address text, p_requirement text, p_photos text[] default '{}'
) returns public.partner_orders language plpgsql security definer
set search_path=public,eazily_private,pg_temp as $$
declare booking public.partner_orders; saved eazily_private.service_booking_intake;
begin
  if length(trim(coalesce(p_address,''))) not between 5 and 500 then
    raise exception 'Enter a service address (5-500 characters)';
  end if;
  if length(trim(coalesce(p_requirement,''))) not between 5 and 1000 then
    raise exception 'Describe the work in 5-1000 characters';
  end if;
  if coalesce(array_length(p_photos,1),0) > 3 then
    raise exception 'Attach up to three photos';
  end if;
  booking := public.request_professional_booking(p_post,p_slot,p_key,p_backup,p_city);
  insert into eazily_private.service_booking_intake(order_id,address,requirement,photos)
    values(booking.id,trim(p_address),trim(p_requirement),coalesce(p_photos,'{}'))
    on conflict(order_id) do nothing;
  select * into saved from eazily_private.service_booking_intake where order_id=booking.id;
  if saved.address is distinct from trim(p_address) or saved.requirement is distinct from trim(p_requirement) then
    raise exception 'Booking reference belongs to different service details';
  end if;
  return booking;
end $$;
revoke all on function public.request_professional_booking_with_intake(uuid,timestamptz,uuid,boolean,text,text,text)
  from public,anon,authenticated;
revoke all on function public.request_professional_booking_with_intake(uuid,timestamptz,uuid,boolean,text,text,text,text[])
  from public,anon,authenticated;
grant execute on function public.request_professional_booking_with_intake(uuid,timestamptz,uuid,boolean,text,text,text,text[])
  to authenticated;
