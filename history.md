# HISTORY.md

Append-only change log for this workspace. Newest entry first.
Format: `## YYYY-MM-DD HH:MM — title` then bullets. Record *what* changed and *why*, plus verification run.

---

## 2026-10-03 14:20 — Session start: inspect + run project

- Listed workspace root; confirmed `eazily-react` Vite + React 19 + Capacitor + Supabase app, **not under git**.
- Ran `npm run lint` → **0 errors, 1 warning** (`scripts/service-partner-verify-mobile-fixture.jsx:39`, `react-refresh/only-export-components`). No fix applied.
- Ran `npm run dev` → Vite 7.3.6 ready in 459 ms.
  - Local http://localhost:5173 · Network http://192.168.29.173:5173 · http://172.31.240.1:5173
  - Started detached (PID 23820) with logs at `%TEMP%\opencode\vite-dev.log` / `.err.log`.
  - A foreground `npm run dev` attempt was killed at the 60 s tool timeout — prefer the detached pattern.
- Audited code health: `src` = 107 files / 7,923 lines; zero `console.log`, `debugger`, `TODO`, `any`, `innerHTML`.
- Inventoried backend: 55+ Supabase SQL migrations + `migration-manifest.json` (74 KB) + 7 edge functions
  (automation-worker, cashfree-create-collaboration, cashfree-release-hold, cashfree-release-split,
  cashfree-webhook, seller-create-payment, youtube-feed).
- Inventoried tooling: 69 files in `scripts/`, 11 markdown docs in `docs/`.
---

## 2026-10-03 14:55 — Improvement #1: version control initialised

- `git init`, branch `main`, baseline commit `c41d5b5` — 1,114 files / 45,365 lines.
- Added `.gitattributes`: LF in-repo for text (`js/jsx/mjs/cjs/ts/json/css/html/md/txt/sql/yml/xml/gradle/properties`),
  binary for image/video/font/archive/APK assets. Silences the CRLF churn that affected ~200 files.
- Hardened `.gitignore`: `*.jks`, `*.keystore`, `local.properties`, `*.hprof`, `*.log`, `.idea/`, `.vscode/`,
  `dashboard-checkpoint-*/`, `subscription-checkpoint-*/`.
  Note: `android/.gitignore` ships with `*.jks` and `*.keystore` **commented out**, so signing material was
  unprotected before this.
- Pre-commit secret sweep over staged content: only matches were the *name* `service_role` (Postgres role),
  env-var names, and two explicit fixtures (`SUPABASE_SERVICE_ROLE_KEY: 'test-only'`,
  an `eyJ…fixture` anon key). No real credentials staged. `.env*` stayed ignored except `.env.example`.
- Excluded by existing ignores, as intended: `node_modules`, `dist`, `.tmp` (7.9 GB), `supabase/.temp/`,
  `android/*/build`, `android/.gradle`.

## 2026-10-03 15:10 — Improvement #2: error boundary

Problem: zero `ErrorBoundary` / `componentDidCatch` in the codebase, so any render throw white-screened the app.

- Added `src/components/ErrorBoundary.jsx` — default-exported class using `getDerivedStateFromError`,
  optional `onError(error, info)` hook, `label` prop naming the failed area, and a fallback with
  `role="alert"`, Try again / Reload app actions, and a `<details>` block carrying the error message for support.
  All strings pass through `translate()`.
- Mounted twice: around `<App/>` in `src/main.jsx`, and around the `Suspense` content in `src/App.jsx:53`
  so a single workspace crash cannot take down the shell or the toast layer.
- Added an `alert` icon (triangle-exclamation, 24px stroke style) to `src/components/Icon.jsx`.
  Verified against the real path set — `Icon` falls back to `paths.grid` for unknown names, so a missing
  entry would have silently rendered a grid glyph.
- Added an `/* Error boundary fallback */` block to the end of `src/styles.css`, reusing `--purple`/`--lav`/`--line`
  tokens and the existing `.btn` / `.btn-primary` / `.btn-outline` classes.
- Added `scripts/error-boundary-test.cjs` + `scripts/error-boundary-fixture.jsx` and wired
  `npm run test:error-boundary`. Follows the existing `scripts/smoke.cjs` shape: headless Edge over raw CDP,
  esbuild-bundled fixture, local http server on port 5203, no test framework.
  Asserts: subtree replaced by the alert fallback, crashed children unmounted, `onError` fires exactly once,
  clearing the fault alone does not auto-retry, retry restores children, a recovered boundary still catches the
  next crash, controls outside the boundary stay interactive, and the production build mounts without tripping it.
- Verification: `npm run lint` 0 errors / 1 pre-existing warning (unchanged baseline), `npm run build` OK
  (2.37 s), `npm run test:error-boundary` PASS, dev server on :5173 still serving and hot-reloading.
- Reverted one self-inflicted regression: the fixture initially had no exports, which added 2
  `react-refresh/only-export-components` warnings. Default-exporting the fixture component cleared them.