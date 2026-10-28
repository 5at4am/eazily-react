# Email authentication update and test report

## Delivered behavior

- Sign in or create an account with Google or an eight-digit email code. Gmail and other valid email providers are supported.
- No mobile-number authentication, SMS delivery, phone-linking flow, or mobile verification step remains in the app.
- Service partners use their server-confirmed email. Catalogue, identity-document, policy-consent, private-upload and admin-review rules remain enforced.
- Profiles synchronize email and verification from Supabase Auth. Editing profile fields cannot forge a confirmed identity.
- The account screen shows email, and the security screen describes the actual passwordless methods.
- OTP fields fit the available width, support pasting a code and keyboard navigation, and retain the resend cooldown when changing email.
- Android version is 1.0.3, version code 4. Existing Back/Forward navigation is preserved.

## Database audit and migration

The initial aggregate audit found two confirmed-email users, no phone-only users, and two stale profile-email records. Migration `20261023000100_email_identity_verification` was locally tested, applied to project `rujrweqttrqdmkkbamjt`, and recorded in migration history.

After migration: zero functions require mobile verification, zero profile-email mismatches remain, the internal email-check helper is unavailable to anonymous clients, and profile RLS remains enabled. No accounts, applications, contact numbers, consent records or policies were deleted.

## Passed checks

| Check | Result |
| --- | --- |
| Application and JSX fixture compilation | App plus seven fixtures compile |
| Changed-module undefined-variable check | Twelve modules, no issues |
| Auth controller | Email normalization, mobile-number rejection even with a phone-enabled backend, eight-digit verification, wrong-code errors, cooldown, restoration, role gates, recovery isolation and logout |
| Sign-in choices and native callback logic | Google/email rendering, disabled-provider states, callback validation, duplicate callbacks, return paths, cancellation and logout isolation |
| Navigation | Customer Back/Forward, deep links, sheets, scroll restoration, private state clearing and account panels |
| Connection recovery | Ambiguous writes, session errors, permissions and email-verification messages |
| Local database registration | Unconfirmed/forged emails rejected, no-phone signup, Auth/profile synchronization, documents, consent, audit privacy and admin approval |
| General offline regression | All 17 non-browser suites pass |
| Live integration | All 13 checks pass using two disposable identities; no email or SMS sent |
| Live cleanup | All identities and uploaded test fixtures removed |
| Frontend/database contract | All 64 RPC names and 56 table/bucket references exist |
| Live providers | Google and email enabled; phone disabled; email confirmation required |

The live integration suite exercised real eight-digit OTP verification and JWT sessions, token refresh, profile updates and role protection, cross-account RLS, addresses, preferences, partner drafts, idempotent service requests, Realtime, support threads, private Storage and logout.

One stale discovery test asserted the spelling and exact interval of an earlier carousel timer. That implementation-specific assertion was removed; the existing behavioral tests for rotating service windows and professional eligibility remain and pass.

## Cleanup

Removed 11 obsolete files: the legacy phone sign-in screen, unused password-reset entry form, development OTP bypass, four SMS scripts/tests, SMS edge-function source, and three old phone-authentication guides. Removed their package commands, local hook configuration, phone-only styles and outdated current-documentation references. Temporary implementation scripts are excluded from delivery.

Historical SQL migrations, ordinary service contact-number fields, artwork, fixtures for retained features and existing deliverables were preserved. A disabled legacy SMS endpoint, if deployed on Supabase, is not used by the app; no hosted function was deleted by this cleanup.

## Remaining verification

The hosted email template and SMTP configuration were not inspected. Inbox delivery, spam handling, first-user signup mail and interactive Google consent still need a controlled inbox and physical-device check. The prepared email template and instructions are in [Google/email setup](GOOGLE-EMAIL-AUTH-SETUP.md).

BrowserOS Neo was not connected, so the browser-only registration suite was explicitly skipped. No visual browser or physical Android QA is claimed. The APK is a debug build for installation/testing, not a Play Store release.

The source ZIP includes `.env.local` with frontend public settings. It excludes `node_modules`, machine-specific SDK settings, Gradle outputs, temporary files and backups. Run `npm.cmd ci` before rebuilding.
