-- Append after migration 49. Keep historical migration checksums unchanged.
begin;

drop policy if exists "Ticket participants send replies" on public.support_ticket_replies;
create policy "Ticket participants send replies" on public.support_ticket_replies
  for insert with check (
    author_id=auth.uid() and
    exists (
      select 1 from public.support_tickets t
      where t.id=ticket_id and t.status not in ('resolved','closed') and
        (t.customer_id=auth.uid() or is_admin() or has_staff_permission('support.manage'))
    )
  );

create or replace function public.emit_realtime_support_reply_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare ticket public.support_tickets;
begin
  select * into ticket from public.support_tickets where id=new.ticket_id;
  if ticket.id is not null then
    perform public.emit_realtime_event('account',ticket.customer_id::text,'support','support_ticket_replies',new.ticket_id::text);
    perform public.emit_realtime_event('admin','admin','support','support_ticket_replies',new.ticket_id::text);
  end if;
  return new;
end $$;
create trigger realtime_support_ticket_replies after insert on public.support_ticket_replies
  for each row execute function public.emit_realtime_support_reply_event();

create function public.admin_enable_confirmed_seller_pricing() returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare inserted integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if (select count(distinct role) from public.seller_pricing_rules where role in ('professional','influencer','consultant')) <> 3 then
    raise exception 'All three seller pricing rules must exist';
  end if;
  insert into public.seller_pricing_rules(
    role,version,enabled,lower_markup_bps,upper_markup_bps,upper_threshold_paise,
    minimum_markup_paise,maximum_markup_paise,below_100_bps,consultant_share_bps,
    seller_tax_bps,customer_tax_bps,fee_tax_bps,separate_fee_paise,
    include_visiting,include_additional,rounding
  )
  select current.role,
    (select coalesce(max(previous.version),0)+1 from public.seller_pricing_rules previous where previous.role=current.role),
    true,2500,1200,100000,null,null,2500,current.consultant_share_bps,0,0,0,0,true,true,'half_up'
  from (
    select distinct on (role) role,consultant_share_bps
    from public.seller_pricing_rules
    where role in ('professional','influencer','consultant')
    order by role,version desc
  ) current;
  get diagnostics inserted = row_count;
  if inserted <> 3 then raise exception 'Could not apply all three seller pricing rules'; end if;
end $$;
revoke all on function public.admin_enable_confirmed_seller_pricing() from public,anon;
grant execute on function public.admin_enable_confirmed_seller_pricing() to authenticated;

create or replace function eazily_public_read_internal.read_customer_professional_directory() returns setof public.customer_professional_directory
language sql stable security definer
set search_path = pg_catalog, public, eazily_private, pg_temp
as $public_view$
select
  post.id,
  application.id as partner_id,
  'professional'::text as partner_role,
  post.status as post_status,
  true as published,
  true as accepting_bookings,
  false as offline_only_unavailable,
  profile.account_status,
  coalesce(application.details ->> 'name', application.details ->> 'businessName', 'Professional') as display_name,
  coalesce(application.details ->> 'businessName', application.details ->> 'name', 'Professional') as business_name,
  'verified'::text as verification_status,
  post.details ->> 'service' as selected_service,
  offered.service_names,
  offered.prices,
  post.details ->> 'category' as category_id,
  case
    when coalesce(application.details ->> 'experienceYears', application.details ->> 'experience', '') ~ '^[0-9]+$'
      then coalesce(application.details ->> 'experienceYears', application.details ->> 'experience')::integer
    else null
  end as experience_years,
  case when nullif(trim(application.details ->> 'language'), '') is null then array[]::text[]
       else regexp_split_to_array(application.details ->> 'language', '\s*,\s*') end as languages,
  case when nullif(trim(application.details ->> 'qualificationName'), '') is null then array[]::text[]
       else array[application.details ->> 'qualificationName'] end as qualifications,
  coverage.coverage,
  coalesce(application.details ->> 'city', '') as city,
  post.details ->> 'availability' as availability,
  coalesce(availability.online and availability.available_until > now(), false) as available_now,
  post.details ->> 'pricingType' as pricing_type,
  case when coalesce(post.details ->> 'serviceCharge', '') ~ '^\d+(\.\d+)?$' then (eazily_private.post_price(post)->>'totalPaise')::numeric / 100 else null end as starting_price,
  case when coalesce(post.details ->> 'visitingCharge', '') ~ '^\d+(\.\d+)?$' then (post.details ->> 'visitingCharge')::numeric else null end as visiting_charge,
  post.details ->> 'description' as description,
  application.details ->> 'specialisation' as specialisation,
  review_stats.rating,
  review_stats.review_count,
  completed.completed_jobs,
  response_stats.expected_response_minutes,
  null::numeric as distance_km,
  profile_media.profile_photo_media,
  portfolio.portfolio_media,
  null::text as cancellation_policy
from public.partner_posts post
join public.partner_applications application on application.id = post.partner_id
join public.profiles profile on profile.id = application.customer_id
left join public.partner_availability availability on availability.partner_id = application.id
left join lateral (
  select
    array_agg(distinct published.details ->> 'service') filter (where nullif(published.details ->> 'service', '') is not null) as service_names,
    coalesce(jsonb_object_agg(published.details ->> 'service', (eazily_private.post_price(published)->>'totalPaise')::numeric / 100)
      filter (where nullif(published.details ->> 'service', '') is not null and coalesce(published.details ->> 'serviceCharge', '') ~ '^\d+(\.\d+)?$'), '{}'::jsonb) as prices
  from public.partner_posts published
  where published.partner_id = application.id
    and published.role = 'professional'
    and published.status = 'published'
    and coalesce(published.details ->> 'postType', 'offering') = 'offering'
) offered on true
left join lateral (
  select array_remove(array[
    nullif(application.details ->> 'city', ''),
    nullif(application.details ->> 'locality', ''),
    nullif(post.details ->> 'area', ''),
    nullif(post.details ->> 'serviceArea', '')
  ], null) as coverage
) coverage on true
left join lateral (
  select round(avg(review.rating)::numeric, 1) as rating, count(*)::bigint as review_count
  from public.seller_reviews review
  join public.partner_orders review_order on review_order.id = review.order_id
  where review.partner_id = application.id
    and review.published
    and review_order.partner_id = application.id
    and review_order.customer_id = review.customer_id
    and review_order.status = 'completed'
) review_stats on true
left join lateral (
  select count(*)::bigint as completed_jobs
  from public.partner_orders completed_order
  where completed_order.partner_id = application.id
    and completed_order.status = 'completed'
) completed on true
left join lateral (
  select case when count(*) >= 3 then round(avg(extract(epoch from (accepted.accepted_at - response_order.created_at)) / 60))::integer end as expected_response_minutes
  from public.partner_orders response_order
  join lateral (
    select min(event.created_at) as accepted_at
    from public.seller_order_events event
    where event.order_id = response_order.id and event.kind = 'accept'
  ) accepted on accepted.accepted_at is not null
  where response_order.partner_id = application.id
) response_stats on true
left join lateral (
  select jsonb_build_object('path',media->>'path','type',media->>'type') as profile_photo_media
  from jsonb_array_elements(coalesce(application.details -> 'ownerShopMedia', '[]'::jsonb)) media
  where coalesce(media ->> 'type', '') like 'image/%'
    and media ->> 'path' not like '%/documents/%'
  limit 1
) profile_media on true
left join lateral (
  select coalesce(jsonb_agg(photos.media order by photos.updated_at desc), '[]'::jsonb) as portfolio_media
  from (
    select jsonb_build_object('path',media->>'path','type',media->>'type') as media, published.updated_at
    from public.partner_posts published
    cross join lateral jsonb_array_elements(coalesce(published.details -> 'media', '[]'::jsonb)) media
    where published.partner_id = application.id
      and published.role = 'professional'
      and published.status = 'published'
      and coalesce(published.details ->> 'postType', 'offering') in ('offering', 'photo', 'portfolio')
      and coalesce(media ->> 'type', '') like 'image/%'
      and media ->> 'path' not like '%/documents/%'
    order by published.updated_at desc
    limit 12
  ) photos
) portfolio on true
where post.role = 'professional'
  and post.status = 'published'
  and coalesce(post.details ->> 'postType', 'offering') = 'offering'
  and application.role = 'professional'
  and application.status = 'approved'
  and profile.account_status = 'active'
  and public.seller_can_receive_booking(application.id)
$public_view$;
revoke all on function eazily_public_read_internal.read_customer_professional_directory() from public, anon, authenticated;
grant execute on function eazily_public_read_internal.read_customer_professional_directory() to anon, authenticated;
commit;
