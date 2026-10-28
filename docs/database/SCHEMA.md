# Public schema reference

Metadata snapshot: 2026-10-11, development project `rujrweqttrqdmkkbamjt`. Contains table structure only, no customer records. Re-query after schema changes; this is not migration SQL. RLS policy counts do not prove every operation is authorised correctly. Managed Auth and Storage schemas and public views are outside this table inventory.

## admin_audit_events

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| actor_id | uuid | no | ? |
| action | text | no | ? |
| entity_type | text | no | ? |
| entity_id | text | yes | ? |
| reason | text | yes | ? |
| before_data | jsonb | yes | ? |
| after_data | jsonb | yes | ? |
| occurred_at | timestamp with time zone | no | now() |

Foreign keys:

- `admin_audit_events_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES profiles(id)`.

## app_configuration

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| support_phone | text | yes | ? |
| support_email | text | yes | ? |
| support_hours | text | yes | ? |
| public_app_link | text | yes | ? |
| company_intro | text | yes | ? |
| current_app_version | text | yes | ? |
| updated_at | timestamp with time zone | no | now() |

## automation_configuration

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| enabled | boolean | no | false |
| batch_size | integer | no | 25 |
| lease_seconds | integer | no | 120 |
| retry_base_seconds | integer | no | 60 |
| retry_max_seconds | integer | no | 21600 |
| default_max_attempts | integer | no | 6 |
| request_response_minutes | integer | no | 30 |
| payment_reconciliation_minutes | integer | no | 15 |
| operational_escalation_hours | integer | no | 24 |
| scheduler_expected_seconds | integer | no | 180 |
| realtime_retention_days | integer | no | 7 |
| booking_reminder_minutes | ARRAY | no | ARRAY[1440, 120] |
| consultation_reminder_minutes | ARRAY | no | ARRAY[1440, 60] |
| influencer_reminder_minutes | ARRAY | no | ARRAY[4320, 1440] |
| trial_reminder_days | ARRAY | no | ARRAY[7, 1] |
| subscription_reminder_days | ARRAY | no | ARRAY[7, 1] |
| notification_delivery_enabled | boolean | no | false |
| workbook_loan_enabled | boolean | no | false |
| workbook_logistics_enabled | boolean | no | false |
| payment_reconciliation_enabled | boolean | no | false |
| refund_submission_enabled | boolean | no | false |
| payout_submission_enabled | boolean | no | false |
| realtime_cleanup_enabled | boolean | no | true |
| updated_at | timestamp with time zone | no | clock_timestamp() |
| booking_attention_enabled | boolean | no | false |
| urgent_ticket_attention_enabled | boolean | no | false |

## automation_financial_cases

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| case_type | text | no | ? |
| related_entity_type | text | no | ? |
| related_entity_id | text | no | ? |
| safe_reason_code | text | no | ? |
| status | text | no | 'needs_review'::text |
| deduplication_key | text | no | ? |
| created_at | timestamp with time zone | no | clock_timestamp() |
| resolved_at | timestamp with time zone | yes | ? |

## automation_job_audit

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | bigint | no | ? |
| job_id | uuid | yes | ? |
| event_type | text | no | ? |
| worker_id | text | yes | ? |
| safe_code | text | yes | ? |
| safe_message | text | yes | ? |
| actor_id | uuid | yes | ? |
| occurred_at | timestamp with time zone | no | clock_timestamp() |

Foreign keys:

- `automation_job_audit_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES profiles(id)`.
- `automation_job_audit_job_id_fkey`: `FOREIGN KEY (job_id) REFERENCES background_jobs(id)`.

## automation_provider_events

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| provider_event_id | text | no | ? |
| event_kind | text | no | ? |
| related_entity_id | uuid | no | ? |
| amount_paise | bigint | no | ? |
| currency | text | no | ? |
| reference_digest | text | no | ? |
| verified_at | timestamp with time zone | no | clock_timestamp() |

## automation_worker_runs

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| worker_id | text | no | ? |
| started_at | timestamp with time zone | no | clock_timestamp() |
| finished_at | timestamp with time zone | yes | ? |
| claimed_count | integer | no | 0 |
| succeeded_count | integer | no | 0 |
| retry_count | integer | no | 0 |
| dead_letter_count | integer | no | 0 |
| status | text | no | 'running'::text |
| safe_error | text | yes | ? |

## background_jobs

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| job_type | text | no | ? |
| related_entity_type | text | no | ? |
| related_entity_id | text | no | ? |
| payload | jsonb | no | '{}'::jsonb |
| scheduled_at | timestamp with time zone | no | ? |
| status | text | no | 'pending'::text |
| attempt_count | integer | no | 0 |
| max_attempts | integer | no | ? |
| next_retry_at | timestamp with time zone | yes | ? |
| lock_owner | text | yes | ? |
| lock_expires_at | timestamp with time zone | yes | ? |
| deduplication_key | text | no | ? |
| entity_version | bigint | yes | ? |
| last_error_code | text | yes | ? |
| last_error_message | text | yes | ? |
| created_at | timestamp with time zone | no | clock_timestamp() |
| updated_at | timestamp with time zone | no | clock_timestamp() |
| started_at | timestamp with time zone | yes | ? |
| completed_at | timestamp with time zone | yes | ? |
| cancelled_at | timestamp with time zone | yes | ? |
| dead_lettered_at | timestamp with time zone | yes | ? |

## bulk_quote_requests

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| idempotency_key | uuid | no | ? |
| customer_type | text | no | ? |
| services | jsonb | no | ? |
| address | text | no | ? |
| preferred_date | date | no | ? |
| preferred_time | text | no | ? |
| company_name | text | yes | ? |
| status | text | no | 'requested'::text |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `bulk_quote_requests_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## business_expenses

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| expense_date | date | no | ? |
| category | text | no | ? |
| amount_paise | bigint | no | ? |
| currency | text | no | 'INR'::text |
| evidence_path | text | yes | ? |
| direct_cost | boolean | no | false |
| allocation_method | text | yes | ? |
| status | text | no | 'draft'::text |
| created_by | uuid | no | ? |
| approved_by | uuid | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `business_expenses_approved_by_fkey`: `FOREIGN KEY (approved_by) REFERENCES profiles(id)`.
- `business_expenses_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES profiles(id)`.

## cashfree_collaborations

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| order_id | uuid | no | ? |
| cashfree_order_id | text | yes | ? |
| payment_status | text | no | 'not_started'::text |
| customer_total | numeric | no | ? |
| partner_payout | numeric | no | ? |
| platform_fee | numeric | no | ? |
| initial_release | numeric | no | ? |
| security_hold | numeric | no | ? |
| scope_confirmed_at | timestamp with time zone | yes | ? |
| cashfree_vendor_id | text | yes | ? |
| initial_split_reference | text | yes | ? |
| hold_release_reference | text | yes | ? |
| raw_provider_state | jsonb | no | '{}'::jsonb |

Foreign keys:

- `cashfree_collaborations_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.

## categories

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| name | text | no | ? |
| slug | text | no | ? |
| icon | text | yes | ? |
| sort_order | integer | no | 0 |
| active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |

## chat_attachments

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| conversation_id | uuid | no | ? |
| owner_id | uuid | no | ? |
| storage_path | text | no | ? |
| original_name | text | no | ? |
| mime_type | text | no | ? |
| size_bytes | bigint | no | ? |
| status | text | no | 'ready'::text |
| operation_key | uuid | no | ? |
| created_at | timestamp with time zone | no | now() |
| message_id | uuid | yes | ? |

Foreign keys:

- `chat_attachments_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE`.
- `chat_attachments_message_id_fkey`: `FOREIGN KEY (message_id) REFERENCES seller_messages(id)`.
- `chat_attachments_owner_id_fkey`: `FOREIGN KEY (owner_id) REFERENCES profiles(id)`.

## chat_configuration

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| max_text_length | integer | no | 4000 |
| attachment_max_bytes | bigint | no | 10485760 |
| signed_url_seconds | integer | no | 300 |
| messages_per_minute | integer | no | 20 |
| retention_days | integer | yes | ? |
| abandoned_attachment_hours | integer | no | 24 |
| malware_scanning_enabled | boolean | no | false |
| updated_at | timestamp with time zone | no | now() |

## chat_conversations

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| conversation_type | text | no | ? |
| customer_id | uuid | no | ? |
| partner_account_id | uuid | no | ? |
| partner_role | text | no | ? |
| partner_application_id | uuid | yes | ? |
| provider_post_id | uuid | yes | ? |
| service_request_id | uuid | yes | ? |
| partner_order_id | uuid | yes | ? |
| status | text | no | 'active'::text |
| blocked_by | uuid | yes | ? |
| initiated_by | uuid | no | ? |
| idempotency_key | uuid | no | ? |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| last_message_at | timestamp with time zone | yes | ? |

Foreign keys:

- `chat_conversations_blocked_by_fkey`: `FOREIGN KEY (blocked_by) REFERENCES profiles(id)`.
- `chat_conversations_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `chat_conversations_initiated_by_fkey`: `FOREIGN KEY (initiated_by) REFERENCES profiles(id)`.
- `chat_conversations_partner_account_id_fkey`: `FOREIGN KEY (partner_account_id) REFERENCES profiles(id)`.
- `chat_conversations_partner_application_id_fkey`: `FOREIGN KEY (partner_application_id) REFERENCES partner_applications(id)`.
- `chat_conversations_partner_order_id_fkey`: `FOREIGN KEY (partner_order_id) REFERENCES partner_orders(id)`.
- `chat_conversations_provider_post_id_fkey`: `FOREIGN KEY (provider_post_id) REFERENCES partner_posts(id)`.
- `chat_conversations_service_request_id_fkey`: `FOREIGN KEY (service_request_id) REFERENCES service_requests(id)`.

## chat_participant_state

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| conversation_id | uuid | no | ? |
| account_id | uuid | no | ? |
| last_read_message_id | uuid | yes | ? |
| last_read_at | timestamp with time zone | yes | ? |
| archived | boolean | no | false |
| muted | boolean | no | false |
| last_activity_at | timestamp with time zone | no | now() |

Foreign keys:

- `chat_participant_state_account_id_fkey`: `FOREIGN KEY (account_id) REFERENCES profiles(id) ON DELETE CASCADE`.
- `chat_participant_state_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE`.

## chat_reports

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| conversation_id | uuid | no | ? |
| message_id | uuid | yes | ? |
| reporter_id | uuid | no | ? |
| reported_account_id | uuid | no | ? |
| reason | text | no | ? |
| details | text | yes | ? |
| status | text | no | 'pending'::text |
| created_at | timestamp with time zone | no | now() |
| reviewed_at | timestamp with time zone | yes | ? |

Foreign keys:

- `chat_reports_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)`.
- `chat_reports_message_id_fkey`: `FOREIGN KEY (message_id) REFERENCES seller_messages(id)`.
- `chat_reports_reported_account_id_fkey`: `FOREIGN KEY (reported_account_id) REFERENCES profiles(id)`.
- `chat_reports_reporter_id_fkey`: `FOREIGN KEY (reporter_id) REFERENCES profiles(id)`.

## chat_staff_access

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| conversation_id | uuid | no | ? |
| report_id | uuid | no | ? |
| staff_id | uuid | no | ? |
| reason | text | no | ? |
| granted_by | uuid | no | ? |
| granted_at | timestamp with time zone | no | now() |
| expires_at | timestamp with time zone | no | ? |
| active | boolean | no | true |

Foreign keys:

- `chat_staff_access_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)`.
- `chat_staff_access_granted_by_fkey`: `FOREIGN KEY (granted_by) REFERENCES profiles(id)`.
- `chat_staff_access_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES chat_reports(id)`.
- `chat_staff_access_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES profiles(id)`.

## chat_staff_audit

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | bigint | no | ? |
| staff_id | uuid | no | ? |
| conversation_id | uuid | no | ? |
| report_id | uuid | yes | ? |
| action | text | no | ? |
| reason | text | no | ? |
| occurred_at | timestamp with time zone | no | now() |

Foreign keys:

- `chat_staff_audit_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)`.
- `chat_staff_audit_report_id_fkey`: `FOREIGN KEY (report_id) REFERENCES chat_reports(id)`.
- `chat_staff_audit_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES profiles(id)`.

## consent_events

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| account_id | uuid | no | ? |
| partner_application_id | uuid | yes | ? |
| consent_type | text | no | ? |
| version | text | no | ? |
| accepted | boolean | no | ? |
| consent_text | text | no | ? |
| recorded_at | timestamp with time zone | no | now() |
| legal_document_id | uuid | yes | ? |

Foreign keys:

- `consent_events_account_id_fkey`: `FOREIGN KEY (account_id) REFERENCES profiles(id)`.
- `consent_events_legal_document_id_fkey`: `FOREIGN KEY (legal_document_id) REFERENCES legal_documents(id)`.
- `consent_events_partner_application_id_fkey`: `FOREIGN KEY (partner_application_id) REFERENCES partner_applications(id)`.

## consultant_assessment_attempts

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| application_id | uuid | no | ? |
| account_id | uuid | no | ? |
| field_id | text | no | ? |
| bank_id | uuid | no | ? |
| assessment_version | text | no | ? |
| question_order | ARRAY | no | ? |
| option_orders | jsonb | no | ? |
| responses | jsonb | no | '{}'::jsonb |
| status | text | no | 'in_progress'::text |
| correct_count | integer | yes | ? |
| started_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| submitted_at | timestamp with time zone | yes | ? |

Foreign keys:

- `consultant_assessment_attempts_account_id_fkey`: `FOREIGN KEY (account_id) REFERENCES profiles(id) ON DELETE CASCADE`.
- `consultant_assessment_attempts_application_id_fkey`: `FOREIGN KEY (application_id) REFERENCES partner_applications(id) ON DELETE CASCADE`.
- `consultant_assessment_attempts_bank_id_fkey`: `FOREIGN KEY (bank_id) REFERENCES consultant_assessment_banks(id)`.

## consultant_assessment_banks

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| field_id | text | no | ? |
| category | text | no | ? |
| specialisation | text | no | ? |
| version | text | no | ? |
| approved | boolean | no | false |
| active | boolean | no | false |
| reviewed_by | uuid | yes | ? |
| reviewed_at | timestamp with time zone | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `consultant_assessment_banks_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES profiles(id)`.

## consultant_assessment_questions

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| bank_id | uuid | no | ? |
| question_code | text | no | ? |
| difficulty | text | no | ? |
| prompt_en | text | no | ? |
| prompt_hi | text | no | ? |
| options | jsonb | no | ? |
| correct_option_id | text | no | ? |
| explanation_en | text | no | ? |
| explanation_hi | text | no | ? |
| approved | boolean | no | false |

Foreign keys:

- `consultant_assessment_questions_bank_id_fkey`: `FOREIGN KEY (bank_id) REFERENCES consultant_assessment_banks(id) ON DELETE CASCADE`.

## consultant_rates

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | yes | ? |
| category | text | no | ? |
| duration | integer | no | ? |
| price | numeric | no | ? |
| active | boolean | no | true |

Foreign keys:

- `consultant_rates_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.

## customer_addresses

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| label | text | no | ? |
| address | text | no | ? |
| address_line_2 | text | yes | ? |
| locality | text | yes | ? |
| city | text | yes | ? |
| pin_code | text | yes | ? |
| landmark | text | yes | ? |
| latitude | numeric | yes | ? |
| longitude | numeric | yes | ? |
| is_default | boolean | no | false |
| updated_at | timestamp with time zone | no | now() |

Foreign keys:

- `customer_addresses_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## customer_memberships

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| name | text | no | ? |
| status | text | no | ? |
| expires_at | timestamp with time zone | yes | ? |

Foreign keys:

- `customer_memberships_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## customer_notification_preferences

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| customer_id | uuid | no | ? |
| booking_updates | boolean | no | true |
| payment_notifications | boolean | no | true |
| promotions | boolean | no | false |
| consultation_reminders | boolean | no | true |
| updated_at | timestamp with time zone | no | now() |

Foreign keys:

- `customer_notification_preferences_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE`.

## customer_payment_methods

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| brand | text | no | ? |
| last_four | text | no | ? |

Foreign keys:

- `customer_payment_methods_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## customer_payments

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| booking_id | uuid | yes | ? |
| provider | text | no | ? |
| provider_reference | text | yes | ? |
| amount_paise | bigint | no | ? |
| currency | text | no | 'INR'::text |
| method_label | text | yes | ? |
| status | text | no | ? |
| paid_at | timestamp with time zone | yes | ? |
| created_at | timestamp with time zone | no | now() |
| raw_provider_state | jsonb | no | '{}'::jsonb |
| partner_order_id | uuid | yes | ? |
| seller_payment_request_id | uuid | yes | ? |
| refunded_paise | bigint | no | 0 |

Foreign keys:

- `customer_payments_booking_id_fkey`: `FOREIGN KEY (booking_id) REFERENCES service_requests(id)`.
- `customer_payments_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `customer_payments_partner_order_id_fkey`: `FOREIGN KEY (partner_order_id) REFERENCES partner_orders(id)`.
- `customer_payments_seller_payment_request_id_fkey`: `FOREIGN KEY (seller_payment_request_id) REFERENCES eazily_private.payment_requests(id)`.

## customer_refunds

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| payment_id | uuid | no | ? |
| customer_id | uuid | no | ? |
| requested_paise | bigint | no | ? |
| approved_paise | bigint | yes | ? |
| reason | text | no | ? |
| status | text | no | 'requested'::text |
| idempotency_key | uuid | no | ? |
| provider_reference | text | yes | ? |
| requested_at | timestamp with time zone | no | now() |
| processed_at | timestamp with time zone | yes | ? |

Foreign keys:

- `customer_refunds_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `customer_refunds_payment_id_fkey`: `FOREIGN KEY (payment_id) REFERENCES customer_payments(id)`.

## customer_support_requests

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| booking_id | uuid | yes | ? |
| message | text | no | ? |
| status | text | no | 'pending'::text |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `customer_support_requests_booking_id_fkey`: `FOREIGN KEY (booking_id) REFERENCES service_requests(id)`.
- `customer_support_requests_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## excel_lead_outbox

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| lead_id | uuid | no | ? |
| destination | text | no | ? |
| status | text | no | 'pending_configuration'::text |
| attempts | integer | no | 0 |
| next_attempt_at | timestamp with time zone | no | now() |
| last_error | text | yes | ? |
| synced_at | timestamp with time zone | yes | ? |
| lock_owner | text | yes | ? |
| lock_expires_at | timestamp with time zone | yes | ? |
| external_row_key | text | yes | ? |

Foreign keys:

- `excel_lead_outbox_lead_id_fkey`: `FOREIGN KEY (lead_id) REFERENCES service_requests(id)`.

## finance_entries

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| transaction_id | uuid | no | ? |
| account_code | text | no | ? |
| direction | text | no | ? |
| amount_paise | bigint | no | ? |
| category | text | yes | ? |
| subcategory | text | yes | ? |
| service | text | yes | ? |

Foreign keys:

- `finance_entries_transaction_id_fkey`: `FOREIGN KEY (transaction_id) REFERENCES finance_transactions(id)`.

## finance_transactions

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| source_type | text | no | ? |
| source_id | text | no | ? |
| idempotency_key | text | no | ? |
| currency | text | no | 'INR'::text |
| event_time | timestamp with time zone | no | ? |
| processing_time | timestamp with time zone | no | now() |
| recognition_date | date | yes | ? |
| status | text | no | ? |
| created_by | uuid | yes | ? |

Foreign keys:

- `finance_transactions_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES profiles(id)`.

## legal_documents

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| kind | text | no | ? |
| language | text | no | ? |
| version | text | no | ? |
| title | text | no | ? |
| content | text | no | ? |
| published | boolean | no | false |
| effective_at | timestamp with time zone | no | ? |
| document_key | text | yes | ? |
| last_updated_at | timestamp with time zone | yes | ? |
| consultant_complete | boolean | no | false |
| consultant_approved_by | uuid | yes | ? |
| consultant_approved_at | timestamp with time zone | yes | ? |
| consumer_complete | boolean | no | false |
| consumer_branding_approved | boolean | no | false |
| consumer_operator_verified | boolean | no | false |
| consumer_features_reviewed | boolean | no | false |
| consumer_operator_name | text | yes | ? |
| consumer_review_reference | text | yes | ? |
| consumer_approved_by | uuid | yes | ? |
| consumer_approved_at | timestamp with time zone | yes | ? |

Foreign keys:

- `legal_documents_consultant_approved_by_fkey`: `FOREIGN KEY (consultant_approved_by) REFERENCES profiles(id)`.
- `legal_documents_consumer_approved_by_fkey`: `FOREIGN KEY (consumer_approved_by) REFERENCES profiles(id)`.

## messages

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| request_id | uuid | no | ? |
| sender_id | uuid | no | ? |
| body | text | no | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `messages_request_id_fkey`: `FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE`.
- `messages_sender_id_fkey`: `FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE`.

## notification_outbox

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| recipient_account_id | uuid | no | ? |
| notification_type | text | no | ? |
| related_entity_type | text | no | ? |
| related_entity_id | text | no | ? |
| template_key | text | no | ? |
| language | text | no | 'English'::text |
| scheduled_at | timestamp with time zone | no | clock_timestamp() |
| deduplication_key | text | no | ? |
| channels | ARRAY | no | ARRAY['in_app'::text] |
| delivery_state | text | no | 'requested'::text |
| attempt_count | integer | no | 0 |
| last_error_code | text | yes | ? |
| created_at | timestamp with time zone | no | clock_timestamp() |
| updated_at | timestamp with time zone | no | clock_timestamp() |

Foreign keys:

- `notification_outbox_recipient_account_id_fkey`: `FOREIGN KEY (recipient_account_id) REFERENCES profiles(id)`.

## operational_review_tasks

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| task_type | text | no | ? |
| related_entity_type | text | no | ? |
| related_entity_id | text | no | ? |
| required_permission | text | no | ? |
| status | text | no | 'pending'::text |
| deduplication_key | text | no | ? |
| due_at | timestamp with time zone | yes | ? |
| escalation_at | timestamp with time zone | yes | ? |
| escalated_at | timestamp with time zone | yes | ? |
| assigned_to | uuid | yes | ? |
| resolution_note | text | yes | ? |
| created_at | timestamp with time zone | no | clock_timestamp() |
| updated_at | timestamp with time zone | no | clock_timestamp() |
| acknowledged_by | uuid | yes | ? |
| acknowledged_at | timestamp with time zone | yes | ? |
| acknowledgement_reason | text | yes | ? |
| resolved_by | uuid | yes | ? |
| resolved_at | timestamp with time zone | yes | ? |

Foreign keys:

- `operational_review_tasks_acknowledged_by_fkey`: `FOREIGN KEY (acknowledged_by) REFERENCES profiles(id)`.
- `operational_review_tasks_assigned_to_fkey`: `FOREIGN KEY (assigned_to) REFERENCES profiles(id)`.
- `operational_review_tasks_resolved_by_fkey`: `FOREIGN KEY (resolved_by) REFERENCES profiles(id)`.

## partner_applications

RLS: **enabled**. Policies: 4.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| role | text | no | ? |
| status | text | no | 'draft'::text |
| details | jsonb | no | '{}'::jsonb |
| review_notes | text | yes | ? |
| submitted_at | timestamp with time zone | yes | ? |
| reviewed_at | timestamp with time zone | yes | ? |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Foreign keys:

- `partner_applications_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE`.

## partner_audit_log

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | bigint | no | ? |
| actor_id | uuid | yes | ? |
| action | text | no | ? |
| entity_type | text | no | ? |
| entity_id | text | no | ? |
| before_data | jsonb | yes | ? |
| after_data | jsonb | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `partner_audit_log_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES profiles(id)`.

## partner_availability

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| partner_id | uuid | no | ? |
| online | boolean | no | false |
| confirmed_at | timestamp with time zone | yes | ? |
| available_until | timestamp with time zone | yes | ? |
| updated_at | timestamp with time zone | no | now() |
| automation_version | bigint | no | 1 |

Foreign keys:

- `partner_availability_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id) ON DELETE CASCADE`.

## partner_config

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| influencer_threshold | integer | no | 5000 |
| influencer_platform_fee_percent | numeric | no | 10 |
| influencer_initial_release_percent | numeric | no | 70 |
| influencer_review_window_hours | integer | no | 72 |
| availability_minutes | integer | no | 30 |
| free_intro_minutes | integer | no | 5 |
| cashfree_enabled | boolean | no | false |

## partner_dashboard_banners

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| role | text | no | ? |
| headline | text | no | ? |
| supporting_line | text | no | ? |
| image_url | text | yes | ? |
| image_alt | text | no | ? |
| action_label | text | no | ? |
| action_kind | text | no | ? |
| sponsored | boolean | no | false |
| starts_at | timestamp with time zone | no | ? |
| ends_at | timestamp with time zone | yes | ? |
| sort_order | integer | no | 0 |
| active | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

## partner_earnings

RLS: **enabled**. Policies: 4.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | no | ? |
| order_id | uuid | yes | ? |
| role | text | no | ? |
| state | text | no | ? |
| amount | numeric | no | ? |
| provider_reference | text | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `partner_earnings_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.
- `partner_earnings_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.

## partner_orders

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | no | ? |
| customer_id | uuid | no | ? |
| role | text | no | ? |
| title | text | no | ? |
| status | text | no | 'requested'::text |
| details | jsonb | no | '{}'::jsonb |
| deadline | timestamp with time zone | yes | ? |
| free_intro | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| post_id | uuid | yes | ? |
| request_key | uuid | yes | ? |
| automation_version | bigint | no | 1 |
| updated_at | timestamp with time zone | no | clock_timestamp() |
| backup_opt_in | boolean | no | false |
| match_mode | text | no | 'direct'::text |
| match_city | text | yes | ? |
| match_service | text | yes | ? |
| match_category | text | yes | ? |
| response_due_at | timestamp with time zone | yes | ? |
| backup_price_approval_pending | boolean | no | false |
| journey_status | text | yes | ? |
| source_request_id | uuid | yes | ? |

Foreign keys:

- `partner_orders_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `partner_orders_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.
- `partner_orders_post_id_fkey`: `FOREIGN KEY (post_id) REFERENCES partner_posts(id)`.
- `partner_orders_source_request_id_fkey`: `FOREIGN KEY (source_request_id) REFERENCES service_requests(id)`.

## partner_payouts

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | no | ? |
| order_id | uuid | yes | ? |
| installment | text | no | ? |
| amount_paise | bigint | no | ? |
| currency | text | no | 'INR'::text |
| due_at | timestamp with time zone | yes | ? |
| status | text | no | 'scheduled'::text |
| idempotency_key | text | no | ? |
| provider_reference | text | yes | ? |
| hold_reason | text | yes | ? |
| created_at | timestamp with time zone | no | now() |
| paid_at | timestamp with time zone | yes | ? |

Foreign keys:

- `partner_payouts_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.
- `partner_payouts_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.

## partner_posts

RLS: **enabled**. Policies: 4.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | no | ? |
| role | text | no | ? |
| status | text | no | 'draft'::text |
| details | jsonb | no | '{}'::jsonb |
| review_notes | text | yes | ? |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |

Foreign keys:

- `partner_posts_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id) ON DELETE CASCADE`.

## platform_ratings

RLS: **enabled**. Policies: 4.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| booking_id | uuid | yes | ? |
| score | integer | no | ? |
| review_text | text | yes | ? |
| city | text | yes | ? |
| category | text | yes | ? |
| moderation_status | text | no | 'included'::text |
| moderation_reason | text | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `platform_ratings_booking_id_fkey`: `FOREIGN KEY (booking_id) REFERENCES service_requests(id)`.
- `platform_ratings_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## profiles

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | ? |
| role | user_role | no | 'customer'::user_role |
| full_name | text | yes | ? |
| phone | text | yes | ? |
| city | text | yes | ? |
| avatar_url | text | yes | ? |
| created_at | timestamp with time zone | no | now() |
| email | text | yes | ? |
| email_verified | boolean | no | false |
| account_status | text | no | 'active'::text |

Foreign keys:

- `profiles_id_fkey`: `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`.

## realtime_events

RLS: **enabled**. Policies: 5.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | bigint | no | ? |
| audience_kind | text | no | ? |
| audience_key | text | no | ? |
| scope | text | no | ? |
| entity_type | text | no | ? |
| entity_id | text | no | ? |
| occurred_at | timestamp with time zone | no | clock_timestamp() |

## referral_codes

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| customer_id | uuid | no | ? |
| code | text | no | encode(gen_random_bytes(12), 'hex'::text) |

Foreign keys:

- `referral_codes_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## referral_config

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| enabled | boolean | no | false |
| reward_amount | numeric | no | 0 |
| minimum_payment | numeric | no | 1 |
| expiry_days | integer | yes | ? |
| redemption_percent | integer | no | 100 |
| reverse_on_refund | boolean | no | true |
| eligible_services | ARRAY | no | '{}'::text[] |

## referrals

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| referrer_id | uuid | no | ? |
| referred_id | uuid | no | ? |
| status | text | no | 'pending'::text |
| reward_amount | numeric | no | ? |
| qualifying_booking | uuid | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `referrals_qualifying_booking_fkey`: `FOREIGN KEY (qualifying_booking) REFERENCES service_requests(id)`.
- `referrals_referred_id_fkey`: `FOREIGN KEY (referred_id) REFERENCES profiles(id)`.
- `referrals_referrer_id_fkey`: `FOREIGN KEY (referrer_id) REFERENCES profiles(id)`.

## review_invitations

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| partner_order_id | uuid | yes | ? |
| service_request_id | uuid | yes | ? |
| status | text | no | 'available'::text |
| created_at | timestamp with time zone | no | clock_timestamp() |

Foreign keys:

- `review_invitations_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `review_invitations_partner_order_id_fkey`: `FOREIGN KEY (partner_order_id) REFERENCES partner_orders(id)`.
- `review_invitations_service_request_id_fkey`: `FOREIGN KEY (service_request_id) REFERENCES service_requests(id)`.

## reviews

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| vendor_id | uuid | no | ? |
| service_name | text | no | ? |
| booking_id | uuid | yes | ? |
| customer_display_name | text | no | ? |
| rating | integer | no | ? |
| review_text | text | no | ? |
| authorised_photos | ARRAY | no | '{}'::text[] |
| published | boolean | no | false |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `reviews_booking_id_fkey`: `FOREIGN KEY (booking_id) REFERENCES service_requests(id)`.
- `reviews_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `reviews_vendor_id_fkey`: `FOREIGN KEY (vendor_id) REFERENCES vendors(id)`.

## saved_partner_profiles

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| customer_id | uuid | no | ? |
| post_id | uuid | no | ? |

Foreign keys:

- `saved_partner_profiles_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE`.
- `saved_partner_profiles_post_id_fkey`: `FOREIGN KEY (post_id) REFERENCES partner_posts(id) ON DELETE CASCADE`.

## saved_vendors

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| customer_id | uuid | no | ? |
| vendor_id | uuid | no | ? |

Foreign keys:

- `saved_vendors_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE`.
- `saved_vendors_vendor_id_fkey`: `FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE`.

## seller_leads

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | no | ? |
| order_id | uuid | yes | ? |
| status | text | no | 'new'::text |
| notes | text | no | ''::text |
| follow_up_at | timestamp with time zone | yes | ? |
| close_reason | text | yes | ? |
| updated_at | timestamp with time zone | no | now() |

Foreign keys:

- `seller_leads_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.
- `seller_leads_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.

## seller_messages

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | yes | ? |
| sender_id | uuid | yes | ? |
| body | text | yes | ? |
| client_key | uuid | no | ? |
| read_at | timestamp with time zone | yes | ? |
| created_at | timestamp with time zone | no | now() |
| conversation_id | uuid | no | ? |
| message_type | text | no | 'text'::text |
| reply_to_id | uuid | yes | ? |
| attachment_id | uuid | yes | ? |
| accepted_at | timestamp with time zone | no | now() |
| moderation_status | text | no | 'visible'::text |

Foreign keys:

- `seller_messages_attachment_id_fkey`: `FOREIGN KEY (attachment_id) REFERENCES chat_attachments(id)`.
- `seller_messages_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)`.
- `seller_messages_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.
- `seller_messages_reply_to_id_fkey`: `FOREIGN KEY (reply_to_id) REFERENCES seller_messages(id)`.
- `seller_messages_sender_id_fkey`: `FOREIGN KEY (sender_id) REFERENCES profiles(id)`.

## seller_notifications

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| account_id | uuid | no | ? |
| role | text | no | ? |
| order_id | uuid | yes | ? |
| title | text | no | ? |
| read_at | timestamp with time zone | yes | ? |
| created_at | timestamp with time zone | no | now() |
| automation_key | text | yes | ? |

Foreign keys:

- `seller_notifications_account_id_fkey`: `FOREIGN KEY (account_id) REFERENCES profiles(id)`.
- `seller_notifications_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.

## seller_order_events

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | bigint | no | ? |
| order_id | uuid | no | ? |
| actor_id | uuid | yes | ? |
| kind | text | no | ? |
| notes | text | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `seller_order_events_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES profiles(id)`.
- `seller_order_events_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.

## seller_plans

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | text | no | ? |
| name | text | no | ? |
| standard_paise | bigint | no | ? |
| founder_paise | bigint | no | ? |
| monthly_leads | integer | no | ? |
| monthly_reels | integer | no | ? |
| benefits | jsonb | no | '[]'::jsonb |
| enabled | boolean | no | false |

## seller_pricing_rules

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| role | text | no | ? |
| version | integer | no | ? |
| enabled | boolean | no | false |
| lower_markup_bps | integer | no | 2500 |
| upper_markup_bps | integer | no | 1200 |
| below_100_bps | integer | yes | ? |
| consultant_share_bps | integer | no | 5000 |
| seller_tax_bps | integer | yes | ? |
| customer_tax_bps | integer | yes | ? |
| fee_tax_bps | integer | yes | ? |
| separate_fee_paise | bigint | yes | ? |
| include_visiting | boolean | yes | ? |
| include_additional | boolean | yes | ? |
| rounding | text | no | 'half_up'::text |

## seller_redemptions

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | no | ? |
| reward_id | uuid | no | ? |
| points | integer | no | ? |
| status | text | no | 'requested'::text |
| request_key | uuid | no | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `seller_redemptions_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.
- `seller_redemptions_reward_id_fkey`: `FOREIGN KEY (reward_id) REFERENCES seller_rewards_catalog(id)`.

## seller_reviews

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| order_id | uuid | no | ? |
| partner_id | uuid | no | ? |
| customer_id | uuid | no | ? |
| rating | integer | no | ? |
| body | text | no | ? |
| reply | text | yes | ? |
| published | boolean | no | false |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `seller_reviews_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `seller_reviews_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.
- `seller_reviews_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.

## seller_reward_config

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| enabled | boolean | no | false |
| points_per_100_rupees | integer | yes | ? |
| expiry_days | integer | yes | ? |

## seller_reward_ledger

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | bigint | no | ? |
| partner_id | uuid | no | ? |
| order_id | uuid | yes | ? |
| points | integer | no | ? |
| event_key | text | no | ? |
| expires_at | timestamp with time zone | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `seller_reward_ledger_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id)`.
- `seller_reward_ledger_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.

## seller_rewards_catalog

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| name | text | no | ? |
| category | text | no | ? |
| points | integer | no | ? |
| enabled | boolean | no | false |
| terms | text | no | ? |
| expires_at | timestamp with time zone | yes | ? |

## seller_subscription_config

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| enabled | boolean | no | false |
| trial_days | integer | no | 60 |
| launch_at | timestamp with time zone | yes | ? |
| founder_months | integer | no | 6 |
| restrict_new_bookings | boolean | no | false |
| payment_checkout_enabled | boolean | no | false |
| rollout_enabled | boolean | no | false |

## seller_subscription_requests

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| partner_id | uuid | no | ? |
| plan_id | text | no | ? |
| price_paise | bigint | no | ? |
| status | text | no | 'requested'::text |
| idempotency_key | uuid | no | ? |
| created_at | timestamp with time zone | no | now() |
| provider_payment_reference | text | yes | ? |
| paid_at | timestamp with time zone | yes | ? |

Foreign keys:

- `seller_subscription_requests_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.
- `seller_subscription_requests_plan_id_fkey`: `FOREIGN KEY (plan_id) REFERENCES seller_plans(id)`.

## seller_subscriptions

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| partner_id | uuid | no | ? |
| plan_id | text | yes | ? |
| trial_started_at | timestamp with time zone | no | ? |
| trial_ends_at | timestamp with time zone | no | ? |
| status | text | no | 'trial'::text |
| current_period_end | timestamp with time zone | yes | ? |
| provider_reference | text | yes | ? |
| updated_at | timestamp with time zone | no | now() |
| approval_started_at | timestamp with time zone | yes | ? |
| founder_ends_at | timestamp with time zone | yes | ? |
| approval_date_missing | boolean | no | false |
| cancel_at_period_end | boolean | no | false |
| automation_version | bigint | no | 1 |

Foreign keys:

- `seller_subscriptions_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.
- `seller_subscriptions_plan_id_fkey`: `FOREIGN KEY (plan_id) REFERENCES seller_plans(id)`.

## seller_training

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | text | no | ? |
| title | text | no | ? |
| content | text | no | ? |
| content_hi | text | no | ? |
| enabled | boolean | no | true |

## seller_training_progress

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| partner_id | uuid | no | ? |
| module_id | text | no | ? |
| completed_at | timestamp with time zone | no | now() |

Foreign keys:

- `seller_training_progress_module_id_fkey`: `FOREIGN KEY (module_id) REFERENCES seller_training(id)`.
- `seller_training_progress_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.

## service_booking_offers

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | bigint | no | ? |
| order_id | uuid | no | ? |
| partner_id | uuid | no | ? |
| post_id | uuid | no | ? |
| sequence | integer | no | ? |
| status | text | no | ? |
| offered_at | timestamp with time zone | no | clock_timestamp() |
| expires_at | timestamp with time zone | no | ? |
| responded_at | timestamp with time zone | yes | ? |

Foreign keys:

- `service_booking_offers_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES partner_orders(id) ON DELETE CASCADE`.
- `service_booking_offers_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.
- `service_booking_offers_post_id_fkey`: `FOREIGN KEY (post_id) REFERENCES partner_posts(id)`.

## service_document_verifications

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| partner_id | uuid | no | ? |
| verified_at | timestamp with time zone | no | ? |
| verified_by | uuid | no | ? |
| review_reference | text | no | ? |

Foreign keys:

- `service_document_verifications_partner_id_fkey`: `FOREIGN KEY (partner_id) REFERENCES partner_applications(id)`.
- `service_document_verifications_verified_by_fkey`: `FOREIGN KEY (verified_by) REFERENCES profiles(id)`.

## service_match_config

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| response_seconds | integer | no | 60 |
| max_offers | integer | no | 3 |

## service_policies

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| service_name | text | no | ? |
| fixed_price | boolean | no | false |
| faq | jsonb | no | '[]'::jsonb |
| updated_at | timestamp with time zone | no | now() |

## service_post_approval_config

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | boolean | no | true |
| auto_publish_enabled | boolean | no | false |
| min_description_length | integer | no | 12 |
| duplicate_window_days | integer | no | 90 |
| require_review_for_new_media | boolean | no | true |
| flagged_text_pattern | text | no | '(upi\|gpay\|phonepe\|paytm\|whatsapp\|wa[.]me\|scan.{0,15}pay)'::text |
| flagged_media_pattern | text | no | '(qr\|upi\|payment\|flagged)'::text |
| updated_at | timestamp with time zone | no | now() |

## service_post_approval_decisions

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| post_id | uuid | no | ? |
| revision_id | uuid | yes | ? |
| decision | text | no | ? |
| reason | text | no | ? |
| decided_by | uuid | yes | ? |
| decided_at | timestamp with time zone | no | clock_timestamp() |

Foreign keys:

- `service_post_approval_decisions_decided_by_fkey`: `FOREIGN KEY (decided_by) REFERENCES profiles(id)`.
- `service_post_approval_decisions_post_id_fkey`: `FOREIGN KEY (post_id) REFERENCES partner_posts(id) ON DELETE CASCADE`.
- `service_post_approval_decisions_revision_id_fkey`: `FOREIGN KEY (revision_id) REFERENCES service_post_revisions(id)`.

## service_post_revisions

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| post_id | uuid | no | ? |
| details | jsonb | no | ? |
| status | text | no | ? |
| submitted_by | uuid | no | ? |
| submitted_at | timestamp with time zone | yes | ? |
| reviewed_by | uuid | yes | ? |
| reviewed_at | timestamp with time zone | yes | ? |
| review_reason | text | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `service_post_revisions_post_id_fkey`: `FOREIGN KEY (post_id) REFERENCES partner_posts(id) ON DELETE CASCADE`.
- `service_post_revisions_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES profiles(id)`.
- `service_post_revisions_submitted_by_fkey`: `FOREIGN KEY (submitted_by) REFERENCES profiles(id)`.

## service_requests

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | yes | auth.uid() |
| category_id | text | yes | ? |
| service_name | text | no | ? |
| request_type | text | no | ? |
| details | jsonb | no | '{}'::jsonb |
| status | request_status | no | 'pending'::request_status |
| assigned_vendor_id | uuid | yes | ? |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| paid_amount | numeric | no | 0 |
| payment_status | text | no | 'unpaid'::text |
| wallet_used | numeric | no | 0 |
| quoted_total | numeric | yes | ? |
| idempotency_key | uuid | yes | ? |
| automation_version | bigint | no | 1 |

Foreign keys:

- `service_requests_assigned_vendor_id_fkey`: `FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL`.
- `service_requests_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE SET NULL`.

## services

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| category_id | uuid | no | ? |
| name | text | no | ? |
| slug | text | no | ? |
| active | boolean | no | true |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `services_category_id_fkey`: `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE`.

## staff_access

RLS: **enabled**. Policies: 3.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| account_id | uuid | no | ? |
| staff_role | text | no | ? |
| permissions | ARRAY | no | '{}'::text[] |
| city_scope | ARRAY | no | '{}'::text[] |
| category_scope | ARRAY | no | '{}'::text[] |
| active | boolean | no | true |
| department | text | yes | ? |
| manager_id | uuid | yes | ? |
| revoked_at | timestamp with time zone | yes | ? |
| updated_at | timestamp with time zone | no | now() |

Foreign keys:

- `staff_access_account_id_fkey`: `FOREIGN KEY (account_id) REFERENCES profiles(id)`.
- `staff_access_manager_id_fkey`: `FOREIGN KEY (manager_id) REFERENCES profiles(id)`.

## support_ticket_replies

RLS: **enabled**. Policies: 4.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| ticket_id | uuid | no | ? |
| author_id | uuid | no | ? |
| body | text | no | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `support_ticket_replies_author_id_fkey`: `FOREIGN KEY (author_id) REFERENCES profiles(id)`.
- `support_ticket_replies_ticket_id_fkey`: `FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE`.

## support_tickets

RLS: **enabled**. Policies: 4.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| booking_id | uuid | yes | ? |
| payment_id | uuid | yes | ? |
| category | text | no | ? |
| description | text | no | ? |
| screenshot_path | text | yes | ? |
| status | text | no | 'open'::text |
| priority | text | no | 'normal'::text |
| assigned_to | uuid | yes | ? |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| partner_order_id | uuid | yes | ? |
| urgent_attention_since_at | timestamp with time zone | yes | ? |

Foreign keys:

- `support_tickets_booking_id_fkey`: `FOREIGN KEY (booking_id) REFERENCES service_requests(id)`.
- `support_tickets_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.
- `support_tickets_partner_order_id_fkey`: `FOREIGN KEY (partner_order_id) REFERENCES partner_orders(id)`.
- `support_tickets_payment_id_fkey`: `FOREIGN KEY (payment_id) REFERENCES customer_payments(id)`.

## vendors

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| owner_id | uuid | no | ? |
| business_name | text | no | ? |
| description | text | yes | ? |
| verification_status | text | no | 'pending'::text |
| rating | numeric | no | 0 |
| city | text | yes | ? |
| created_at | timestamp with time zone | no | now() |
| display_name | text | yes | ? |
| photo_url | text | yes | ? |
| experience_years | integer | yes | ? |
| service_names | ARRAY | no | '{}'::text[] |
| category_id | text | no | 'manpower'::text |
| languages | ARRAY | no | '{}'::text[] |
| coverage | ARRAY | no | '{}'::text[] |
| prices | jsonb | no | '{}'::jsonb |
| portfolio | ARRAY | no | '{}'::text[] |
| availability | text | yes | ? |
| available_now | boolean | no | false |
| published | boolean | no | false |

Foreign keys:

- `vendors_owner_id_fkey`: `FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE`.

## wallet_ledger

RLS: **enabled**. Policies: 2.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |
| customer_id | uuid | no | ? |
| amount | numeric | no | ? |
| kind | text | no | ? |
| event_key | text | no | ? |
| booking_id | uuid | yes | ? |
| expires_at | timestamp with time zone | yes | ? |
| created_at | timestamp with time zone | no | now() |

Foreign keys:

- `wallet_ledger_booking_id_fkey`: `FOREIGN KEY (booking_id) REFERENCES service_requests(id)`.
- `wallet_ledger_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## wallet_lots

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| credit_id | uuid | no | ? |
| customer_id | uuid | no | ? |
| remaining | numeric | no | ? |
| expires_at | timestamp with time zone | yes | ? |

Foreign keys:

- `wallet_lots_credit_id_fkey`: `FOREIGN KEY (credit_id) REFERENCES wallet_ledger(id)`.
- `wallet_lots_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES profiles(id)`.

## workbook_delivery_confirmations

RLS: **enabled**. Policies: 1.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| destination | text | no | ? |
| lead_id | uuid | no | ? |
| external_row_key | text | no | ? |
| confirmed_at | timestamp with time zone | no | clock_timestamp() |

Foreign keys:

- `workbook_delivery_confirmations_lead_id_fkey`: `FOREIGN KEY (lead_id) REFERENCES service_requests(id)`.

