-- Typed, owner-scoped notifications for partner application review decisions.
-- This additive migration preserves existing booking notifications and notes remain
-- authoritative on partner_applications.review_notes.
alter table public.seller_notifications
  add column destination_type text not null default 'booking',
  add column partner_application_id uuid references public.partner_applications(id);

alter table public.seller_notifications
  add constraint seller_notifications_destination_type_check
    check (destination_type in ('booking', 'application')),
  add constraint seller_notifications_destination_reference_check
    check (
      (destination_type = 'booking' and partner_application_id is null)
      or (destination_type = 'application' and order_id is null and partner_application_id is not null)
    );

create index seller_notifications_application_destination_idx
  on public.seller_notifications(partner_application_id)
  where destination_type = 'application';

create or replace function public.admin_review_partner(
  p_id uuid,
  p_status text,
  p_notes text default null
) returns public.partner_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old public.partner_applications;
  result public.partner_applications;
begin
  if not (is_admin() or has_staff_permission('partner.approve')) then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('under_review', 'approved', 'changes_required', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  select * into old
  from public.partner_applications
  where id = p_id
  for update;

  if old.id is null then
    raise exception 'Partner application not found';
  end if;
  if p_status = 'approved'
     and old.role = 'influencer'
     and coalesce((
       select max((x->>'count')::bigint)
       from jsonb_array_elements(coalesce(old.details->'platforms', '[]'::jsonb)) x
     ), 0) < (select influencer_threshold from public.partner_config) then
    raise exception 'Influencer requires 5,000 or configured threshold on one platform';
  end if;

  update public.partner_applications
  set status = p_status,
      review_notes = p_notes,
      reviewed_at = now(),
      updated_at = now()
  where id = p_id
  returning * into result;

  if p_status = 'approved' and result.role = 'professional' then
    insert into public.partner_availability(partner_id, online)
    values (result.id, false)
    on conflict (partner_id) do nothing;
  end if;

  insert into public.partner_audit_log(actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), 'review_partner', 'partner_application', p_id::text, to_jsonb(old), to_jsonb(result));

  if old.status is distinct from result.status then
    insert into public.seller_notifications(
      account_id,
      role,
      order_id,
      partner_application_id,
      destination_type,
      title
    ) values (
      result.customer_id,
      result.role,
      null,
      result.id,
      'application',
      case result.status
        when 'approved' then 'Partner application approved'
        when 'changes_required' then 'Changes requested for your application'
        when 'rejected' then 'Partner application update'
        else 'Partner application under review'
      end
    );
  end if;

  return result;
end
$$;
