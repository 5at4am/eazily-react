-- Require at least one linked Influencer platform to report 5,000+ followers.
-- Other linked platforms may remain below the threshold. The check is based on
-- the submitted band, not a client-supplied numeric count.
alter function public.save_partner_application(text,jsonb,boolean)
  rename to save_partner_application_before_influencer_follower_threshold;

revoke all on function public.save_partner_application_before_influencer_follower_threshold(text,jsonb,boolean)
  from public, anon, authenticated;

create function public.save_partner_application(p_role text,p_details jsonb,p_submit boolean default false)
returns public.partner_applications
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_submit and p_role='influencer' then
    if jsonb_typeof(p_details->'platforms') is distinct from 'array' then
      raise exception 'Add at least one social platform';
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(p_details->'platforms') as platform(value)
      where nullif(trim(platform.value->>'url'),'') is not null
        and coalesce(platform.value->>'band','') in (
          '5K–under 20K',
          '20K–under 50K',
          '50K–under 100K',
          '100K–under 500K',
          '500K–under 1M',
          '1M+'
        )
    ) then
      raise exception 'Link at least one platform with 5,000 or more followers';
    end if;
  end if;

  return public.save_partner_application_before_influencer_follower_threshold(p_role,p_details,p_submit);
end $$;

revoke all on function public.save_partner_application(text,jsonb,boolean) from public,anon;
grant execute on function public.save_partner_application(text,jsonb,boolean) to authenticated;
