-- Activate the listing/pricing path end to end:
--  * every seller role gets a complete, enabled pricing rule so post_price()
--    can return a customer total instead of failing closed with {};
--  * a listing description stays optional, matching the partner post form;
--  * admin moderation keeps the account-status guard and the full decision set.
begin;

-- The live table predates the markup-threshold columns that calculate() already
-- reads, so every calculation failed and post_price() returned {}. Restore the
-- documented seller_pricing.sql shape before seeding a complete rule.
alter table public.seller_pricing_rules
  add column if not exists upper_threshold_paise bigint not null default 100000 check(upper_threshold_paise>0),
  add column if not exists minimum_markup_paise bigint check(minimum_markup_paise>=0),
  add column if not exists maximum_markup_paise bigint check(maximum_markup_paise>=0);

do $$
begin
  if not exists(select 1 from pg_constraint where conrelid='public.seller_pricing_rules'::regclass and conname='seller_pricing_rules_markup_bounds_check') then
    alter table public.seller_pricing_rules
      add constraint seller_pricing_rules_markup_bounds_check
      check(minimum_markup_paise is null or maximum_markup_paise is null or minimum_markup_paise<=maximum_markup_paise);
  end if;
end $$;

-- Complete pricing rules. Append an enabled version per role and keep the
-- historical (disabled/incomplete) versions for audit. Existing complete and
-- enabled rules are left untouched, so this is safe to re-run.
insert into public.seller_pricing_rules(
  role,version,enabled,lower_markup_bps,upper_markup_bps,upper_threshold_paise,
  minimum_markup_paise,maximum_markup_paise,below_100_bps,consultant_share_bps,
  seller_tax_bps,customer_tax_bps,fee_tax_bps,separate_fee_paise,
  include_visiting,include_additional,rounding)
select latest.role,
  (select coalesce(max(previous.version),0)+1 from public.seller_pricing_rules previous where previous.role=latest.role),
  true,2500,1200,100000,null,null,2500,latest.consultant_share_bps,
  0,0,0,0,true,true,'half_up'
from (
  select distinct on (role) role,consultant_share_bps
  from public.seller_pricing_rules
  where role in ('professional','influencer','consultant')
  order by role,version desc
) latest
where not exists (
  select 1 from public.seller_pricing_rules complete
  where complete.role=latest.role and complete.enabled
    and complete.seller_tax_bps is not null and complete.customer_tax_bps is not null
    and complete.fee_tax_bps is not null and complete.separate_fee_paise is not null
    and complete.include_visiting is not null and complete.include_additional is not null
);

-- A listing description is optional in the partner form. An empty description
-- must not send an otherwise valid listing to manual review. Allow 0 to mean
-- "no minimum"; higher values keep the existing admin control.
alter table public.service_post_approval_config
  drop constraint if exists service_post_approval_config_min_description_length_check;
alter table public.service_post_approval_config
  add constraint service_post_approval_config_min_description_length_check
  check(min_description_length between 0 and 500);

update public.service_post_approval_config
set min_description_length=0,updated_at=now()
where id=true;

create or replace function eazily_private.service_post_review_reasons(
  p_app public.partner_applications, p_details jsonb, p_post_id uuid
) returns text[] language plpgsql stable security definer set search_path=public,eazily_private as $$
declare cfg public.service_post_approval_config; reasons text[]:=array[]::text[]; body text;
begin
  select * into cfg from public.service_post_approval_config where id=true;
  if cfg.id is null or not cfg.auto_publish_enabled then
    reasons:=array_append(reasons,'Publishing is temporarily paused');
  end if;
  if p_app.status<>'approved' then
    reasons:=array_append(reasons,'Partner verification is pending');
  end if;
  if coalesce(cfg.min_description_length,0)>0
     and length(trim(coalesce(p_details->>'description','')))<cfg.min_description_length then
    reasons:=array_append(reasons,'Service description needs review');
  end if;
  if length(trim(coalesce(p_details->>'title','')))<3 or coalesce(p_details->>'service','')=''
     or coalesce(p_details->>'categoryId','')='' or coalesce(p_details->>'pricingType','')=''
     or coalesce(p_details->>'serviceCharge','')='' then
    reasons:=array_append(reasons,'Required service details are incomplete');
  end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(p_app.details->'serviceSelections','[]'::jsonb)) s
      where s->>'categoryId'=p_details->>'categoryId' and s->>'serviceId'=p_details->>'serviceId')
     and not (p_app.details->>'category'=p_details->>'category'
       and coalesce(p_app.details->'services','[]'::jsonb) ? (p_details->>'service')) then
    reasons:=array_append(reasons,'Category or service is not approved');
  end if;
  if exists(select 1 from public.partner_posts p where p.partner_id=p_app.id and p.id<>p_post_id
      and p.status not in('archived','rejected') and p.created_at>now()-make_interval(days=>coalesce(cfg.duplicate_window_days,90))
      and (lower(trim(p.details->>'title'))=lower(trim(p_details->>'title'))
        or (length(trim(coalesce(p_details->>'description','')))>0
          and lower(trim(p.details->>'description'))=lower(trim(p_details->>'description'))))
      and p.details->>'service'=p_details->>'service') then
    reasons:=array_append(reasons,'Similar Service Partner post needs review');
  end if;
  body:=concat_ws(' ',p_details->>'title',p_details->>'description');
  if body ~* '(^|[^0-9])(\+?91[- ]?)?[6-9][0-9]{9}([^0-9]|$)'
     or body ~* '[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}'
     or body ~* coalesce(nullif(cfg.flagged_text_pattern,''),'a^') then
    reasons:=array_append(reasons,'Contact, payment, or flagged text needs review');
  end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p_details->'media','[]'::jsonb)) media
      where coalesce(media->>'path','') ~* coalesce(nullif(cfg.flagged_media_pattern,''),'a^')) then
    reasons:=array_append(reasons,'Flagged media needs review');
  end if;
  return reasons;
end $$;

-- Keep request-for-changes distinct from rejection in the Admin audit trail.
alter table public.service_post_approval_decisions
  drop constraint if exists service_post_approval_decisions_decision_check;
alter table public.service_post_approval_decisions
  add constraint service_post_approval_decisions_decision_check
  check (decision in ('review_required','auto_published','admin_published','admin_changes_requested','admin_rejected','admin_hidden','admin_override'));

-- Reason-required moderation, with the account-status guard that later
-- hardening scripts add to every sensitive RPC.
create or replace function public.admin_review_post(p_id uuid,p_status text,p_notes text default null)
returns public.partner_posts language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
declare post public.partner_posts; result public.partner_posts; decision text;
begin
  if auth.uid() is not null and not public.account_is_active() then raise exception 'Account access restricted'; end if;
  if not (is_admin() or has_staff_permission('post.moderate')) then raise exception 'Admin access required'; end if;
  select * into post from public.partner_posts where id=p_id for update;
  if post.id is null then raise exception 'Post not found'; end if;
  if post.role<>'professional' then return public.admin_review_post_legacy(p_id,p_status,p_notes); end if;
  if p_status not in ('published','rejected','changes_required','paused') then raise exception 'Invalid post status'; end if;
  if length(trim(coalesce(p_notes,'')))<3 then raise exception 'Record a reason for this decision'; end if;
  if p_status='published' and post.status not in ('pending_review','paused','rejected','changes_required') then raise exception 'Post is not awaiting approval or hidden'; end if;
  if p_status='paused' and post.status<>'published' then raise exception 'Only a live post can be hidden'; end if;
  update public.partner_posts set status=p_status,
    review_notes=case when p_status='paused' then 'Admin hidden: '||p_notes else p_notes end,
    updated_at=now()
    where id=p_id returning * into result;
  decision:=case
    when p_status='published' and post.status<>'pending_review' then 'admin_override'
    when p_status='published' then 'admin_published'
    when p_status='paused' then 'admin_hidden'
    when p_status='changes_required' then 'admin_changes_requested'
    else 'admin_rejected' end;
  insert into public.service_post_approval_decisions(post_id,decision,reason,decided_by)
    values(p_id,decision,p_notes,auth.uid());
  insert into public.partner_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'review_post','partner_post',p_id::text,to_jsonb(post),to_jsonb(result));
  return result;
end $$;
revoke all on function public.admin_review_post(uuid,text,text) from public,anon;
grant execute on function public.admin_review_post(uuid,text,text) to authenticated;

commit;
