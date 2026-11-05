-- Controlled, auditable service-group and service catalogue changes.
-- Existing historical partner/application records are never rewritten.

create table if not exists public.service_catalog_groups (
  id text primary key,
  category_id uuid not null references public.categories(id),
  name text not null,
  icon text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services add column if not exists group_id text references public.service_catalog_groups(id);
alter table public.service_catalog_groups enable row level security;
create policy "Active catalogue groups are readable" on public.service_catalog_groups for select using(active);
grant select on public.service_catalog_groups to anon,authenticated;
grant select on public.services to anon,authenticated;

-- Seed the currently published static groups as the database-backed baseline.
insert into public.service_catalog_groups(id,category_id,name,icon,sort_order)
select seed.id,c.id,seed.name,seed.icon,seed.sort_order
from public.categories c
cross join (values
 ('home-property','Home & Property','home',10),('vehicle','Vehicle','car',20),
 ('personal-daily','Personal & Daily','person',30),('electronics','Electronics','devices',40),
 ('beauty','Personal Care','sparkles',50),('wedding','Wedding & Occasion','calendar',60),
 ('pet','Pet Care','paw',70),('other','Other','grid',80)
) as seed(id,name,icon,sort_order)
where c.slug='manpower' and c.active
on conflict(id) do nothing;

insert into public.services(category_id,group_id,name,slug,active)
select g.category_id,seed.group_id,seed.name,seed.group_id||'-'||trim(both '-' from regexp_replace(lower(seed.name),'[^a-z0-9]+','-','g')),true
from (values
 ('home-property','Electrician'),('home-property','Plumber'),('home-property','Carpenter'),('home-property','Painter'),('home-property','Tile Worker'),('home-property','POP & False Ceiling'),('home-property','Glass Worker'),('home-property','Aluminium Worker'),('home-property','Home Maintenance'),('home-property','Key Maker'),('home-property','Deep Cleaning'),('home-property','Pest Control'),('home-property','CCTV Technician'),('home-property','AC Service'),
 ('vehicle','Bike Mechanic'),('vehicle','Car Mechanic'),('vehicle','Heavy Vehicle Mechanic'),('vehicle','Battery Technician'),('vehicle','Vehicle Modification'),('vehicle','Towing Services'),('vehicle','Vehicle Driver'),('vehicle','Car Wash'),
 ('personal-daily','Dry Cleaner'),('personal-daily','Shoe Repair'),('personal-daily','Cook'),('personal-daily','Maid & House Help'),('personal-daily','Laundry Service'),('personal-daily','Tailor & Alterations'),('personal-daily','Ironing Service'),
 ('electronics','Mobile Repair'),('electronics','Computer Repair'),('electronics','RO Technician'),('electronics','Refrigerator Repair'),('electronics','Washing Machine Repair'),('electronics','Microwave/Oven Repair'),('electronics','TV Repair'),('electronics','CCTV Technician'),('electronics','AC Service'),
 ('beauty','Women''s Salon'),('beauty','Men''s Salon & Grooming'),('beauty','Hair Services'),('beauty','Makeup Artist'),('beauty','Facial & Skin Care'),('beauty','Waxing & Threading'),('beauty','Manicure & Pedicure'),('beauty','Spa & Massage'),('beauty','Bridal Makeup'),('beauty','Mehendi Artist'),
 ('wedding','Photographer'),('wedding','Videographer'),('wedding','Decorator'),('wedding','Caterer'),('wedding','DJ & Music'),('wedding','Stage Setup'),('wedding','Band'),('wedding','Tent House'),('wedding','Event Manager'),
 ('pet','Pet Grooming'),('pet','Pet Boarding'),('pet','Pet Walker'),('pet','Pet Training'),('pet','Pet Rescue'),('pet','Emergency Pet Support'),
 ('other','Packers & Movers'),('other','Tempo Driver'),('other','Loading Labour'),('other','Courier'),('other','Home Tutor'),('other','Yoga Coach'),('other','Personal Trainer')
) as seed(group_id,name)
join public.service_catalog_groups g on g.id=seed.group_id
on conflict(category_id,slug) do update set group_id=excluded.group_id,active=true;

create table public.service_catalog_change_requests (
  id uuid primary key default gen_random_uuid(),
  change_type text not null check(change_type in('create_group','update_group','create_service','update_service','deactivate_service')),
  group_id text,
  service_id uuid references public.services(id),
  proposed_name text not null,
  proposed_icon text,
  status text not null default 'pending' check(status in('pending','approved','rejected')),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_reason text,
  constraint reviewed_request_has_reviewer check(status='pending' or (reviewed_by is not null and reviewed_at is not null))
);
alter table public.service_catalog_change_requests enable row level security;
create policy "Catalog managers read change requests" on public.service_catalog_change_requests for select
  using(is_admin() or has_staff_permission('catalog.manage'));
grant select on public.service_catalog_change_requests to authenticated;

create or replace function public.admin_catalog_snapshot()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if not (is_admin() or has_staff_permission('catalog.manage')) then raise exception 'Catalog management permission required'; end if;
  select jsonb_build_object(
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'icon',c.icon,'active',c.active,'sortOrder',c.sort_order,
      'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'icon',g.icon,'active',g.active,'sortOrder',g.sort_order,
        'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'active',s.active,'slug',s.slug) order by s.name) from public.services s where s.group_id=g.id),'[]'::jsonb)
      ) order by g.sort_order,g.name) from public.service_catalog_groups g where g.category_id=c.id),'[]'::jsonb)
    ) order by c.sort_order,c.name) from public.categories c),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.requested_at desc) from public.service_catalog_change_requests r where r.status='pending'),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.admin_request_catalog_change(
  p_change_type text,p_group_id text,p_service_id uuid,p_name text,p_icon text default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid; clean_name text:=trim(coalesce(p_name,''));
begin
  if not (is_admin() or has_staff_permission('catalog.manage')) then raise exception 'Catalog management permission required'; end if;
  if p_change_type not in('create_group','update_group','create_service','update_service','deactivate_service') then raise exception 'Unsupported catalogue change'; end if;
  if length(clean_name)<2 or length(clean_name)>80 then raise exception 'Name must be between 2 and 80 characters'; end if;
  if p_change_type='create_group' and coalesce(p_group_id,'') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Group ID must use lowercase letters, numbers, and hyphens'; end if;
  if p_change_type in('update_group','create_service','update_service','deactivate_service') and not exists(select 1 from public.service_catalog_groups where id=p_group_id and active) then raise exception 'Select an active service group'; end if;
  if p_change_type in('update_service','deactivate_service') and not exists(select 1 from public.services where id=p_service_id and group_id=p_group_id and active) then raise exception 'Service not found in this group'; end if;
  if p_change_type='update_group' and not exists(select 1 from public.service_catalog_groups where id=p_group_id) then raise exception 'Service group not found'; end if;
  insert into public.service_catalog_change_requests(change_type,group_id,service_id,proposed_name,proposed_icon,requested_by)
  values(p_change_type,p_group_id,p_service_id,clean_name,nullif(trim(coalesce(p_icon,'')),''),auth.uid()) returning id into result;
  insert into public.admin_audit_events(actor_id,action,entity_type,entity_id,after_data)
  values(auth.uid(),'catalog_change_requested','service_catalog_change_requests',result::text,
    jsonb_build_object('changeType',p_change_type,'groupId',p_group_id,'serviceId',p_service_id,'proposedName',clean_name,'proposedIcon',nullif(trim(coalesce(p_icon,'')),'')));
  return result;
end $$;

create or replace function public.admin_review_catalog_change(p_request uuid,p_approve boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.service_catalog_change_requests; target_id uuid; category public.categories; generated_slug text; before_data jsonb; after_data jsonb;
begin
  if not is_admin() then raise exception 'Main administrator access required to approve catalogue changes'; end if;
  if length(trim(coalesce(p_reason,'')))<10 then raise exception 'Add a review reason of at least 10 characters'; end if;
  select * into r from public.service_catalog_change_requests where id=p_request and status='pending' for update;
  if r.id is null then raise exception 'Pending catalogue change not found'; end if;
  if p_approve then
    if r.change_type='update_group' then select to_jsonb(g) into before_data from public.service_catalog_groups g where g.id=r.group_id for update;
    elsif r.change_type in('update_service','deactivate_service') then select to_jsonb(s) into before_data from public.services s where s.id=r.service_id for update;
    end if;
    if r.change_type='create_group' then
      select * into category from public.categories where slug='manpower' and active;
      if category.id is null then raise exception 'Services category is unavailable'; end if;
      if exists(select 1 from public.service_catalog_groups where id=r.group_id) then raise exception 'Group ID is already in use'; end if;
      insert into public.service_catalog_groups(id,category_id,name,icon,sort_order) values(r.group_id,category.id,r.proposed_name,r.proposed_icon,coalesce((select max(sort_order)+1 from public.service_catalog_groups where category_id=category.id),0));
    elsif r.change_type='update_group' then
      update public.service_catalog_groups set name=r.proposed_name,icon=coalesce(r.proposed_icon,icon),updated_at=now() where id=r.group_id;
    elsif r.change_type='create_service' then
      generated_slug:=r.group_id||'-'||trim(both '-' from regexp_replace(lower(r.proposed_name),'[^a-z0-9]+','-','g'));
      if exists(select 1 from public.services where group_id=r.group_id and (lower(name)=lower(r.proposed_name) or slug=generated_slug)) then raise exception 'A service with this name already exists in the group'; end if;
      insert into public.services(category_id,group_id,name,slug,active)
      select category_id,r.group_id,r.proposed_name,generated_slug,true from public.service_catalog_groups where id=r.group_id returning id into target_id;
    elsif r.change_type='update_service' then
      generated_slug:=r.group_id||'-'||trim(both '-' from regexp_replace(lower(r.proposed_name),'[^a-z0-9]+','-','g'));
      if exists(select 1 from public.services where group_id=r.group_id and id<>r.service_id and (lower(name)=lower(r.proposed_name) or slug=generated_slug)) then raise exception 'A service with this name already exists in the group'; end if;
      update public.services set name=r.proposed_name,slug=generated_slug where id=r.service_id and group_id=r.group_id returning id into target_id;
    elsif r.change_type='deactivate_service' then
      update public.services set active=false where id=r.service_id and group_id=r.group_id returning id into target_id;
    end if;
    if r.change_type in('create_group','update_group') then select to_jsonb(g) into after_data from public.service_catalog_groups g where g.id=r.group_id;
    elsif target_id is not null then select to_jsonb(s) into after_data from public.services s where s.id=target_id;
    end if;
  end if;
  update public.service_catalog_change_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now(),review_reason=left(trim(p_reason),1000) where id=r.id;
  insert into public.admin_audit_events(actor_id,action,entity_type,entity_id,reason,before_data,after_data)
  values(auth.uid(),case when p_approve then 'catalog_change_approved' else 'catalog_change_rejected' end,'service_catalog_change_requests',r.id::text,left(trim(p_reason),1000),coalesce(before_data,to_jsonb(r)),jsonb_build_object('status',case when p_approve then 'approved' else 'rejected' end,'changeType',r.change_type,'name',r.proposed_name,'targetId',coalesce(target_id,r.service_id),'record',after_data));
  return jsonb_build_object('id',r.id,'status',case when p_approve then 'approved' else 'rejected' end,'targetId',coalesce(target_id,r.service_id));
end $$;

-- Check selections against the live, approved taxonomy. Delegate all unrelated
-- registration, document, timing, consent, and bank checks to the established validator.
alter function public.validate_service_partner_registration_catalog_2026_09_20(jsonb,uuid)
  rename to validate_service_partner_registration_catalog_before_admin_changes;
create function public.validate_service_partner_registration_catalog_2026_09_20(p_details jsonb,p_owner uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  selection jsonb;
  checked jsonb:=p_details;
  checked_selections jsonb:='[]'::jsonb;
  group_row public.service_catalog_groups;
  label text;
  representative text;
  legacy_group_id text;
  service_name text;
begin
  if jsonb_typeof(p_details->'serviceSelections')<>'array' or jsonb_array_length(p_details->'serviceSelections')=0 then raise exception 'Select at least one service'; end if;
  for selection in select value from jsonb_array_elements(p_details->'serviceSelections') loop
    select * into group_row from public.service_catalog_groups where id=selection->>'categoryId' and active;
    if group_row.id is null or selection->>'categoryLabel' is distinct from group_row.name then raise exception 'A selected service group is not in the approved catalogue'; end if;
    service_name:=selection->>'serviceName';
    if coalesce(selection->>'serviceId','')<>service_name or not exists(
      select 1 from public.services s where s.group_id=group_row.id and s.active and s.name=service_name
    ) then raise exception 'A selected service does not match the approved catalogue'; end if;
    case group_row.id
      when 'home-property' then label:='Home & Property'; representative:='Electrician'; legacy_group_id:='home-property';
      when 'vehicle' then label:='Vehicle'; representative:='Bike Mechanic'; legacy_group_id:='vehicle';
      when 'personal-daily' then label:='Personal & Daily'; representative:='Dry Cleaner'; legacy_group_id:='personal-daily';
      when 'electronics' then label:='Electronics'; representative:='Mobile Repair'; legacy_group_id:='electronics';
      when 'beauty' then label:='Personal Care'; representative:='Women''s Salon'; legacy_group_id:='beauty';
      when 'wedding' then label:='Wedding & Occasion'; representative:='Photographer'; legacy_group_id:='wedding';
      when 'pet' then label:='Pet Care'; representative:='Pet Grooming'; legacy_group_id:='pet';
      when 'other' then label:='Other'; representative:='Packers & Movers'; legacy_group_id:='other';
      else label:='Other'; representative:='Packers & Movers'; legacy_group_id:='other';
    end case;
    checked_selections:=checked_selections||jsonb_build_array(jsonb_build_object(
      'categoryId',legacy_group_id,'categoryLabel',label,'serviceId',representative,'serviceName',representative
    ));
  end loop;
  checked:=jsonb_set(checked,'{serviceSelections}',checked_selections,true);
  perform public.validate_service_partner_registration_catalog_before_admin_changes(checked,p_owner);
end $$;
revoke all on function public.validate_service_partner_registration_catalog_before_admin_changes(jsonb,uuid) from public,anon,authenticated;
revoke all on function public.validate_service_partner_registration_catalog_2026_09_20(jsonb,uuid) from public,anon,authenticated;

revoke all on function public.admin_catalog_snapshot() from public,anon,authenticated;
revoke all on function public.admin_request_catalog_change(text,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.admin_review_catalog_change(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.admin_catalog_snapshot() to authenticated;
grant execute on function public.admin_request_catalog_change(text,text,uuid,text,text) to authenticated;
grant execute on function public.admin_review_catalog_change(uuid,boolean,text) to authenticated;
notify pgrst,'reload schema';
