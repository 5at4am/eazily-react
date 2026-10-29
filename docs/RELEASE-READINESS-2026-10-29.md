# Eazily release readiness — 29 October 2026

## Decision

**No-go for a public launch until the release blockers below are closed.** Local web and Android debug builds succeed and the offline regression/browser smoke suites pass. This does not establish production readiness: the linked Supabase project is documented and configured as development/test, legal content is not approved, and several hosted/device/payment journeys have not been verified.

## Implemented product surface

- React/Vite app with customer discovery, service listings, booking requests, customer profile, saved professionals, messages, and customer account screens.
- Partner workspaces and onboarding for service professionals, influencers, and consultants, including service posting and role-specific dashboards.
- Admin operations workspace and role-gated account access.
- Supabase Auth, Postgres/RPC data access, private Storage references, and Realtime event handling.
- Capacitor Android shell with bundled web assets.

These are implemented code paths, not proof that every live workflow is operational in the intended launch environment.

## Verification completed

| Check | Result | Scope / limitation |
| --- | --- | --- |
| `npm run lint` | Pass; 5 existing warnings | No lint errors; warnings concern React hook dependencies and a fixture export. |
| `npm run build` | Pass | Production web bundle built locally. |
| `npm run test:functionality` | Pass | Offline suites pass; partner-registration browser suite is skipped because it requires connected browser verification. |
| `npm run test:smoke` | Pass | Installed Edge; customer, partner sign-in UI, profile fixture, and navigation checks at phone/desktop widths. Does not authenticate a real account or send email. |
| Backend contract audit | Pass: 64 RPCs and 56 table/bucket references; none missing | Name/interface existence only, not complete RLS or behavior assurance. |
| Auth settings audit | Reachable: signup/email/Google enabled; phone disabled; confirmation required | Linked development project `rujrweqttrqdmkkbamjt`; no OTP delivery or live Google OAuth completion was exercised here. |
| Staging preflight / staging build | Blocked as intended | No explicitly identified staging project, operator credentials, reconciled migration path, DB tools, or approval evidence. No remote changes were made. |
| `npm run android:sync` | Pass | Built and synced web assets into the Android project. |
| Android `assembleDebug` | Pass with JDK 24 | Debug APK created inside `android/app/build/outputs/apk/debug/`; no release signing and no physical-device test. Existing parent-folder APK was not overwritten. |

## Fixes on `release-readiness`

- Splash animation waits for page load (with a bounded fallback), preventing its reveal from racing application startup; respects reduced motion.
- Staging build policy now checks an explicit staging label, a well-formed project ref, a matching HTTPS project URL, a public browser key, and disabled demo/test controls.
- Staging SQL inventory recognizes the timestamped email-identity migration and excludes test-only legal seed scripts; the unused Consultant skip-flag check was removed.
- Regression checks were added for staging build configuration and fail-closed preflight behavior.
- Browser smoke expectations and fixture environment now match current customer welcome, auth, and booking UI; smoke passes against the production build.

## Must close before launch

1. **Legal:** obtain approved, complete consumer and consultant terms/privacy text; replace Service Partner test-only policies; review/publish the correct legal versions for every launch role. Do not publish the incomplete drafts.
2. **Environment and database:** identify and authorize the actual staging/production project; reconcile timestamped migrations with the manifest and hosted history; review schema/policies/permissions; install DB backup/restore tooling and perform a verified backup/restore drill before writes.
3. **Authentication:** configure and test production SMTP delivery using an owned inbox; complete real Google OAuth redirect/callback testing on web and Android; verify account recovery and support handling.
4. **End-to-end journeys:** test real customer signup → browse → request/book → partner accept/complete → customer history/review; partner registration, admin approval, profile/media uploads, chat, Realtime reconnect, and app restart/session recovery in authorized staging.
5. **Money and operations:** verify payment provider/webhook signatures, reconciliation, refunds, payout controls, operational alerts, and support/admin permissions—or explicitly disable and remove any unsupported launch claims/entry points.
6. **Android release:** produce a signed release build with the production environment, test it on physical Android devices and supported OS versions, confirm deep links/back behavior/network permission, and complete store/privacy disclosures. The debug APK is not a release artifact.
7. **Launch ownership:** set monitoring/incident contacts, backups, rollback procedure, privacy/support contacts, and release sign-off. The local branch has no Git remote configured.

## Safety boundaries

No deployment, migration, legal publication, OTP/email delivery, hosted test-account creation, financial transaction, or physical-device test was performed in this audit. Do not treat the linked development project's settings or this debug build as production approval.
