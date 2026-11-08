-- Admin service catalog workflow.
-- Apply after service_catalog_2026_09_20.sql and operations.sql (admin_audit_events).
-- Staff can browse the current taxonomy and propose changes; a main administrator
-- approves or rejects them. Decisions are audited. The approval does not rewrite
-- the customer/partner app taxonomy or historical records; deployment and
-- registration compatibility remain separate verification steps.

create table public.service_catalog_groups (
  id text primary key,
  name text not null,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(name)
);

create table public.service_catalog_services (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.service_catalog_groups(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(group_id, name)
);

create table public.catalog_change_requests (
  id uuid primary key default gen_random_uuid(),
  change_type text not null check(change_type in ('create_service','update_service','deactivate_service','create_group','update_group')),
  group_id text,
  service_id text,
  proposed_name text not null,
  proposed_icon text,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_reason text,
  review_notes text
);

alter table public.service_catalog_groups enable row level security;
alter table public.service_catalog_services enable row level security;
alter table public.catalog_change_requests enable row level security;
revoke all on public.service_catalog_groups, public.service_catalog_services, public.catalog_change_requests from anon, authenticated, public;

with seed_groups(id, name, icon) as (
  values
    ('home-property', 'Home & Property', 'home'),
    ('vehicle', 'Vehicle', 'car'),
    ('personal-daily', 'Personal & Daily', 'person'),
    ('electronics', 'Electronics', 'devices'),
    ('beauty', 'Personal Care', 'sparkles'),
    ('wedding', 'Wedding & Occasion', 'calendar'),
    ('pet', 'Pet Care', 'paw'),
    ('other', 'Other', 'grid')
)
insert into public.service_catalog_groups(id, name, icon)
select id, name, icon from seed_groups;

with seed_services(group_id, name) as (
  values
    ('home-property', 'Electrician'), ('home-property', 'Plumber'),
    ('home-property', 'Carpenter'), ('home-property', 'Painter'),
    ('home-property', 'Tile Worker'), ('home-property', 'POP & False Ceiling'),
    ('home-property', 'Glass Worker'), ('home-property', 'Aluminium Worker'),
    ('home-property', 'Home Maintenance'), ('home-property', 'Key Maker'),
    ('home-property', 'Deep Cleaning'), ('home-property', 'Pest Control'),
    ('home-property', 'CCTV Technician'), ('home-property', 'AC Service'),
    ('vehicle', 'Bike Mechanic'), ('vehicle', 'Car Mechanic'),
    ('vehicle', 'Heavy Vehicle Mechanic'), ('vehicle', 'Battery Technician'),
    ('vehicle', 'Vehicle Modification'), ('vehicle', 'Towing Services'),
    ('vehicle', 'Vehicle Driver'), ('vehicle', 'Car Wash'),
    ('personal-daily', 'Dry Cleaner'), ('personal-daily', 'Shoe Repair'),
    ('personal-daily', 'Cook'), ('personal-daily', 'Maid & House Help'),
    ('personal-daily', 'Laundry Service'), ('personal-daily', 'Tailor & Alterations'),
    ('personal-daily', 'Ironing Service'),
    ('electronics', 'Mobile Repair'), ('electronics', 'Computer Repair'),
    ('electronics', 'RO Technician'), ('electronics', 'Refrigerator Repair'),
    ('electronics', 'Washing Machine Repair'), ('electronics', 'Microwave/Oven Repair'),
    ('electronics', 'TV Repair'), ('electronics', 'CCTV Technician'),
    ('electronics', 'AC Service'),
    ('beauty', 'Women''s Salon'), ('beauty', 'Men''s Salon & Grooming'),
    ('beauty', 'Hair Services'), ('beauty', 'Makeup Artist'),
    ('beauty', 'Facial & Skin Care'), ('beauty', 'Waxing & Threading'),
    ('beauty', 'Manicure & Pedicure'), ('beauty', 'Spa & Massage'),
    ('beauty', 'Bridal Makeup'), ('beauty', 'Mehendi Artist'),
    ('wedding', 'Photographer'), ('wedding', 'Videographer'),
    ('wedding', 'Decorator'), ('wedding', 'Caterer'),
    ('wedding', 'DJ & Music'), ('wedding', 'Stage Setup'),
    ('wedding', 'Band'), ('wedding', 'Tent House'),
    ('wedding', 'Event Manager'),
    ('pet', 'Pet Grooming'), ('pet', 'Pet Boarding'),
    ('pet', 'Pet Walker'), ('pet', 'Pet Training'),
    ('pet', 'Pet Rescue'), ('pet', 'Emergency Pet Support'),
    ('other', 'Packers & Movers'), ('other', 'Tempo Driver'),
    ('other', 'Loading Labour'), ('other', 'Courier'),
    ('other', 'Home Tutor'), ('other', 'Yoga Coach'),
    ('other', 'Personal Trainer')
)
insert into public.service_catalog_services(group_id, name)
select g.id, s.name from seed_services s join public.service_catalog_groups g on g.id = s.group_id;

create or replace function public.admin_catalog_snapshot()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', 'Services',
        'groups', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', g.id::text,
            'name', g.name,
            'active', g.active,
            'services', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', s.id::text,
                'name', s.name,
                'active', s.active
              ) order by s.created_at)
              from public.service_catalog_services s where s.group_id = g.id
            ), '[]'::jsonb)
          ) order by g.created_at)
          from public.service_catalog_groups g
        ), '[]'::jsonb)
      ))
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id::text,
        'change_type', r.change_type,
        'proposed_name', r.proposed_name,
        'group_id', r.group_id,
        'requested_at', r.requested_at
      ) order by r.requested_at desc)
      from public.catalog_change_requests r where r.status = 'pending'
    ), '[]'::jsonb)
  )
$$;

create or replace function public.admin_request_catalog_change(
  p_change_type text,
  p_group_id text,
  p_service_id text,
  p_name text,
  p_icon text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.is_admin() or public.has_staff_permission('catalog.manage')) then
    raise exception 'Permission denied';
  end if;
  if p_change_type not in ('create_service','update_service','deactivate_service','create_group','update_group') then
    raise exception 'Unsupported catalog change type';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Provide a name for the catalog change'; end if;
  if p_change_type in ('create_group','update_group') and length(trim(coalesce(p_icon, ''))) = 0 then
    raise exception 'Provide an illustration icon key for the group';
  end if;
  insert into public.catalog_change_requests(change_type, group_id, service_id, proposed_name, proposed_icon, requested_by)
  values(p_change_type, p_group_id, p_service_id, trim(p_name), nullif(trim(p_icon), ''), auth.uid())
  returning id into new_id;
  insert into public.admin_audit_events(actor_id, action, entity_type, entity_id, after_data)
  values(auth.uid(), 'admin_request_catalog_change', 'catalog_change_requests', new_id::text,
         jsonb_build_object('changeType', p_change_type, 'groupId', p_group_id, 'serviceId', p_service_id,
                            'proposedName', trim(p_name), 'proposedIcon', nullif(trim(p_icon), '')));
  return new_id;
end $$;

create or replace function public.admin_review_catalog_change(p_request uuid, p_approve boolean, p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r public.catalog_change_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_admin() then raise exception 'Permission denied'; end if;
  if length(trim(p_reason)) < 10 then raise exception 'Review notes must be at least 10 characters'; end if;
  select * into r from public.catalog_change_requests where id = p_request;
  if r.id is null then raise exception 'Catalog change request not found'; end if;
  if r.status <> 'pending' then raise exception 'Catalog change request is already decided'; end if;
  update public.catalog_change_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_reason = left(trim(p_reason), 1000)
   where id = r.id;
  insert into public.admin_audit_events(actor_id, action, entity_type, entity_id, reason, after_data)
  values(auth.uid(),
         case when p_approve then 'admin_approve_catalog_change' else 'admin_reject_catalog_change' end,
         'catalog_change_requests', r.id::text, left(trim(p_reason), 1000),
         jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end,
                            'changeType', r.change_type, 'proposedName', r.proposed_name));
end $$;

revoke all on function public.admin_catalog_snapshot() from public, anon, authenticated;
revoke all on function public.admin_request_catalog_change(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_review_catalog_change(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_catalog_snapshot() to authenticated;
grant execute on function public.admin_request_catalog_change(text, text, text, text, text) to authenticated;
grant execute on function public.admin_review_catalog_change(uuid, boolean, text) to authenticated;
