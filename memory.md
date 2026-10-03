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
| VCS | **Not a git repository.** Treat with care — no history, no diff safety net. |
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
`test:smoke`, `test:catalog`, `test:mobile-prototype`, plus `:browser` variants
(`test:partner-navigation:browser`, `test:professional-discovery*`).

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
- Weak spots: no unit-test runner or CI (`.github` holds only `modernize/` hooks), no git, oversized single-purpose feature files, demo Unsplash remote images still referenced.