# Eazily Vendor / Partner App — Working Brief

This document describes the vendor-facing product as it exists in the current codebase. In Eazily, “vendor” is usually called a **partner** in code and UI. The partner roles are **Professional / Service Partner**, **Influencer**, and **Consultant**. The Admin/staff screens and authenticated Admin/staff authorization have been removed from the current source. Until a replacement review process exists, partner applications and posts cannot be approved through this app.

## Product purpose

Partners can register and submit their details, but the removed Admin/staff interface means new applications and review-required posts have no in-app approval path. Existing approved partners can use their workspace, subject to backend state and the Consultant assessment/legal gates. Authentication, application ownership, role access, and financial operations remain backed by Supabase; local preview/testing is not proof of a live action.

## Entry, registration, and review lifecycle

1. A person signs in or creates an account, then chooses a partner role. A single account can have more than one partner role and can switch between partner workspaces or customer home.
2. The app routes by role and application status. A missing or draft application opens registration. `submitted` and `under_review` can enter a restricted workspace; operational work remains locked until approval. Because the Admin/staff review interface is removed, submitted applications cannot currently progress to approval through the app.
3. Registration is a six-step flow. Draft progress is saved through the application service as the user advances; “Save & Exit” saves a draft. Submission requires valid fields, required documents/consent and a configured live backend. In local testing mode, drafts are session-only and a completed live submission is intentionally unavailable.
4. Historical review status and notes remain in the database, but authenticated Admin/staff review capability is retired by local-only migration entry 55. It has not been deployed to Supabase.

### Role-specific registration

- **Professional / Service Partner:** personal and verified sign-in details; location; business/shop details; chosen services and skills; experience and work preferences; bank details; identity/shop documents; final review and service-partner terms/privacy acceptance. PIN lookup may suggest city/state; users can correct suggested values. Location permission is requested only after an explicit action. Home/base address and verification documents are private. Bank details are collected but should not be described as verified merely because they were entered.
- **Influencer:** creator/profile and category, location, content/reach, social accounts and audience bands, verification/payout details, and final terms/review. At least one linked platform must meet the configured audience threshold (currently 5,000 by the client flow; the server remains authoritative). Social metrics are self-reported unless separately verified. Current published Influencer terms/privacy documents are required for live submission.
- **Consultant:** expertise and consultation fields, qualifications/experience, identity and bank details, field assessment, and consultation terms. A passed assessment is a separate gate from application review. Changing the expertise/category resets the assessment state. Live legal eligibility is checked before submission.

## Home / workspace

The active vendor shell is `src/pages/PartnerApp.jsx`; it loads account-owned application/workspace records and selects role-specific navigation. The home dashboard is implemented in `src/features/partners/PartnerDashboard.jsx` (including `DashboardHome`). It is not the same as `src/features/partners/VendorDashboard.jsx`: that file is currently an unreferenced component and should not be treated as the shipped home screen unless it is deliberately wired in.

The live home varies by role and approval state. It can show partner identity/status, an approval or assessment/legal gate, availability controls, work summaries, earnings/growth information, dashboard banners, and links into work/profile. Availability changes are permission/status constrained. Pending partners have limited routes (`Home`, `Profile`); approved partners can access work routes. Consultant approval alone is not sufficient if assessment/legal requirements are incomplete.

## Jobs, services, posts, and work management

- **Jobs / Orders:** partner requests, bookings, collaborations, or consultations are shown according to the partner role. Opening an order reveals its detail and permitted actions. Service professionals may have response deadlines and offer eligibility rules. Do not imply an enquiry is accepted or a payout is guaranteed until the authoritative record says so.
- **Services / Posts:** professionals manage service offerings with review/publish states; Influencers manage posts and collaboration packages; Consultants manage consultation information. The `Add` action opens a role-specific post form. Existing posts can expose edit, duplicate, pause/resume, or archive actions as appropriate. Review notes and statuses belong to the post/application records.
- **Professional listing review:** service listing changes may require review. Pricing and approval checks are server-side; an edited listing must not be represented as live until the server returns an eligible published state. No in-app staff review interface is currently available.
- **Availability:** professional availability is a workspace action, not the same as application approval. Only approved partners can receive the operational capabilities associated with being online.

## Profile section

The live Profile route is rendered by `PartnerProfile` in `src/pages/PartnerApp.jsx`. It shows role/name, city/category or specialization, application/verification status, and reviews where present. “Edit Profile” opens registration editing; some roles also have a business-details view. Profile menus expose role-appropriate work links, private documents/verification status, training, notifications, settings, support, legal documents, earnings/payment history, rewards, and subscriptions when applicable. Approved partners can open Messages. Accounts can switch to Customer or add another partner role.

Sensitive documents and private details must remain private. Public profile fields must not be confused with bank, identity, or internal verification data. Influencer social-account information is shown as self-reported unless it has a verified marker.

## Codes, referrals, and rewards

There is **no standalone vendor coupon/promo-code management screen** in the current partner workspace. Registration can collect a referral source; some non-professional registration forms also have an optional referral-code field. This records attribution and is not a promise of a discount, commission, or reward.

The separate **Rewards** panel is available from relevant profile/earnings areas. It reads the configured rewards catalogue and points ledger. If rewards are not enabled, the UI says they are coming soon. If enabled, partners can see points, eligible rewards, history, and request a redemption through the server RPC. Points are not withdrawable cash. Do not call this a coupon-code system.

If “code section” means another specific screen (for example, a vendor-entered discount code, referral code, or rewards redemption code), it is not currently a distinct workspace route. Confirm the intended feature before adding or documenting new behavior.

## Chat / Messages

The live messaging UI is `src/features/chat/ChatWorkspace.jsx`, used for both customers and partners. Approved partners get a Messages route and can open a conversation from a relevant order/job. The workspace lists/searches conversations, shows unread counts, loads message history, supports text and image/PDF attachments, and marks messages read. Drafts are kept in session storage when available. Sending requires an online connection; failed sends/uploads can be safely retried with the same operation key.

Conversation safety actions include mute, archive, block/unblock, and report. Blocking a conversation does not erase existing booking obligations. The chat contains a payment-safety notice: use only Eazily’s official payment system/official QR; do not pay a partner’s personal QR or cash. Chat authorization and attachment access are enforced by backend services; do not treat a hidden UI control as the security boundary.

Historical application review notes are **not chat messages**. They remain attached to the application and are visible in registration when the partner is routed there.

## Notifications and review notes

The partner app already has an in-app bell backed by `seller_notifications`. Current notification UI in `PartnerApp.jsx` assumes a notification has an `order_id`: it marks it read and opens the relevant order. Existing notification records are account/role scoped and unread state drives the bell count. Realtime invalidation can refresh authoritative data while the app is open; it is not itself an alert.

Earlier Admin application decisions saved `review_notes` to `partner_applications`; the partner can read the note on onboarding/registration. A typed notification path exists in the local migration source, but the Admin review process that would produce the notification has been retired. Neither local-only migration 54 nor 55 has been deployed.

- Before any future review workflow is introduced, define a replacement trusted authorization and review process; do not re-enable Admin/`partner.approve` access implicitly.
- A review notification needs a safe application link/type (rather than pretending to be a booking), and partner-scoped read access.
- The bell handler must support both booking and application destinations and must route a `changes_required` partner to registration, where the note is visible.
- Do not claim that email, SMS, Android background push, or a chat message is sent. Background push is not configured.

The notification destination resolver and owner-scoped database regression are available locally. The approval workflow is intentionally unavailable until a replacement review process is approved and implemented.

## Other partner features

- **Earnings and payment history:** read from partner earnings records and distinguish pending, available, paid, reversed, and other states as displayed. These screens report records; they do not authorize a payout or prove a transfer occurred by themselves.
- **Growth:** role-specific insight/review summaries and guidance based on available records.
- **Training:** enabled training content and completion progress where configured.
- **Subscriptions:** current membership/trial state and plan information. Do not assume a paid feature is active unless the server-side subscription state confirms it.
- **Support:** partner help/support entry points; distinct from customer chat and from Admin review notes.
- **Legal:** role-specific current terms/privacy and Consultant legal eligibility. Acceptance/version state is part of registration gates.
- **Realtime and errors:** app data is refreshed from authoritative records when realtime revisions arrive. A realtime event is an invalidation/refresh signal, not guaranteed delivery of push. Screens may show loading, retry, or backend errors; never present a failed read as an empty authoritative result.

## Important implementation paths

- App routing and status gates: `src/App.jsx`, `src/auth/policy.js`
- Registration: `src/features/partners/PartnerOnboarding.jsx`, `src/features/partners/ServicePartnerOnboarding.jsx`, `src/services/partners.js`
- Partner shell/data/navigation/notification click handling: `src/pages/PartnerApp.jsx`
- Live dashboard and profile menus: `src/features/partners/PartnerDashboard.jsx`, `src/pages/PartnerApp.jsx`
- Unwired vendor-dashboard component: `src/features/partners/VendorDashboard.jsx`
- Chat UI: `src/features/chat/ChatWorkspace.jsx`; chat service: `src/services/chat.js`
- Rewards: `src/features/partners/RewardsPanel.jsx`
- Historical application review RPC: `supabase/migrations/20260901000400_partners.sql`; later local-only migration entry 55 disables authenticated Admin/staff capability.
- Seller notification baseline: `supabase/migrations/20260901001000_seller_workspace.sql` (check later migrations for changes)
- Realtime event plumbing: `src/lib/realtime.jsx` and the relevant Supabase realtime migrations

## Guidance for future AI work

1. Use “partner” for the general model and “Professional / Service Partner,” “Influencer,” or “Consultant” for role-specific behavior. “Vendor” is a user-facing/product synonym, not a separate auth role.
2. Inspect the current route, live component, Supabase schema/RPC, and later migrations before editing. This repository has accumulated migrations that replace earlier functions; an older migration is not always the effective definition.
3. Preserve account ownership, role gates, RLS, and server-side RPC authorization. Do not expose identity/bank documents or fabricate real partner/work data.
4. Keep application review notes on the application. If implementing alerts, extend notifications with explicit typed destinations and support onboarding as a destination; do not force application notifications through the booking-only path.
5. Distinguish configured/live data from local testing fixtures, proposed design, or an unwired component. Clearly state when a behavior is not implemented or has not been verified against a live backend.
