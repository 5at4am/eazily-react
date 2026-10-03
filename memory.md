# MEMORY.md

Persistent project memory. Read this first at the start of every session before touching code.
Update it whenever facts change. Do NOT put change history here — that belongs in `history.md`.

Last verified: 2026-10-03

---

## 1. Project Identity

| Field | Value |
| --- | --- |
| Name | `eazily-react` (private, v1.0.0) |
| Root | `E:\Satyam\AMAZON_ML\eazily-react\eazily-react` |
| Description | Multi-sided marketplace (customer / seller / service partner / consultant / influencer / admin) converted from a legacy HTML/CSS/JS prototype to modular React. Runs in demo mode without a backend. |
| VCS | **Git repo initialised 2026-10-03** on branch `main`, baseline commit `c41d5b5`. `.gitattributes` normalises LF and marks binaries. |
| Shell | Windows / PowerShell 5.1. Use `npm.cmd` in scripts. |

## 2. Stack

- Vite `^7.1.4` (observed running 7.3.6), `@vitejs/plugin-react` ^5.0.2
- React / React-DOM `^19.1.1` — **plain JS + JSX, no TypeScript in `src/`**
- Capacitor `^8.5.2` (`@capacitor/android`, `@capacitor/app`) for the Android shell
- Supabase (`src/lib/supabase.js`) — auth, Postgres, storage, realtime
- ESLint 9 flat config (`eslint.config.js`) + `eslint-plugin-react-hooks`, `react-refresh`
- `@electric-sql/pglite` devDep (local Postgres for tests)
- Node.js 24 LTS / npm 11+ required

## 3. Layout

```text
src/
  App.jsx          onboarding + app-mode controller
  main.jsx         entry
  styles.css       full visual system
  auth/            auth policy helpers
  components/      shared UI + inline SVG Icon set
  data/            catalogue + demo seed data
  features/        account, admin, bulk-orders, chat, home, legal, partners,
                   requests, services, user-art, user-motion, videos
  lib/             supabase, translate (29 KB), pricing, subscriptions,
                   realtime, workspace, nativeShell, influencerFollowers, account
  pages/           UserApp, SellerApp, PartnerApp, AdminApp,
                   ConsultantArea, InfluencerArea, ServicePartnerArea
  services/        DB-facing functions (marketplace, partners, chat,
                   paymentCheckout, experience, consumerConsent, ...)
supabase/          55+ SQL migrations + migration-manifest.json + 7 edge functions
scripts/           69 files — mostly *.cjs verification harnesses + *.jsx fixtures
docs/              11 markdown docs, incl. staging/ runbook + audit
```

## 4. Key Commands

```powershell
npm run dev            # vite dev server -> http://localhost:5173
npm run build          # vite build -> dist/
npm run build:staging  # staging-mode build
npm run preview        # serve dist/
npm run lint           # eslint .   (currently 0 errors, 1 warning)
npm run android:sync   # build + cap sync android
npm run android:debug  # sync + gradlew assembleDebug
npm run analyze:bundle # build + bundle-report.cjs
```

Test commands are per-domain `.cjs` harnesses, not a unit-test runner:
`test:auth`, `test:database`, `test:seller`, `test:legal-assessment`,
`test:consultant-legal`, `test:consumer-legal`, `test:service-registration`,
`test:service-posting`, `test:partner-registration-flow`, `test:realtime`,
`test:chat`, `test:automation`, `test:staging`, `staging:preflight`,
`test:smoke`, `test:catalog`, `test:mobile-prototype`, `test:error-boundary`, plus `:browser` variants
(`test:partner-navigation:browser`, `test:professional-discovery*`).

Browser harnesses use **no test framework**: headless Edge over raw CDP
(`--remote-debugging-port`) with a hand-rolled `send/evaluate/waitFor/click` helper, `esbuild` bundling a
`scripts/*-fixture.jsx` into `.tmp/fixture.js`, and a local `node:http` server. Follow this shape for any new
browser test. Every fixture must default-export a component or ESLint's `react-refresh` rule warns.

## 4b. Crash Handling

`src/components/ErrorBoundary.jsx` (default-exported class, `getDerivedStateFromError` + optional `onError`
prop, `label` prop naming the failed area). Mounted twice: around `<App/>` in `main.jsx`, and around the
`Suspense` content inside `App.jsx` so one workspace crash cannot take down the shell. Styles in the
`/* Error boundary fallback */` block at the end of `src/styles.css`. Verified by `npm run test:error-boundary`.

## 4c. Supabase: sample mode vs connected mode

Two build modes, chosen by `scripts/build-policy.mjs` from `EAZILY_TARGET_ENV`:

| Mode | Trigger | `src/lib/supabase.js` resolves to | Result |
| --- | --- | --- | --- |
| sample (default) | no target declared, or `production` | `src/lib/supabase.sample.js` (null stub) | 118 modules, no client/endpoint/key in `dist`; every `if (!supabase)` demo guard holds |
| connected | `EAZILY_TARGET_ENV` = `staging` \| `development` \| `local` | the real module | 161 modules, `@supabase/supabase-js` + `.supabase.co` present |

Key mechanics, easy to break:
- The real `src/lib/supabase.js` imports the SDK **statically**, so tree-shaking cannot remove it from a
  sample bundle. The plugin's `resolveId` hook (`enforce:'pre'`) swaps the whole module for the stub instead.
- `SUPABASE_ENTRY=/(^|[/\\])supabase\.js$/` must stay broad enough to catch the sibling import
  `'./supabase.js'` in `src/lib/realtime.jsx`, not just `'../lib/supabase.js'`.
- `build:staging` **without** `EAZILY_TARGET_ENV` now fails by design. Connected builds need
  `EAZILY_TARGET_ENV=staging npm run build:staging`.
- Credentials live in `.env.staging.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
  Vite's dev server reads `.env.development.local` by default, so use `--mode staging` to develop connected.
- Never put a service-role or other server secret in any `VITE_` variable. `privilegedJwt` in the policy
  decodes bundled JWTs and fails the build on any role other than `anon`.
- `npm run dev` with no credentials keeps the local OTP bypass (`VITE_ENABLE_LOCAL_OTP=true`, code `0000`);
  with a real client the dev runtime disables itself automatically via `DEVELOPMENT_OTP_ENABLED && !supabase`.

Read-only recon: `node scripts/hosted-recon.cjs` (journey relations) or `--all` (every relation found in
`supabase/*.sql`). GET only, prints no credentials.

## 9. Hosted Project Status (probed 2026-10-03, read-only)

Project `ahwbgmnfmzsaiwjglbkb` / `eazily-staging`, ap-south-1, PG 17.6, GoTrue v2.197.

- **The schema is already deployed.** 88 of 100 relations return `401` to the browser role, which means they
  exist and are correctly not granted to `anon` — not that they are absent. `docs/staging/REPORT.md`
  (2026-09-18) claiming "0 applied" is stale.
- 12 relations are anon-readable: `categories`, `app_configuration`, `partner_public_config`, `referral_config`
  (all populated with real rows), plus the empty public views `vendor_directory`,
  `customer_professional_directory`, `customer_professional_reviews`, `customer_reviews`,
  `customer_service_verification`, `partner_directory`, `consent_events`, `service_policies`.
- **Auth is not configured, which blocks login entirely:** `phone` is absent (phone OTP disabled),
  `google` is `false`, `uri_sites_allowed` empty. `sms_provider` is `twilio` but credentials are unverifiable
  from outside the dashboard. `mailer_autoconfirm` is `false`.
- **No content data:** vendors, services and profiles are empty, so discovery returns nothing until seeded.
- No migration ledger exists in the repo, so which of the 48 manifest files are applied cannot be answered
  through PostgREST. Determining that needs the Supabase CLI and the DB password.

## 5. Conventions Observed

- Thin `src/services/*.js` layer wraps Supabase; components never query directly.
- RPC-first for writes: `rpc('submit_request', {...})`, `book_partner_offering`, etc.
- `experience.js` exports `readRows`, `rpc`, `canonicalService`, `serviceNamesForLookup`.
- Graceful degradation is idiomatic: `.catch(() => [])` on optional reads, `if (!supabase) return []`.
- Idempotency keys on every mutating call (`p_key`).
- Signed media URLs via `supabase.storage.from('partner-media').createSignedUrl(path, 900, transform)`.
- Money via `src/lib/pricing.js`; i18n via `src/lib/translate.js`; no emoji in UI (inline SVG icons instead).
- Naming: PascalCase `.jsx` components, camelCase `.js` services, `service_partner_*.sql` migrations dated `*_YYYY_MM_DD.sql`.
- No comments convention is not enforced here — existing files are sparsely commented.

## 6. Hard Rules / Security Posture (from README + docs)

1. Anon key is frontend-only and **only** safe with RLS on. Never ship the service-role key to the client or into any `VITE_` var.
2. Financial docs, PAN/KYC, bank statements, admin approvals → protected buckets + server-side authorization.
3. Demo admin login must be replaced with Supabase Auth + admin role check before production.
4. Apply migrations in `supabase/migration-manifest.json` order; **never** deploy base `schema.sql` alone.
5. `.gitignore` covers `.env*` except `.env.example` — keep it that way. `.env.development.local`, `.env.local`, `.env.staging.local` exist on disk.

## 7. Known Health Snapshot (2026-10-03)

- `src`: 107 files / ~7,923 lines.
- Lint: 1 warning — `scripts/service-partner-verify-mobile-fixture.jsx:39` `react-refresh/only-export-components`.
- Zero `console.log`/`debugger`, zero `TODO`/`FIXME`, zero `any`, zero `dangerouslySetInnerHTML` in `src/`.
- Largest modules: `PartnerOnboarding.jsx` (44 KB), `ServicePartnerOnboarding.jsx` (41 KB), `translate.js` (29 KB), `PartnerApp.jsx` (29 KB).
- Weak spots: no unit-test runner or CI (`.github` holds only `modernize/` hooks), oversized single-purpose feature files, demo Unsplash remote images still referenced.

## 8. Improvement Backlog (ranked, 2026-10-03)

| # | Item | Effort | State |
| --- | --- | --- | --- |
| 1 | `git init` + baseline commit | 30 min | **done** `c41d5b5` |
| 2 | Error boundary at app shell | 1–2 h | **done** + browser test |
| 3 | Vitest unit tests for pure logic (`customerProfessionalEligibility`, `pricing`, `canonicalService`/`serviceNamesForLookup`) | ~1 day | pending |
| 4 | Split `PartnerOnboarding.jsx` / `ServicePartnerOnboarding.jsx`; fix suppressed hook deps at `ServicePartnerOnboarding.jsx:251,317` | 2–3 days | pending |
| 5 | CI workflow (`.github/workflows/ci.yml`) | 1 h | **done** — `verify` (lint, build, bundle budget) gating, `browser` (windows-latest, advisory) |
| 6 | Pre-launch: real admin auth, replace 7 Unsplash URLs, `.env` documentation | 1–2 days | pending |

`scripts/build-policy.mjs` already blocks privileged `VITE_` vars and scans build output for leaked credentials —
it runs automatically on every `npm run build` because `vite.config.js` registers it as a plugin.

## 9. Known Pre-existing Failures (do not assume your change caused these)

- `npm run test:smoke` fails on the baseline commit at `scripts/smoke.cjs:72` —
  `Cannot read properties of null (reading 'getBoundingClientRect')` while asserting `.phone-shell` at 1280 px.
  Reproduced on `c41d5b5` with all my `src/` changes reverted, so it is independent of the error boundary.
  Likely the launch-splash timing or the missing setup screen at desktop width. Untriaged.
- `scripts/bundle-report.cjs:8` used to reject every `.png`/`.jpg` in `dist`, contradicting the deliberate
  copies in `build-policy.mjs` `writeBundle`, so `npm run analyze:bundle` failed on a clean checkout.
  Fixed 2026-10-03 by scoping the exception to the two brand logos and `assets/demo/professional/*`
  (see `sanctionedMedia`); any other raster asset still fails, by name.