-- Verified partners publish ordinary listings and set their own service/package price.
-- Keep identity, legal, category, payment, and safety checks server-side; flagged content
-- still enters the existing moderation queue.
begin;

update public.service_post_approval_config
set auto_publish_enabled=true,
    require_review_for_new_media=false,
    updated_at=now()
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
  if length(trim(coalesce(p_details->>'description','')))<coalesce(cfg.min_description_length,12) then
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

-- Consultant profiles may contain multiple verified specialties; each can be listed
-- and priced by the consultant after that specialty's existing assessment gate passes.
create or replace function eazily_private.guard_published_post() returns trigger
language plpgsql security definer set search_path=public,eazily_private as $$
declare a public.partner_applications; media jsonb; valid boolean; kind text; registered boolean;
begin
  if new.status not in ('published','pending_review') then return new; end if;
  select * into a from public.partner_applications where id=new.partner_id;
  if a.status<>'approved' or a.role<>new.role then raise exception 'Approved matching partner role required'; end if;
  kind:=coalesce(new.details->>'postType','offering');
  if new.role='professional' and kind='offering' then
    registered:=exists(select 1 from jsonb_array_elements(coalesce(a.details->'serviceSelections','[]'::jsonb)) item
      where item->>'categoryId'=new.details->>'categoryId' and item->>'serviceId'=new.details->>'serviceId'
        and item->>'categoryLabel'=new.details->>'category' and item->>'serviceName'=new.details->>'service')
      or (new.details->>'category'=a.details->>'category' and coalesce(a.details->'services','[]'::jsonb) ? (new.details->>'service'));
    if not registered and new.status='published' then raise exception 'Registered category and service required'; end if;
  elsif new.role='consultant' then
    registered:=new.details->>'category'=a.details->>'category'
      or exists(select 1 from jsonb_array_elements(coalesce(a.details->'consultationFields','[]'::jsonb)) field
        where field->>'category'=new.details->>'category');
    if not registered and new.status='published' then raise exception 'Registered consultation category required'; end if;
  elsif new.details->>'category' is distinct from a.details->>'category' then
    raise exception 'Registered category required';
  end if;
  for media in select value from jsonb_array_elements(coalesce(new.details->'media','[]'::jsonb)) loop
    if media->>'path' like '%/documents/%' or media->>'path' not like a.customer_id::text||'/'||a.role||'/%'
       or media->>'type' not in('image/jpeg','image/png','image/webp','video/mp4','video/webm') then
      raise exception 'Only your public work media can be attached';
    end if;
    if to_regclass('storage.objects') is null then raise exception 'Media storage validation is not available'; end if;
    execute 'select exists(select 1 from storage.objects where bucket_id=''partner-media'' and name=$1 and owner_id=$2 and (metadata->>''size'')::bigint between 1 and 52428800 and metadata->>''mimetype''=$3)'
      into valid using media->>'path',a.customer_id::text,media->>'type';
    if not valid then raise exception 'Upload must finish before submission'; end if;
  end loop;
  if new.status='published' and kind='offering' and not eazily_private.post_price(new) ? 'totalPaise' then
    raise exception 'Configure complete customer pricing before publishing';
  end if;
  return new;
end $$;

-- Preserve the established validation, ownership, audit and edit-revision behavior, then
-- publish safe Service Partner portfolio/content posts immediately. Service offerings use
-- save_service_partner_post and the risk checks above.
alter function public.save_partner_post(text,jsonb,text,uuid) rename to save_partner_post_vendor_review_legacy;
revoke all on function public.save_partner_post_vendor_review_legacy(text,jsonb,text,uuid) from public,anon,authenticated;
alter function public.save_service_partner_post(jsonb,text,uuid,uuid) rename to save_service_partner_post_vendor_review_legacy;
revoke all on function public.save_service_partner_post_vendor_review_legacy(jsonb,text,uuid,uuid) from public,anon,authenticated;

create function public.save_partner_post(p_role text,p_details jsonb,p_action text,p_post_id uuid default null)
returns public.partner_posts language plpgsql security definer set search_path=public,eazily_private as $$
declare app public.partner_applications; result public.partner_posts; revision public.service_post_revisions;
  body text; reasons text[]; clean jsonb; allowed text[]; needs_review boolean:=false;
begin
  if p_role not in ('professional','influencer','consultant') then raise exception 'Invalid partner role'; end if;
  if p_action not in ('draft','submit','pause','archive') then raise exception 'Invalid post action'; end if;
  select * into app from public.partner_applications where customer_id=auth.uid() and role=p_role;
  if app.id is null then raise exception 'Complete role onboarding first'; end if;

  if p_role='professional' and coalesce(p_details->>'postType','offering')='offering' then
    return public.save_service_partner_post_vendor_review_legacy(p_details,p_action,p_post_id,null);
  end if;

  if p_role in ('professional','influencer') then
    result:=public.save_partner_post_vendor_review_legacy(p_role,p_details,p_action,p_post_id);
    if p_action<>'submit' then return result; end if;
    if result.status='pending_review' then
      body:=concat_ws(' ',result.details->>'title',result.details->>'description',result.details->>'caption');
      if body ~* '(^|[^0-9])(\+?91[- ]?)?[6-9][0-9]{9}([^0-9]|$)'
         or body ~* '[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}'
         or body ~* '(upi|gpay|phonepe|paytm|whatsapp|wa[.]me|scan.{0,15}pay)'
         or exists(select 1 from jsonb_array_elements(coalesce(result.details->'media','[]'::jsonb)) m
           where coalesce(m->>'path','') ~* '(qr|upi|payment|flagged)') then
        update public.partner_posts set review_notes='Flagged content needs a marketplace safety review',updated_at=now()
          where id=result.id returning * into result;
      else
        update public.partner_posts set status='published',review_notes=null,updated_at=now()
          where id=result.id returning * into result;
        if p_role='professional' then
          insert into public.service_post_approval_decisions(post_id,decision,reason,decided_by)
          values(result.id,'auto_published','Verified partner content passed automated listing checks',auth.uid());
        end if;
      end if;
    elsif p_role='professional' and result.status='published' then
      select * into revision from public.service_post_revisions
        where post_id=result.id and status='pending_review' order by created_at desc limit 1 for update;
      if revision.id is not null then
        body:=concat_ws(' ',revision.details->>'title',revision.details->>'description',revision.details->>'caption');
        if body !~* '(^|[^0-9])(\+?91[- ]?)?[6-9][0-9]{9}([^0-9]|$)'
           and body !~* '[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}'
           and body !~* '(upi|gpay|phonepe|paytm|whatsapp|wa[.]me|scan.{0,15}pay)' then
          update public.partner_posts set details=revision.details,review_notes=null,updated_at=now()
            where id=result.id returning * into result;
          update public.service_post_revisions set status='approved',review_reason='Published by verified partner after automated checks',reviewed_at=now()
            where id=revision.id;
          insert into public.service_post_approval_decisions(post_id,revision_id,decision,reason,decided_by)
            values(result.id,revision.id,'auto_published','Verified partner edit passed automated listing checks',auth.uid());
        end if;
      end if;
    end if;
    return result;
  end if;

  if p_action in ('pause','archive') then
    select * into result from public.partner_posts where id=p_post_id and partner_id=app.id and role=p_role for update;
    if result.id is null then raise exception 'Post not found in this workspace'; end if;
    update public.partner_posts set status=case when p_action='archive' then 'archived' else 'paused' end,
      updated_at=now() where id=result.id returning * into result;
    return result;
  end if;
  if p_action='submit' and app.status<>'approved' then raise exception 'Partner verification is required before publishing'; end if;
  if p_post_id is not null then
    select * into result from public.partner_posts where id=p_post_id for update;
    if result.id is not null and (result.partner_id<>app.id or result.role<>p_role) then raise exception 'Post not found in this workspace'; end if;
  end if;
  allowed:=array['postType','category','service','title','description','caption','area','availability','media','hashtags','linkedPostId','packageId','packageSnapshot','platform','serviceArea','packagePrice','deliverables','deliverableCount','timeline','revisions','usageRights','advertisingPermissions','packageTermsConfirmed','audience','mode','duration','offlineLocation','offerBenefit','offerStarts','offerEnds','offerTerms'];
  if exists(select 1 from jsonb_object_keys(p_details) k where k<>all(allowed)) then raise exception 'Post contains unsupported or protected fields'; end if;
  if p_details->>'category' is distinct from app.details->>'category'
     and not exists(select 1 from jsonb_array_elements(coalesce(app.details->'consultationFields','[]'::jsonb)) field
       where field->>'category'=p_details->>'category') then raise exception 'Choose a registered consultation category'; end if;
  if p_details ? 'linkedPostId' and nullif(p_details->>'linkedPostId','') is not null
     and not exists(select 1 from public.partner_posts where id=(p_details->>'linkedPostId')::uuid and partner_id=app.id and status='published' and coalesce(details->>'postType','offering')='offering') then
    raise exception 'Choose your own published offering';
  end if;
  if jsonb_typeof(coalesce(p_details->'media','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_details->'media','[]'::jsonb))>10 then raise exception 'Maximum ten media items'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p_details->'media','[]'::jsonb)) m
      where coalesce(m->>'path','') not like auth.uid()::text||'/'||p_role||'/%' or m->>'path' like '%/documents/%') then
    raise exception 'Media must belong to this workspace';
  end if;
  clean:=p_details;
  if p_action='submit' then
    if length(trim(coalesce(p_details->>'title','')))<3 or length(trim(coalesce(p_details->>'description','')))<3 then raise exception 'Add a title and description'; end if;
    if coalesce(p_details->>'postType','offering') not in ('offering','photo','video','portfolio','knowledge') then raise exception 'This post type needs marketplace review'; end if;
    if coalesce(p_details->>'postType','offering') in ('photo','video','portfolio') and jsonb_array_length(coalesce(p_details->'media','[]'::jsonb))=0 then raise exception 'Upload media before publishing'; end if;
    if p_role='consultant' and coalesce(p_details->>'postType','offering')='offering' then
      if coalesce(p_details->>'category','')='' or coalesce(p_details->>'duration','') not in ('15','30','45','60')
          or coalesce(p_details->>'mode','')='' or coalesce(p_details->>'packagePrice','') !~ '^([0-9]+)(\.[0-9]{1,2})?$'
         or (p_details->>'packagePrice')::numeric<=0 then raise exception 'Complete your consultation mode, duration and price'; end if;
    end if;
  end if;
  if p_role='consultant' then
    body:=concat_ws(' ',clean->>'title',clean->>'description',clean->>'caption');
    if body ~* '(^|[^0-9])(\+?91[- ]?)?[6-9][0-9]{9}([^0-9]|$)'
       or body ~* '[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}'
       or body ~* '(upi|gpay|phonepe|paytm|whatsapp|wa[.]me|scan.{0,15}pay)'
       or exists(select 1 from jsonb_array_elements(coalesce(clean->'media','[]'::jsonb)) m where coalesce(m->>'path','') ~* '(qr|upi|payment|flagged)') then
      needs_review:=true;
    end if;
  end if;
  insert into public.partner_posts(id,partner_id,role,status,details)
    values(coalesce(p_post_id,gen_random_uuid()),app.id,p_role,
      case when p_action='draft' then 'draft' when needs_review then 'pending_review' else 'published' end,clean)
  on conflict(id) do update set details=excluded.details,status=excluded.status,review_notes=null,updated_at=now()
    where partner_posts.partner_id=app.id and partner_posts.role=p_role returning * into result;
  if result.id is null then raise exception 'Post not found in this workspace'; end if;
  insert into public.partner_audit_log(actor_id,action,entity_type,entity_id)
    values(auth.uid(),case when result.status='published' then 'publish' else p_action end,'partner_post',result.id::text);
  if result.status='published' and coalesce(result.details->>'postType','offering')='offering'
     and not eazily_private.post_price(result) ? 'totalPaise' then
    raise exception 'Pricing is temporarily unavailable; your listing was not published';
  end if;
  return result;
end $$;

create function public.save_service_partner_post(p_details jsonb,p_action text default 'draft',p_post_id uuid default null,p_operation_key uuid default null)
returns public.partner_posts language plpgsql security definer set search_path=public,eazily_private as $$
declare result public.partner_posts; revision public.service_post_revisions; app public.partner_applications; reasons text[];
begin
  result:=public.save_service_partner_post_vendor_review_legacy(p_details,p_action,p_post_id,p_operation_key);
  if p_action<>'submit' or result.status<>'published'
     or coalesce(result.review_notes,'') not like 'Updated version awaiting Admin review%' then
    return result;
  end if;
  select * into app from public.partner_applications where id=result.partner_id;
  select * into revision from public.service_post_revisions
    where post_id=result.id and status='pending_review' order by created_at desc limit 1 for update;
  if revision.id is null then return result; end if;
  reasons:=eazily_private.service_post_review_reasons(app,revision.details,result.id);
  if cardinality(reasons)>0 then return result; end if;
  update public.partner_posts set details=revision.details,review_notes=null,updated_at=now()
    where id=result.id returning * into result;
  update public.service_post_revisions set status='approved',review_reason='Published by verified partner after automated checks',reviewed_at=now()
    where id=revision.id;
  insert into public.service_post_approval_decisions(post_id,revision_id,decision,reason,decided_by)
    values(result.id,revision.id,'auto_published','Verified partner edit passed automated listing checks',auth.uid());
  return result;
end $$;

-- Consultant listings use their own packagePrice as the base price. Eazily's active
-- platform pricing rule still calculates the customer-facing total and applicable fees.
create or replace function eazily_private.post_price(p public.partner_posts) returns jsonb
language plpgsql security definer set search_path=public,eazily_private as $$
declare amount numeric; input jsonb; calc jsonb;
begin
  if coalesce(p.details->>'postType','offering')<>'offering' then return '{}'::jsonb; end if;
  amount:=case when p.role='professional' then (p.details->>'serviceCharge')::numeric else (p.details->>'packagePrice')::numeric end;
  if amount is null then return '{}'::jsonb; end if;
  input:=jsonb_build_object('servicePaise',round(amount*100),
    'quantity',coalesce((p.details->>'quantity')::integer,1),
    'visitingPaise',case when p.role='professional' and p.details->>'visitTreatment'='Additional' then round(coalesce((p.details->>'visitingCharge')::numeric,0)*100) else 0 end,
    'additionalPaise',0,'taxInclusive',coalesce((p.details->>'taxInclusive')::boolean,false));
  calc:=eazily_private.calculate(p.role,input);
  return eazily_private.pick(calc,array['ruleId','version','sellerBasePaise','markupPaise','markupBps','servicePaise','feePaise','taxPaise','totalPaise']);
exception when others then return '{}'::jsonb;
end $$;

revoke all on function public.save_partner_post(text,jsonb,text,uuid) from public,anon;
grant execute on function public.save_partner_post(text,jsonb,text,uuid) to authenticated;
revoke all on function public.save_partner_post_vendor_review_legacy(text,jsonb,text,uuid) from public,anon,authenticated;
revoke all on function public.save_service_partner_post(jsonb,text,uuid,uuid) from public,anon;
grant execute on function public.save_service_partner_post(jsonb,text,uuid,uuid) to authenticated;
revoke all on function public.save_service_partner_post_vendor_review_legacy(jsonb,text,uuid,uuid) from public,anon,authenticated;
commit;
