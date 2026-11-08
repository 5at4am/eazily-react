-- Consultant assessment admin review.
-- Apply after consultant_assessments.sql and operations.sql (admin_audit_events).
-- Provides the read-only review list and audited approval RPC used by the admin
-- console (eazily-web) Assessments workspace. Approval records the reviewer and
-- keeps the bank inactive; activation remains a separate decision.

create or replace function public.admin_list_consultant_assessment_reviews()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id,
      'version', b.version,
      'category', b.category,
      'specialisation', b.specialisation,
      'fieldId', b.field_id,
      'createdAt', b.created_at,
      'questions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', q.id,
          'code', q.question_code,
          'difficulty', q.difficulty,
          'promptEn', q.prompt_en,
          'promptHi', q.prompt_hi,
          'explanationEn', q.explanation_en,
          'explanationHi', q.explanation_hi,
          'correctOptionId', q.correct_option_id,
          'options', q.options
        ) order by q.question_code)
        from public.consultant_assessment_questions q where q.bank_id = b.id
      ), '[]'::jsonb)
    ) order by b.created_at)
    from public.consultant_assessment_banks b
    where not b.approved
  ), '[]'::jsonb)
$$;

create or replace function public.admin_approve_consultant_assessment_bank(p_bank uuid, p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  b public.consultant_assessment_banks;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.is_admin() or public.has_staff_permission('partner.approve')) then
    raise exception 'Permission denied';
  end if;
  if length(trim(p_reason)) < 10 then raise exception 'Review notes must be at least 10 characters'; end if;
  select * into b from public.consultant_assessment_banks where id = p_bank;
  if b.id is null then raise exception 'Assessment bank not found'; end if;
  if b.approved then raise exception 'Assessment bank is already approved'; end if;
  if not exists(select 1 from public.consultant_assessment_questions q where q.bank_id = b.id) then
    raise exception 'Assessment bank has no questions';
  end if;
  update public.consultant_assessment_banks
     set approved = true, reviewed_by = auth.uid(), reviewed_at = now()
   where id = b.id;
  update public.consultant_assessment_questions set approved = true where bank_id = b.id;
  insert into public.admin_audit_events(actor_id, action, entity_type, entity_id, reason, after_data)
  values(auth.uid(), 'admin_approve_consultant_assessment_bank', 'consultant_assessment_banks', b.id::text,
         left(trim(p_reason), 1000),
         jsonb_build_object('approved', true, 'bankActive', false, 'version', b.version,
                            'category', b.category, 'specialisation', b.specialisation));
end $$;

revoke all on function public.admin_list_consultant_assessment_reviews() from public, anon, authenticated;
revoke all on function public.admin_approve_consultant_assessment_bank(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_list_consultant_assessment_reviews() to authenticated;
grant execute on function public.admin_approve_consultant_assessment_bank(uuid, text) to authenticated;
