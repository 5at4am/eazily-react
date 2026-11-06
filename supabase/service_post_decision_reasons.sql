-- Keep request-for-changes distinct from rejection in the Admin audit trail.
alter table public.service_post_approval_decisions
  drop constraint if exists service_post_approval_decisions_decision_check;
alter table public.service_post_approval_decisions
  add constraint service_post_approval_decisions_decision_check
  check (decision in ('review_required','auto_published','admin_published','admin_changes_requested','admin_rejected','admin_hidden','admin_override'));

create or replace function public.admin_review_post(p_id uuid,p_status text,p_notes text default null)
returns public.partner_posts language plpgsql security definer set search_path=public,eazily_private,pg_temp as $$
declare post public.partner_posts; result public.partner_posts; decision text;
begin
  if not (is_admin() or has_staff_permission('post.moderate')) then raise exception 'Admin access required'; end if;
  select * into post from public.partner_posts where id=p_id for update;
  if post.id is null then raise exception 'Post not found'; end if;
  if post.role<>'professional' then return public.admin_review_post_legacy(p_id,p_status,p_notes); end if;
  if p_status not in ('published','rejected','changes_required','paused') then raise exception 'Invalid post status'; end if;
  if length(trim(coalesce(p_notes,'')))<3 then raise exception 'Record a reason for this decision'; end if;
  if p_status='published' and post.status not in ('pending_review','paused','rejected','changes_required') then raise exception 'Post is not awaiting approval or hidden'; end if;
  if p_status='paused' and post.status<>'published' then raise exception 'Only a live post can be hidden'; end if;
  update public.partner_posts set status=p_status,
    review_notes=case when p_status='paused' then 'Admin hidden: '||p_notes else p_notes end,
    updated_at=now()
    where id=p_id returning * into result;
  decision:=case
    when p_status='published' and post.status<>'pending_review' then 'admin_override'
    when p_status='published' then 'admin_published'
    when p_status='paused' then 'admin_hidden'
    when p_status='changes_required' then 'admin_changes_requested'
    else 'admin_rejected' end;
  insert into public.service_post_approval_decisions(post_id,decision,reason,decided_by)
    values(p_id,decision,p_notes,auth.uid());
  insert into public.partner_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'review_post','partner_post',p_id::text,to_jsonb(post),to_jsonb(result));
  return result;
end $$;
revoke all on function public.admin_review_post(uuid,text,text) from public,anon;
grant execute on function public.admin_review_post(uuid,text,text) to authenticated;
