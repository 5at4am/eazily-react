-- One-off repair for the pending Service Partner listings created while pricing
-- was misconfigured. Publishes the newest usable listing per partner/service and
-- archives the older duplicates with an auditable reason.
begin;

update public.partner_posts
set status='published',review_notes=null,updated_at=now()
where id in (
  '82ec89db-6bda-456a-a4f2-5a6bb0739b1a', -- Mobile Repair, newest
  '2ed26e80-7c1b-4371-8e18-ea2c7c919d4d', -- Washing Machine Repair, original
  '2f3b707c-e6d8-4e44-8cac-8a40fddf5b19'  -- AC Service
)
and status='pending_review';

insert into public.service_post_approval_decisions(post_id,decision,reason)
values
  ('82ec89db-6bda-456a-a4f2-5a6bb0739b1a','admin_published','Activation repair: newest Mobile Repair listing for this partner published after customer pricing was restored'),
  ('2ed26e80-7c1b-4371-8e18-ea2c7c919d4d','admin_published','Activation repair: original Washing Machine Repair listing published after customer pricing was restored'),
  ('2f3b707c-e6d8-4e44-8cac-8a40fddf5b19','admin_published','Activation repair: AC Service listing published after customer pricing was restored');

insert into public.partner_audit_log(actor_id,action,entity_type,entity_id,after_data)
select null,'activate_listing','partner_post',p.id,to_jsonb(p)
from public.partner_posts p
where p.id in (
  '82ec89db-6bda-456a-a4f2-5a6bb0739b1a',
  '2ed26e80-7c1b-4371-8e18-ea2c7c919d4d',
  '2f3b707c-e6d8-4e44-8cac-8a40fddf5b19'
);

update public.partner_posts
set status='archived',
    review_notes='Duplicate archived: the newer listing for this service is live',
    updated_at=now()
where id in (
  'a6293f4a-9110-4a97-9987-fc34954455b3', -- Mobile Repair duplicate
  '284da307-f1c8-467a-a261-55d46236bb72', -- Mobile Repair duplicate
  '24ca2cbb-5482-4098-ae47-4e842105271c', -- Mobile Repair duplicate
  '2f5a0c49-2b5d-4189-b109-88ffa9424e3c'  -- Copy of Washing Machine Repair
)
and status='pending_review';

insert into public.service_post_approval_decisions(post_id,decision,reason)
values
  ('a6293f4a-9110-4a97-9987-fc34954455b3','admin_hidden','Duplicate archived: the newer Mobile Repair listing for this partner is live'),
  ('284da307-f1c8-467a-a261-55d46236bb72','admin_hidden','Duplicate archived: the newer Mobile Repair listing for this partner is live'),
  ('24ca2cbb-5482-4098-ae47-4e842105271c','admin_hidden','Duplicate archived: the newer Mobile Repair listing for this partner is live'),
  ('2f5a0c49-2b5d-4189-b109-88ffa9424e3c','admin_hidden','Duplicate archived: the original Washing Machine Repair listing for this partner is live');

insert into public.partner_audit_log(actor_id,action,entity_type,entity_id,after_data)
select null,'archive_duplicate_listing','partner_post',p.id,to_jsonb(p)
from public.partner_posts p
where p.id in (
  'a6293f4a-9110-4a97-9987-fc34954455b3',
  '284da307-f1c8-467a-a261-55d46236bb72',
  '24ca2cbb-5482-4098-ae47-4e842105271c',
  '2f5a0c49-2b5d-4189-b109-88ffa9424e3c'
);

commit;
