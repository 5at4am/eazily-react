# Database guide

This guide describes the backend used by the app. It does not authorise migration replay, project deletion or production changes.

For every public table's columns, defaults, foreign keys and RLS status, see the generated [schema reference](SCHEMA.md).

## Backend identity

The app and CLI are linked to development project `rujrweqttrqdmkkbamjt`, named `eazily0@gmail.com's Project`. The frontend URL is `https://rujrweqttrqdmkkbamjt.supabase.co`.

The other audited projects (`eazily-migration-test`, `eazily-test2`, `eazily-final`) are independent backends. None is the app's configured target. Do not pick a project by its name alone. Confirm `.env.local`, `supabase/.temp/project-ref` and the intended dashboard reference before any write/deployment.

The October 11 audit found 89 public tables, all with RLS enabled, private Storage buckets, zero invalid public indexes and zero unvalidated public constraints. This confirms those checks, not that every possible operation is correct.

## Data families

| Area | Main tables | Notes |
| --- | --- | --- |
| Auth and identity | Managed `auth.users`, `profiles`, `staff_access` | Auth owns verified contacts and identity; profile fields do not grant roles |
| Catalogue/discovery | `categories`, `services`, `vendors`, `saved_vendors`, `saved_partner_profiles` | Public discovery uses filtered views rather than exposing private partner documents |
| Customer account | `customer_addresses`, `customer_notification_preferences`, `customer_memberships` | Addresses/preferences have live persistence and isolation tests |
| Partner onboarding | `partner_applications`, `consent_events`, `legal_documents`, `service_document_verifications` | Draft saving is separate from verified submission and human approval |
| Assessments | `consultant_assessment_banks`, `consultant_assessment_questions`, `consultant_assessment_attempts` | Approved questions and server eligibility determine access |
| Listings | `partner_posts`, `service_post_revisions`, `service_post_approval_decisions`, `service_post_approval_config` | Draft, review and published states are distinct |
| Booking | `service_requests`, `partner_orders`, `service_booking_offers`, `seller_order_events`, `partner_availability` | A saved request is not confirmation; acceptance/status comes from server records |
| Chat | `chat_conversations`, `messages`, `chat_participant_state`, `chat_attachments`, `chat_reports` | Participant access, read/unread and attachment ownership are guarded |
| Support | `support_tickets`, `support_ticket_replies`, `operational_review_tasks` | Live tests cover customer tickets/replies and account isolation |
| Payments/wallet | `customer_payments`, `customer_refunds`, `wallet_ledger`, `wallet_lots`, `finance_transactions`, `finance_entries` | Provider-confirmed financial state; frontend callbacks must not invent payment success |
| Partner finance | `partner_earnings`, `partner_payouts`, `cashfree_collaborations`, `seller_subscription_requests`, `seller_subscriptions` | Provider and rollout gates remain inactive |
| Rewards/referrals | `referrals`, `referral_codes`, `referral_config`, `seller_reward_ledger`, `seller_redemptions` | Eligibility is authoritative; displayed rewards are not guaranteed income |
| Operations | `background_jobs`, `notification_outbox`, `excel_lead_outbox`, `automation_configuration` | No configured worker/adapter means delivery cannot be assumed |
| Realtime/audit | `realtime_events`, `partner_audit_log`, `admin_audit_events`, `automation_job_audit`, `chat_staff_audit` | Invalidation and audit history, not a replacement for source records |

These are main table families, not a complete schema definition. SQL files and hosted catalog metadata remain authoritative for columns, constraints, indexes and relations. Do not delete a table because it has no rows or no direct frontend call; triggers, views and RPCs can depend on it.

## Important operations

| Operation | Backend entry | Frontend owner |
| --- | --- | --- |
| Account load/repair | Own profile/application queries, `ensure_my_profile` | `services/partners.js` |
| Partner draft | `save_partner_application` | `services/partners.js` |
| Professional submission | `submit_service_partner_application` | `services/partners.js` |
| Publish/review listing | `save_partner_post`, `save_service_partner_post`, admin review RPCs | Partner/admin features |
| General request | `submit_request` | `services/marketplace.js` |
| Professional booking | `request_professional_booking_with_intake` | `services/marketplace.js` |
| Offering booking | `book_partner_offering` | `services/marketplace.js` |
| Default address | `set_default_address` | Account features |
| Cancellation | `request_booking_cancellation` | Account/order features |
| Chat | `start_chat`, `send_chat_message`, `get_chat_messages`, `mark_chat_read` | `services/chat.js` |
| Legal status/acceptance | `get_consumer_legal_status`, `accept_consumer_policies`, role-specific legal RPCs | Consent and registration features |

`services/experience.js` wraps reads/RPCs and checks consumer consent where required. Existing operation keys provide idempotency for supported mutations. Server-side checks must still enforce identity, consent, role, record ownership and valid transitions.

## Auth and RLS

- Use only the publishable key in the app. Never put service-role credentials or provider secrets in a `VITE_` variable.
- Auth owns email confirmation. `auth.users.email_confirmed_at` is authoritative; profile edits cannot forge verification.
- Customer reads/writes must remain scoped by RLS; frontend filters alone are insufficient.
- Partner roles derive from applications/approval, not client-selected role names.
- Admin/staff access is loaded from authoritative records. Changing a URL or profile field cannot grant it.
- Security-definer functions and public views need explicit permission review when changed.

Google and email are enabled, phone is disabled. The email-only migration is applied; all profile email fields match Auth.

Google and email OTP are the supported sign-in methods. Phone authentication and mobile verification were removed on 23 October 2026. See [the setup guide](../GOOGLE-EMAIL-AUTH-SETUP.md).

## Private Storage

| Bucket | Limit | Object convention |
| --- | --- | --- |
| `profile-media` | 10 MiB | Account-owned paths such as `<user-id>/avatar.jpg` and support uploads |
| `partner-media` | 50 MiB | `<user-id>/<role>/<random-id>.<extension>` |
| `chat-attachments` | 10 MiB | `<conversation-id>/<user-id>/<operation-key>.<extension>` |

Uploads have separate Storage policies. Database RLS alone does not protect files. Use signed URLs after permission checks; keep object paths in records instead of expiring signed URLs. Removing an item from a draft does not necessarily delete the stored object. Orphan retention requires a separate reviewed cleanup process.

## Realtime and Edge Functions

`public.realtime_events` is the published invalidation stream. Clients subscribe to permitted audiences and reload records through normal table/RPC access. Do not publish all tables or put private payloads in event envelopes.

Source functions exist for `youtube-feed`, `automation-worker`, `seller-create-payment` and the Cashfree collaboration/webhook/release handlers. Only `youtube-feed` was deployed during the earlier integration work; it returned an upstream error, with saved videos retained as fallback. Financial functions and workers were not activated. Deployment presence must be verified independently from source files.

## Migration rules

The repository contains **48 ordered source SQL entries** in `migration-manifest.json` and **59 timestamped migration files**. These coexist; they are not two independent sets to replay. The linked database already records the timestamped versions.

Preserve applied SQL and its history. Do not rename, delete or normalise old migrations during file cleanup. For future changes, create a reviewed forward migration after checking hosted definitions and history. Do not run base schema SQL against an existing project.

`scripts/staging-deploy.cjs` and `scripts/staging-migrate.ps1` retain an older project guard. They intentionally reject the current link. Do not change that guard to force a replay. `normalise-migrations.mjs` rewrites migration files and is a maintenance utility, not a deployment step.

Read [the staging runbook](../staging/RUNBOOK.md) before any migration/deployment. `supabase/config.toml` describes local development and function configuration; it is not proof of the hosted Auth settings or database version.

## Verification and maintenance

Run `npm.cmd run audit:backend` for a read-only comparison of literal RPC/table/bucket names. The last audit covered 64 RPC names and 56 table/bucket references; it does not check every dynamic call or argument.

For live development tests, use the explicit command documented in [Testing](../TESTING.md). It creates disposable identities and removes only its fixtures. Confirm the expected backend first. The database test report records passing cases and earlier transport failures.

Before launch, verify backup restoration, monitor Auth/database/Edge errors, test complete booking/chat/payment journeys, and document retention/deletion of personal records. Do not use service-role queries as evidence that customer RLS works.
