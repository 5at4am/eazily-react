-- Customer notification read state.
-- Lets the customer notifications hub persist its "seen" baseline server-side so
-- unread badges stay consistent across devices. Read/write is limited to the
-- owning customer; the helper RPC writes atomically.

create table public.customer_notification_read_state (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.customer_notification_read_state enable row level security;
create policy "Own notification read state"
  on public.customer_notification_read_state for select
  using (customer_id = auth.uid());
create policy "Own notification read state write"
  on public.customer_notification_read_state for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
revoke all on public.customer_notification_read_state from anon, authenticated, public;
grant select, insert, update on public.customer_notification_read_state to authenticated;

create or replace function public.record_customer_notifications_seen(p_at timestamptz default now())
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.customer_notification_read_state(customer_id, last_seen_at)
  values(auth.uid(), coalesce(p_at, now()))
  on conflict(customer_id) do update set last_seen_at = excluded.last_seen_at;
end $$;
revoke all on function public.record_customer_notifications_seen(timestamptz) from public, anon, authenticated;
grant execute on function public.record_customer_notifications_seen(timestamptz) to authenticated;
