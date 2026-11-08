-- Cashfree one-month subscription checkout. Membership is activated only by the
-- signed provider webhook; requests and checkout sessions alone grant nothing.
alter table public.seller_subscription_requests
  add column if not exists provider_order_reference text,
  add column if not exists provider_payment_reference text,
  add column if not exists paid_at timestamptz;

create unique index if not exists seller_subscription_provider_payment_unique
  on public.seller_subscription_requests(provider_payment_reference)
  where provider_payment_reference is not null;

create table if not exists eazily_private.seller_subscription_checkouts (
  request_id uuid primary key references public.seller_subscription_requests(id) on delete cascade,
  provider_order_reference text not null unique,
  payment_session_id text not null,
  checkout_mode text not null check(checkout_mode in ('sandbox','production')),
  created_at timestamptz not null default now()
);
revoke all on eazily_private.seller_subscription_checkouts from public,anon,authenticated;

create or replace function public.request_seller_subscription(p_partner uuid,p_plan text,p_key uuid)
returns public.seller_subscription_requests
language plpgsql security definer set search_path=public,pg_temp as $$
declare cfg public.seller_subscription_config; plan public.seller_plans; result public.seller_subscription_requests;
  timeline public.seller_subscriptions; amount bigint;
begin
  if auth.uid() is null or not exists(select 1 from public.partner_applications where id=p_partner and customer_id=auth.uid() and status='approved') then
    raise exception 'Approved workspace access required';
  end if;
  select * into timeline from public.seller_subscriptions where partner_id=p_partner for update;
  if timeline.partner_id is null then raise exception 'Subscription timeline is unavailable'; end if;
  select * into cfg from public.seller_subscription_config where id=true;
  if not cfg.rollout_enabled or not cfg.payment_checkout_enabled then raise exception 'Official subscription checkout is not enabled'; end if;
  if timeline.approval_date_missing then raise exception 'Approval date requires admin resolution before subscription purchase'; end if;
  select * into plan from public.seller_plans where id=p_plan and enabled;
  if plan.id is null then raise exception 'Plan is unavailable'; end if;
  select * into result from public.seller_subscription_requests where idempotency_key=p_key;
  if result.id is not null then
    if result.partner_id<>p_partner or result.plan_id<>p_plan then raise exception 'Request reference does not match'; end if;
    return result;
  end if;
  if exists(select 1 from public.seller_subscription_requests where partner_id=p_partner and status in ('requested','pending')) then
    raise exception 'A subscription payment is already in progress';
  end if;
  amount:=case when now()<timeline.founder_ends_at then plan.founder_paise else plan.standard_paise end;
  insert into public.seller_subscription_requests(partner_id,plan_id,price_paise,idempotency_key)
    values(p_partner,p_plan,amount,p_key) returning * into result;
  return result;
end $$;

create or replace function public.prepare_seller_subscription_gateway(p_request uuid,p_customer uuid)
returns jsonb language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
declare r public.seller_subscription_requests; app public.partner_applications; cfg public.seller_subscription_config;
  plan public.seller_plans;
begin
  if auth.uid() is distinct from p_customer and coalesce(auth.role(),'')<>'service_role' then raise exception 'Authenticated customer mismatch'; end if;
  select * into r from public.seller_subscription_requests where id=p_request for update;
  select * into app from public.partner_applications where id=r.partner_id and customer_id=p_customer and status='approved';
  if r.id is null or app.id is null then raise exception 'Subscription request access required'; end if;
  select * into cfg from public.seller_subscription_config where id=true;
  if not cfg.rollout_enabled or not cfg.payment_checkout_enabled then raise exception 'Official subscription checkout is not enabled'; end if;
  if r.status not in ('requested','pending') then raise exception 'Subscription payment request is no longer payable'; end if;
  select * into plan from public.seller_plans where id=r.plan_id;
  if plan.id is null then raise exception 'Subscription plan is unavailable'; end if;
  update public.seller_subscription_requests set status='pending' where id=r.id and status='requested';
  return jsonb_build_object('requestId',r.id,'partnerId',r.partner_id,'planId',r.plan_id,'planName',plan.name,
    'amountPaise',r.price_paise,'currency','INR','customerId',p_customer);
end $$;

create or replace function public.get_seller_subscription_checkout(p_request uuid)
returns jsonb language sql security definer set search_path=public,eazily_private,pg_temp as $$
  select jsonb_build_object('requestId',request_id,'providerOrderReference',provider_order_reference,
    'paymentSessionId',payment_session_id,'mode',checkout_mode)
  from eazily_private.seller_subscription_checkouts where request_id=p_request
$$;

create or replace function public.store_seller_subscription_checkout(p_request uuid,p_order text,p_session text,p_mode text)
returns jsonb language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
declare result jsonb;
begin
  if p_order !~ '^eazs_[a-f0-9]{32}$' or length(p_session) not between 1 and 4096 or p_mode not in ('sandbox','production') then
    raise exception 'Invalid provider checkout data';
  end if;
  insert into eazily_private.seller_subscription_checkouts(request_id,provider_order_reference,payment_session_id,checkout_mode)
    select p_request,p_order,p_session,p_mode where exists(select 1 from public.seller_subscription_requests where id=p_request and status='pending')
    on conflict(request_id) do nothing;
  select jsonb_build_object('requestId',request_id,'providerOrderReference',provider_order_reference,
    'paymentSessionId',payment_session_id,'mode',checkout_mode) into result
    from eazily_private.seller_subscription_checkouts where request_id=p_request and provider_order_reference=p_order;
  if result is null then raise exception 'Checkout reference mismatch or request is not pending'; end if;
  update public.seller_subscription_requests set provider_order_reference=p_order where id=p_request;
  return result;
end $$;

create or replace function public.record_verified_seller_subscription_payment(
  p_request uuid,p_order text,p_event text,p_amount bigint,p_currency text)
returns void language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
declare r public.seller_subscription_requests; s public.seller_subscriptions;
begin
  select * into r from public.seller_subscription_requests where id=p_request for update;
  if r.id is null or r.provider_order_reference is distinct from p_order or
     not exists(select 1 from eazily_private.seller_subscription_checkouts where request_id=p_request and provider_order_reference=p_order) then
    raise exception 'Subscription payment reference mismatch';
  end if;
  if r.status='paid' and r.provider_payment_reference=p_event then return; end if;
  if r.status not in ('pending','failed') or p_currency<>'INR' or p_amount<>r.price_paise or
     p_event is null or length(p_event)>200 then raise exception 'Subscription payment amount or state mismatch'; end if;
  select * into s from public.seller_subscriptions where partner_id=r.partner_id for update;
  if s.partner_id is null or s.approval_date_missing then raise exception 'Approved subscription timeline is unavailable'; end if;
  update public.seller_subscription_requests set status='paid',provider_payment_reference=p_event,paid_at=coalesce(paid_at,now()) where id=p_request;
  update public.seller_subscriptions set plan_id=r.plan_id,status='active',
    current_period_end=greatest(coalesce(current_period_end,case when trial_ends_at>now() then trial_ends_at else now() end),now())+interval '1 month',
    provider_reference=p_event,cancel_at_period_end=false,updated_at=now()
    where partner_id=r.partner_id;
  insert into public.partner_audit_log(actor_id,action,entity_type,entity_id,after_data)
    values(null,'subscription_payment_confirmed','seller_subscription',r.partner_id::text,
      jsonb_build_object('requestId',r.id,'planId',r.plan_id,'amountPaise',r.price_paise,'providerReference',p_event));
end $$;

create or replace function public.fail_seller_subscription_payment(p_request uuid,p_order text)
returns void language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
begin
  update public.seller_subscription_requests set status='failed'
  where id=p_request and provider_order_reference=p_order and status='pending'
    and exists(select 1 from eazily_private.seller_subscription_checkouts where request_id=p_request and provider_order_reference=p_order);
end $$;

revoke all on function public.prepare_seller_subscription_gateway(uuid,uuid),public.get_seller_subscription_checkout(uuid),
  public.store_seller_subscription_checkout(uuid,text,text,text),public.record_verified_seller_subscription_payment(uuid,text,text,bigint,text),
  public.fail_seller_subscription_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_seller_subscription_gateway(uuid,uuid),public.get_seller_subscription_checkout(uuid),
  public.store_seller_subscription_checkout(uuid,text,text,text),public.record_verified_seller_subscription_payment(uuid,text,text,bigint,text),
  public.fail_seller_subscription_payment(uuid,text) to service_role;
grant execute on function public.request_seller_subscription(uuid,text,uuid) to authenticated;
