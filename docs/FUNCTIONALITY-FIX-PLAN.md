# Functionality fix priorities

Created 2026-10-10. Functionality comes before design. Items marked pending require evidence; they are not assumed defects.

| Priority | Area | Work | Status |
| --- | --- | --- | --- |
| P0 | Authentication | Restore mounted Auth controller, real account context and role routing; match enabled providers and eight-digit email OTP; repair redirects | Fixed; hosted OTP and browser session checks passed; actual email delivery still needs testing |
| P0 | Data persistence | Verify authenticated profile, request and support writes; restore sample-disabled uploader | Fixed and verified with real user JWTs and actual browser profile/upload forms |
| P0 | Authorization | Test profile/request/ticket isolation, role escalation, admin route denial and private uploads | Checked cases passed hosted; full per-operation matrix remains launch work |
| P1 | Core workflows | Verify approval, discovery, booking acceptance/status and chat | Existing local regression suites passed; full hosted partner journey still needs test identities, approved content and phone verification |
| P1 | Auth dependencies | Phone is disabled; Google is disabled; email is enabled | Requires owner-provided SMS/Google credentials; SMTP delivery is not proven by generated-code tests |
| P1 | Legal requirements | No consumer/service-partner/consultant policies are published; two Influencer drafts exist | Requires approved operator details and final legal content; drafts were not published or accepted automatically |
| P1 | Transport | Restore Realtime controller and test actual event transport; inspect Edge availability | Hosted Realtime delivery/isolation passed; youtube-feed deployed; scheduler and financial functions remain inactive |
| P2 | Launch | Production configuration, backups, monitoring and pilot verification | Pending |
| P3 | Design | Layout, accessibility and visual polish after functional checks | Deferred |

Initial evidence: hosted database has 89 public tables with RLS, three private buckets, 59 recorded migration versions, and no saved Auth users or transactional records in the tables checked. The validation section below records the additional hosted and browser checks completed during this repair.

## Completed fixes

- Replaced the sample-only App entry with live customer/partner/admin routing, one Auth controller, account refresh, profile completion and Realtime.
- Unavailable phone/Google providers are no longer offered as working login methods. Phone-link requests are also guarded by provider availability.
- Email verification uses eight digits and accepts sign-in links. The hosted development site URL now uses port 5173 and exact callback routes are allowlisted.
- Restored private partner uploads, retry handling, file validation and PDF preview links. Actual auto-upload was verified in a headless browser.
- The demo flag now respects VITE_PARTNER_DEMO rather than being hardcoded true.
- Profile identity email changes use managed Auth confirmation rather than merely editing the contact email column. Email-change delivery still needs a real approved mailbox test.
- Removed only the UTF-8 BOM from .env.local to unblock CLI deployment; values were preserved.
- Restored the live video-feed attempt and deployed the public read-only function. The configured channel page exists, but its RSS endpoint returned 404 and the function returns 502. Saved videos remain playable and the UI reports the fallback. Reliable live sync needs a supported YouTube integration; it is not marked working.
- Corrected the Consumer-legal test's migration-prefix setup and limited the financial guard test to financial handlers.

## Validation and limits

All 18 selected offline functionality suites passed; demo isolation and the additional provider/eight-digit-code tests passed. Hosted tests passed email-code verification, persistent profile updates, idempotent service requests, support tickets, private uploads, Realtime event delivery and unrelated-account denial. Browser checks passed session restore, the real profile-save form across reload, the actual partner uploader, partner login gates, admin denial and logout. All synthetic Auth users, profile/request/ticket rows and uploaded test files were removed; historical audit/invalidation envelopes may remain by design. No test sent email or SMS.

The read-only contract audit found all 64 literal RPC and 56 table/bucket references. This verifies names, not every argument/column or dynamic call. Build passed; lint has zero errors and one existing fixture warning. No production deployment, billing activation, policy publication or provider credentials were invented.

Next required owner inputs: chosen SMS provider and credentials (configured privately), Google OAuth credentials if desired, an approved mailbox/SMTP setup for delivery testing, final legal/operator content, production domain, and payment-provider sandbox settings if paid checkout is in the first release. Design remains deferred until these functionality gates pass.

Auth implementation references: [Supabase passwordless email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).
