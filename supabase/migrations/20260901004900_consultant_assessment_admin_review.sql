-- Staff-only review of consultant assessment content. Candidate results remain
-- server-graded and are not changed by this workflow.

create or replace function public.admin_list_consultant_assessment_reviews()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not (is_admin() or has_staff_permission('partner.approve')) then
    raise exception 'Partner approval permission required';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',b.id,
      'fieldId',b.field_id,
      'category',b.category,
      'specialisation',b.specialisation,
      'version',b.version,
      'active',b.active,
      'createdAt',b.created_at,
      'questions',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',q.id,
          'code',q.question_code,
          'difficulty',q.difficulty,
          'promptEn',q.prompt_en,
          'promptHi',q.prompt_hi,
          'options',q.options,
          'correctOptionId',q.correct_option_id,
          'explanationEn',q.explanation_en,
          'explanationHi',q.explanation_hi,
          'approved',q.approved
        ) order by case q.difficulty when 'foundation' then 1 when 'standard' then 2 else 3 end,q.question_code)
        from public.consultant_assessment_questions q where q.bank_id=b.id
      ),'[]'::jsonb)
    ) order by b.created_at,b.id
  ),'[]'::jsonb)
  into result
  from public.consultant_assessment_banks b
  where not b.approved;

  return result;
end
$$;

create or replace function public.admin_approve_consultant_assessment_bank(
  p_bank uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  bank public.consultant_assessment_banks;
  question_total integer;
  foundation_total integer;
  standard_total integer;
  advanced_total integer;
  invalid_total integer;
  clean_reason text:=trim(coalesce(p_reason,''));
begin
  if not (is_admin() or has_staff_permission('partner.approve')) then
    raise exception 'Partner approval permission required';
  end if;
  if length(clean_reason)<10 then
    raise exception 'Add a review reason of at least 10 characters';
  end if;

  select * into bank
  from public.consultant_assessment_banks
  where id=p_bank
  for update;
  if bank.id is null then raise exception 'Assessment bank not found'; end if;
  if bank.approved then raise exception 'Assessment bank is already approved'; end if;

  select count(*),
    count(*) filter(where difficulty='foundation'),
    count(*) filter(where difficulty='standard'),
    count(*) filter(where difficulty='advanced'),
    count(*) filter(where
      length(trim(prompt_en))=0 or length(trim(prompt_hi))=0
      or length(trim(explanation_en))=0 or length(trim(explanation_hi))=0
      or not exists(
        select 1 from jsonb_array_elements(options) as choice(value)
        where length(trim(coalesce(choice.value->>'label_en','')))=0
          or length(trim(coalesce(choice.value->>'label_hi','')))=0
      )
      or not exists(select 1 from jsonb_array_elements(options) as choice(value) where choice.value->>'id'=correct_option_id)
    )
  into question_total,foundation_total,standard_total,advanced_total,invalid_total
  from public.consultant_assessment_questions
  where bank_id=bank.id;

  if question_total<>6 or foundation_total<2 or standard_total<3 or advanced_total<1 or invalid_total>0 then
    raise exception 'Assessment bank must have six complete bilingual questions with at least 2 foundation, 3 standard, and 1 advanced question';
  end if;

  update public.consultant_assessment_questions
  set approved=true
  where bank_id=bank.id;

  update public.consultant_assessment_banks
  set approved=true,active=false,reviewed_by=auth.uid(),reviewed_at=clock_timestamp()
  where id=bank.id
  returning * into bank;

  update public.operational_review_tasks
  set status='resolved',assigned_to=auth.uid(),resolution_note=left(clean_reason,1000),updated_at=clock_timestamp()
  where related_entity_type='consultant_assessment_banks'
    and related_entity_id=bank.id::text
    and status in('pending','in_review');

  insert into public.admin_audit_events(actor_id,action,entity_type,entity_id,reason,before_data,after_data)
  values(
    auth.uid(),
    'consultant_assessment_bank_approved',
    'consultant_assessment_banks',
    bank.id::text,
    left(clean_reason,1000),
    jsonb_build_object('approved',false,'active',false),
    jsonb_build_object('approved',true,'active',bank.active,'reviewedAt',bank.reviewed_at,'questionCount',question_total)
  );

  return jsonb_build_object('id',bank.id,'approved',bank.approved,'active',bank.active,'reviewedAt',bank.reviewed_at);
end
$$;

revoke all on function public.admin_list_consultant_assessment_reviews() from public,anon,authenticated;
revoke all on function public.admin_approve_consultant_assessment_bank(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_list_consultant_assessment_reviews() to authenticated;
grant execute on function public.admin_approve_consultant_assessment_bank(uuid,text) to authenticated;

notify pgrst,'reload schema';
