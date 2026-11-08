-- Migration 51. Keep unpaid collaborations out of the acceptance workflow.
begin;

alter table public.partner_orders
  drop constraint if exists partner_orders_status_check;
alter table public.partner_orders
  add constraint partner_orders_status_check
  check (status in ('requested','accepted','active','awaiting_acceptance','pending_payment','completed','cancelled','disputed'));

alter table public.cashfree_collaborations
  add column payment_session_id text;

-- Only one live order per customer/post. A cancelled or completed collaboration
-- does not block a future purchase; failed payment attempts retain their order
-- and provider idempotency key for safe retry.
create unique index one_live_influencer_collaboration_checkout
  on public.partner_orders(customer_id, (details ->> 'collaborationPostId'))
  where role = 'influencer'
    and status in ('pending_payment','awaiting_acceptance','accepted','active');

commit;
