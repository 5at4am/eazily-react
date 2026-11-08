-- Optional service package estimation.
-- Extends the published offering estimate to honour an optional package price when
-- the customer selects one. Backward compatible: existing one-argument calls keep
-- returning the base service estimate.

create or replace function public.service_booking_estimate(p_post uuid, p_package text default null)
returns jsonb language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
declare
  p partner_posts; price numeric; visit numeric; quantity integer; calculation jsonb; package_row jsonb;
begin
  select * into p from partner_posts where id=p_post and role='professional' and status='published';
  if p.id is null or not exists(select 1 from partner_applications a where a.id=p.partner_id and a.status='approved') then
    raise exception 'Published Service Partner offering required';
  end if;
  if coalesce(p.details->>'serviceCharge','') !~ '^\d+(\.\d{1,2})?$' or
     coalesce(p.details->>'visitingCharge','') !~ '^\d+(\.\d{1,2})?$' or
     coalesce(p.details->>'quantity','1') !~ '^\d{1,4}$' or
     coalesce(p.details->>'taxInclusive','false') <> 'false' or
     coalesce(p.details->>'pricingType','') not in ('Fixed Price','fixed','fixed_price') then
    return jsonb_build_object('available',false,'reason','Final payable is confirmed after the service quote.');
  end if;
  price := (p.details->>'serviceCharge')::numeric;
  if p_package is not null and trim(p_package) <> '' then
    select value into package_row
      from jsonb_array_elements(coalesce(p.details->'packages','[]'::jsonb)) value
      where lower(trim(value->>'name')) = lower(trim(p_package))
      limit 1;
    if package_row is not null and coalesce(package_row->>'price','') ~ '^\d+(\.\d{1,2})?$' then
      price := (package_row->>'price')::numeric;
    end if;
  end if;
  visit := (p.details->>'visitingCharge')::numeric;
  quantity := greatest(1,least(10000,coalesce(nullif(p.details->>'quantity','')::integer,1)));
  begin
    calculation := eazily_private.calculate('professional',jsonb_build_object(
      'servicePaise',(price*100)::bigint,'visitingPaise',(visit*100)::bigint,
      'additionalPaise',0,'quantity',quantity,'taxInclusive',coalesce((p.details->>'taxInclusive')::boolean,false)));
  exception when others then
    return jsonb_build_object('available',false,'reason','Platform charges and tax are not configured for a final estimate.');
  end;
  return jsonb_build_object('available',true,'servicePaise',(price*quantity*100)::bigint,
    'visitingPaise',(visit*100)::bigint,'feePaise',calculation->'feePaise',
    'platformPaise',(calculation->>'markupPaise')::bigint+(calculation->>'feePaise')::bigint,
    'taxPaise',calculation->'taxPaise','totalPaise',calculation->'totalPaise',
    'pricingRuleVersion',calculation->'version');
end $$;
revoke all on function public.service_booking_estimate(uuid, text) from public, anon, authenticated;
grant execute on function public.service_booking_estimate(uuid, text) to anon, authenticated;
