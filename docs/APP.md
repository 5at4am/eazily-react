# Application guide

Eazily is a React/Vite application with a Capacitor Android shell and Supabase backend. The public site supports browsing; durable account actions require authenticated backend access.

## Folder responsibilities

| Location | Responsibility |
| --- | --- |
| `src/main.jsx` | Entry point, shared styles and rendering error boundary |
| `src/App.jsx` | One Auth controller, account context, workspace gates and shared Realtime |
| `src/auth/` | OTP entry, enabled-provider discovery, session controller and permission policy |
| `src/pages/` | Customer, partner and admin application shells |
| `src/features/` | Feature screens: discovery, requests, account, registration, chat, legal and video |
| `src/services/` | Backend queries, RPCs, upload operations and readable backend errors |
| `src/lib/` | Supabase singleton, account context, Realtime, native navigation and shared calculations |
| `src/data/` | Catalogue, labels and category configuration |
| `public/` | Static images and other public assets; never private documents |
| `scripts/` | Tests, JSX fixtures, read-only audits and controlled deployment utilities |
| `supabase/` | SQL, migrations, deployment configuration and Edge Functions |
| `android/` | Native Android project and synced web assets |
| `docs/` | Current guides, dated evidence and implementation references |
| `.tmp/` | Ignored audit output, test logs and cleanup recovery snapshot |
| `dist/`, `node_modules/` | Generated build output and installed dependencies |

Keep a feature's component, CSS and helpers together. Put backend operations in `services/`; route all sign-in through the shared Auth controller. Database rules belong in SQL/RLS, even when the UI also disables an action.

## Start the app

Install dependencies with `npm.cmd ci`. Configure the existing untracked `.env.local` without overwriting credentials. Required public settings are `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

Use the Vite URL printed in the terminal. Changes to environment values require restarting Vite. The configured backend is documented separately in [Database](database/README.md).

## Navigation and permissions

| Workspace | Path | Access |
| --- | --- | --- |
| Customer | `/user/home` | Browsing is public; saved account actions need sign-in |
| Service professional | `/seller/service/dashboard` | Application required; operational actions remain locked before approval |
| Influencer | `/seller/influencer/dashboard` | Own application and approval rules |
| Consultant | `/seller/consultant/dashboard` | Own application, legal and assessment requirements |
| Admin | `/admin` | Authoritative admin/staff permissions |

`auth/policy.js` owns route access. A draft opens registration; submitted/under-review applications open their pending dashboard. An approved consultant also needs assessment eligibility. Account restrictions take precedence over workspace access. URL changes never grant backend permissions.

## Login and saving data

1. `auth/runtime.js` reads the enabled providers from Supabase.
2. `auth/controller.js` manages OTP requests, verification, SDK events and account refresh.
3. `services/partners.js` loads the profile, applications and staff access for the signed-in user.
4. `App.jsx` supplies that account to screens and starts Realtime subscriptions.
5. Feature services query RLS-protected tables or call guarded RPCs. A success result comes from the server.

SDK storage owns authentication tokens; do not create another token store. Repeated events for the same identity preserve drafts. Account changes clear private UI state. Failed account refreshes retain an already-authorised screen while reporting the problem.

Profile details, addresses, preferences, partner drafts, service requests, support and uploaded files have live persistence tests. Device theme/language preferences are local. Chat draft text is held in session storage where available. Unsubmitted form fields can remain in memory; keeping a form open is not a guarantee of persistence after closing the app.

Keep operation keys for uncertain booking/message retries. Do not retry financial mutations automatically or infer payment success from closing checkout. Realtime events invalidate cached data; screens reload authoritative records instead of treating event payloads as a database copy.

## Explicit previews

The old interactive partner-workspace demo was removed. A separate customer discovery sample fixture still exists for local preview checks under `src/features/services/customerProfessionalDemo.js`; it is isolated behind `VITE_PARTNER_DEMO=true`, an unconfigured Supabase client and no signed-in account. Keep the flag false for normal use and release. These sample professional cards are not real listings and do not grant booking, approval or authentication privileges.

## Android

```powershell
npm.cmd run android:sync
npm.cmd run android:debug
```

Sync rebuilds `dist/` and copies it into Android. Do not edit generated Android web assets directly. A successful sync does not produce an APK or prove device behavior.

The project uses Android API 36 and needs SDK Platform 36, Build Tools 35 or newer, accepted SDK licences and **JDK 21 or newer**. Capacitor's generated `capacitor-android` module sets `sourceCompatibility`/`targetCompatibility` to `VERSION_21`, so JDK 17 fails the build with `invalid source release: 21`. JDK 24 builds the project correctly.

A debug APK has been built successfully: `com.eazily.app`, minSdk 24, targetSdk 36, `application-debug.apk`, signed with the local debug keystore. It is a development artifact, not a release build, and it carries no release signing key. The Android manifest declares only `INTERNET`; `google-services.json` is absent, so push notifications are not compiled in.

`android/local.properties` holds the machine specific SDK path and is ignored by Git. Run `npm.cmd run android:sync` before every build so the bundled web assets match the current `dist/`.

On a device, verify login, token refresh, background/resume, offline/reconnect, logout, upload and keyboard behavior. Google authentication uses a PKCE browser callback through com.eazily.app://auth/callback. Test that callback on an Android device. Background push remains unconfigured.

## Known launch dependencies

Google and email OTP are the supported sign-in methods. Phone authentication and mobile verification were removed on 23 October 2026. See [the setup guide](GOOGLE-EMAIL-AUTH-SETUP.md). SMTP delivery and physical-device checks remain pending.
