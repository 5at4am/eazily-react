# Eazily

Eazily is a React/Vite product with customer, service professional, influencer, and consultant workspaces. The Admin/staff interface and authenticated Admin/staff authorization have been removed from the current source. Supabase provides authentication, database, private file storage and realtime updates. Capacitor packages the app for Android.

## Run locally

Use a supported Node.js installation and npm. From this folder:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the Vite URL printed in the terminal. Use Vite, rather than Live Server, for this app.

The existing `.env.local` connects to development project `rujrweqttrqdmkkbamjt`. Do not create another Supabase project to run this product. Required public settings are:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_PARTNER_DEMO=false
VITE_AUTH_EMAIL_OTP_LENGTH=8
```

Keep real values in untracked environment files. Never place service-role, database or SMS-provider secrets in frontend configuration. Restart Vite after changing environment values.

## Documentation

| Guide | Contents |
| --- | --- |
| [Documentation index](docs/README.md) | Current guides and historical feature references |
| [Project structure](docs/PROJECT-STRUCTURE.md) | Folder ownership, React components, styling layers and safe cleanup guidance |
| [Application guide](docs/APP.md) | Folder structure, Auth, navigation, persistence and Android |
| [Database guide](docs/database/README.md) | Active backend, table families, RPCs, RLS, Storage and migrations |
| [Testing guide](docs/TESTING.md) | Local checks, live development tests and browser/device verification |
| [Product readiness](docs/PRODUCT-READINESS-2026-10-11.md) | Remaining launch dependencies |
| [Google and email OTP](docs/GOOGLE-EMAIL-AUTH-SETUP.md) | Current sign-in, delivery setup and verification |
| [Cleanup record](docs/CLEANUP-2026-10-11.md) | Removed code and validation |

## Validate and build

```powershell
npm.cmd run test:source
npm.cmd run test:functionality
npm.cmd run test:connection-recovery
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

The functionality command explicitly skips browser-dependent verification. Production builds require the actual backend settings and disabled demo flags. Passing tests or a build does not imply the product is ready to publish.

## Android

```powershell
npm.cmd run android:sync
npm.cmd run android:debug
```

Android sync rebuilds and copies the web assets. APK creation also needs the Android SDK, accepted licences and a compatible Java toolchain. See the application guide for the current setup limitations.

## Current status

Google and email OTP sign-in are enabled. Mobile authentication and mobile verification are removed. Real OTP/session and data-isolation tests passed with disposable accounts. See [the current report](docs/EMAIL-AUTH-TEST-REPORT-2026-10-23.md) for validation and remaining delivery/device checks.

Do not replay existing SQL or remove tables during frontend cleanup. Both source SQL and timestamped migration history are retained; follow [the staging runbook](docs/staging/RUNBOOK.md) before any deployment.
