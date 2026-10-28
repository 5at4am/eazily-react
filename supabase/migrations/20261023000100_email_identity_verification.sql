-- Replace mobile verification with managed Auth email confirmation.
-- Preserve existing applications, phone contact data, roles, consent and review rules.
begin;

create or replace function public.require_confirmed_service_partner_email(p_owner uuid,p_claimed_email text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare auth_email text; confirmed_at timestamptz;
begin
  if p_owner is null then raise exception 'Authentication required'; end if;
  -- Internal only: submission wrappers pass auth.uid(); review triggers pass
  -- the application's owner after checking the reviewer's permissions.
  select lower(nullif(btrim(u.email),'')),u.email_confirmed_at into auth_email,confirmed_at
    from auth.users u where u.id=p_owner;
  if auth_email is null or confirmed_at is null then
    raise exception 'Complete email verification before submitting';
  end if;
  if lower(nullif(btrim(p_claimed_email),'')) is distinct from auth_email then
    raise exception 'Verified email must match the confirmed account email';
  end if;
  return auth_email;
end $$;
revoke all on function public.require_confirmed_service_partner_email(uuid,text) from public,anon,authenticated;

-- Change only reviewed identity clauses inside the existing layered validators.
-- pg_get_functiondef keeps signatures, security mode and search paths intact.
do $$ declare item record; definition text; updated_definition text;
begin
  for item in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname <> 'require_confirmed_service_partner_phone'
      and (p.prosrc like '%verifiedPhone%' or p.prosrc like '%require_confirmed_service_partner_phone%')
  loop
    definition:=pg_get_functiondef(item.oid);
    if definition like '%sensitive_keys%' then
      updated_definition:=replace(definition,'''verifiedPhone''','''verifiedPhone'',''verifiedEmail''');
    else
      updated_definition:=replace(definition,'require_confirmed_service_partner_phone','require_confirmed_service_partner_email');
      updated_definition:=replace(updated_definition,'verifiedPhone','verifiedEmail');
      updated_definition:=replace(updated_definition,'verified_phone','verified_email');
      updated_definition:=replace(updated_definition,
        'select nullif(phone,'''') into verified_email from auth.users where id=auth.uid();',
        'select public.require_confirmed_service_partner_email(auth.uid(),p_details->>''verifiedEmail'') into verified_email;');
      updated_definition:=replace(updated_definition,'Complete mobile OTP verification before submitting','Complete email verification before submitting');
      updated_definition:=replace(updated_definition,'A verified mobile number is required','A verified email address is required');
      -- Store the canonical verified email as contact email as well.
      updated_definition:=replace(updated_definition,
        'submitted_details := jsonb_set(p_details,''{verifiedEmail}'',to_jsonb(verified_email),true);',
        'submitted_details := jsonb_set(jsonb_set(p_details - ''verifiedPhone'',''{verifiedEmail}'',to_jsonb(verified_email),true),''{email}'',to_jsonb(verified_email),true);');
    end if;
    if updated_definition is distinct from definition then execute updated_definition; end if;
  end loop;
end $$;

-- This helper has no remaining callers; never drop dependent business functions.
drop function public.require_confirmed_service_partner_phone(uuid,text);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles(id,full_name,phone,email,email_verified,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.phone,
    lower(nullif(btrim(new.email),'')),new.email_confirmed_at is not null and nullif(btrim(new.email),'') is not null,'customer')
  on conflict(id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

create or replace function public.ensure_my_profile() returns public.profiles
language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.profiles(id,full_name,phone,email,email_verified,role)
  select id,coalesce(raw_user_meta_data->>'full_name',''),phone,lower(nullif(btrim(email),'')),
    email_confirmed_at is not null and nullif(btrim(email),'') is not null,'customer'::public.user_role
  from auth.users where id=auth.uid() on conflict(id) do nothing;
  select * into result from public.profiles where id=auth.uid();
  if result.id is null then raise exception 'Authenticated identity unavailable'; end if;
  return result;
end $$;
revoke all on function public.ensure_my_profile() from public,anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- Derive profile verification exclusively from Auth, including client profile edits.
create or replace function public.guard_profile_email_identity() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  select lower(nullif(btrim(u.email),'')),u.email_confirmed_at is not null and nullif(btrim(u.email),'') is not null
    into new.email,new.email_verified from auth.users u where u.id=new.id;
  if not found then raise exception 'Authenticated identity unavailable'; end if;
  return new;
end $$;
revoke all on function public.guard_profile_email_identity() from public,anon,authenticated;
create trigger profiles_auth_email before insert or update on public.profiles
  for each row execute function public.guard_profile_email_identity();

create or replace function public.sync_auth_email_identity() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.profiles set email=lower(nullif(btrim(new.email),'')),
    email_verified=new.email_confirmed_at is not null and nullif(btrim(new.email),'') is not null
  where id=new.id and (email is distinct from lower(nullif(btrim(new.email),''))
    or email_verified is distinct from (new.email_confirmed_at is not null and nullif(btrim(new.email),'') is not null));
  return new;
end $$;
revoke all on function public.sync_auth_email_identity() from public,anon,authenticated;
create trigger auth_email_identity_sync after update of email,email_confirmed_at on auth.users
  for each row execute function public.sync_auth_email_identity();

update public.profiles p set email=lower(nullif(btrim(u.email),'')),
  email_verified=u.email_confirmed_at is not null and nullif(btrim(u.email),'') is not null
from auth.users u where p.id=u.id and (p.email is distinct from lower(nullif(btrim(u.email),''))
  or p.email_verified is distinct from (u.email_confirmed_at is not null and nullif(btrim(u.email),'') is not null));

-- Fail the migration if any callable registration path still demands a phone.
do $$ begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.prosrc like '%phone_confirmed_at%'
      or p.prosrc like '%Complete mobile OTP verification%' or p.prosrc like '%require_confirmed_service_partner_phone%')) then
    raise exception 'A mobile verification dependency remains';
  end if;
end $$;
notify pgrst,'reload schema';
commit;
