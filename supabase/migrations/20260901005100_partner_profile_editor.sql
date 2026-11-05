create or replace function public.update_partner_profile(p_role text, p_profile jsonb)
returns public.partner_applications
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  result public.partner_applications;
  allowed jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to edit your profile'; end if;
  if p_role is null or p_role not in ('professional', 'influencer', 'consultant') then raise exception 'Invalid partner role'; end if;
  if p_profile is null or jsonb_typeof(p_profile) is distinct from 'object' then raise exception 'Invalid profile details'; end if;

  allowed := case p_role
    when 'professional' then jsonb_build_object(
      'businessName', nullif(trim(p_profile->>'businessName'), ''),
      'name', nullif(trim(p_profile->>'name'), ''),
      'city', nullif(trim(p_profile->>'city'), ''),
      'bio', nullif(trim(p_profile->>'bio'), '')
    )
    when 'influencer' then jsonb_build_object(
      'creatorName', nullif(trim(p_profile->>'creatorName'), ''),
      'city', nullif(trim(p_profile->>'city'), ''),
      'category', nullif(trim(p_profile->>'category'), ''),
      'bio', nullif(trim(p_profile->>'bio'), '')
    )
    else jsonb_build_object(
      'name', nullif(trim(p_profile->>'name'), ''),
      'city', nullif(trim(p_profile->>'city'), ''),
      'specialisation', nullif(trim(p_profile->>'specialisation'), ''),
      'bio', nullif(trim(p_profile->>'bio'), '')
    )
  end;

  if exists (select 1 from jsonb_each_text(allowed) e where length(e.value) > 2000) then
    raise exception 'Profile fields must be 2,000 characters or fewer';
  end if;

  update public.partner_applications
  set details = details || allowed, updated_at = now()
  where customer_id = auth.uid() and role = p_role
    and status in ('approved', 'submitted', 'under_review', 'draft', 'changes_required')
  returning * into result;
  if result.id is null then raise exception 'Partner profile not found'; end if;
  return result;
end;
$$;

revoke all on function public.update_partner_profile(text, jsonb) from public, anon;
grant execute on function public.update_partner_profile(text, jsonb) to authenticated;
