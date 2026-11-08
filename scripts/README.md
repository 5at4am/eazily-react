# Script index

This folder keeps the existing file paths stable. Many tests and package commands refer to scripts directly, so grouping them into physical subfolders is not a cosmetic change: it requires updating command definitions, fixtures, relative file reads and test runners together.

Use `package.json` as the executable command list. This page is a map; it does not replace each script's safety checks or imply that a hosted test is authorized.

## General checks

| Purpose | Scripts / commands |
| --- | --- |
| Source/build policy | `source-integrity-test.cjs`, `build-policy.mjs`, `build-policy-test.cjs`, `smoke.cjs`, `functionality-regression.cjs` (`npm run test:functionality`) |
| Data and bundle | `database-test.cjs` (`npm run test:database`), `bundle-report.cjs` (`npm run analyze:bundle`) |
| Connection recovery | `connection-recovery-test.cjs` (`npm run test:connection-recovery`) |

## Authentication and account

`auth-test.cjs`, `auth-options-test.cjs`, `auth-settings-audit.cjs`, `live-auth-browser-audit.cjs`. The browser audit and hosted authentication checks use real development configuration; review their source and target before running.

## Customer and marketplace journeys

- Discovery/catalogue: `catalog-service-test.cjs`, `professional-discovery-test.cjs`, `professional-discovery-database-test.cjs`, `professional-discovery-browser-test.cjs`, `public-feed-audit.cjs`.
- Requests/bookings: `request-form-contract-test.cjs`, `customer-bookings-test.cjs`, `booking-conversion-test.cjs`, `bulk-orders-test.cjs`, `customer-navigation-test.mjs`.
- Partner registration and posting: `partner-registration-flow-test.cjs`, `partner-review-notifications-test.cjs`, `service-registration-test.cjs`, `service-registration-browser-test.cjs`, `service-posting-test.cjs`, `service-posting-browser-test.cjs`, `influencer-flow-test.cjs`, `consultant-flow-test.cjs`, `seller-test.cjs`.
- Workspace/navigation/responsive: `partner-dashboard-test.cjs`, `partner-navigation-browser-test.cjs`, `responsive-browser-test.cjs`, `mobile-prototype-test.cjs`.

## Legal, support, chat and realtime

- Legal/assessment: `legal-assessment-test.cjs`, `legal-assessment-browser-test.cjs`, `consultant-legal-test.cjs`, `consumer-legal-test.cjs`, `consumer-legal-browser-test.cjs`, `service-partner-legal-browser-test.cjs`.
- Support: `support-attention-alerts-test.cjs`, `support-attention-automation-test.cjs`, `support-attention-actions-browser-test.cjs`, `support-ticket-conversations-test.cjs`.
- Chat/realtime: `chat-test.cjs`, `chat-browser-test.cjs`, `realtime-test.cjs`, `realtime-browser-test.cjs`, `hosted-functionality-test.cjs`.
- Automation/payment regression: `automation-test.cjs`, `cashfree-webhook-security-test.cjs`, `subscription-benefits-test.cjs`, `subscription-correction-test.cjs`.

## Staging and operational scripts — do not casually run

| File | Role |
| --- | --- |
| `staging-preflight.cjs` | Offline gate; reports blockers and never authorizes deployment |
| `staging-test.cjs` | Applies the local canonical SQL sequence to an isolated PGlite fixture |
| `staging-edge-test.cjs` | Local fail-closed checks for financial Edge handlers |
| `staging-inspect.sql`, `staging-smoke.sql` | Read-only/verification SQL intended for an approved staging session |
| `staging-deploy.cjs`, `staging-migrate.ps1`, `android-build.ps1` | Operational/deployment/build workflows with target and environment assumptions |

**Do not run deployment or migration tools against a hosted project as part of ordinary cleanup.** Follow `docs/staging/RUNBOOK.md`; it requires explicit target verification, schema/history reconciliation, backup and separate authorization. A local test passing is not deployment approval.

## Asset tools and generated fixtures

`compress-*.cjs`, `optimize-*.ps1`, `pack-project.ps1`, and `bundle-report.cjs` are tooling. Files named `*-fixture.jsx`/`.html` exist to render a scenario for a test; they are not routed product screens. Browser tests may write screenshots or logs to ignored `.tmp/` output. Keep source fixtures next to the current scripts unless every import, path lookup, npm command and CI call is updated in one change.

## Adding or changing a test

1. Name it for the feature and kind of test (`<feature>-test.cjs` or `<feature>-browser-test.cjs`).
2. Prefer local deterministic fixtures. Say explicitly if a test uses a hosted service, a browser, or writes state.
3. Add a `package.json` command when the test is a supported developer workflow.
4. Update this index only when a new category or workflow is introduced.
5. Never put service-role credentials or real user data in fixtures, logs or screenshots.
