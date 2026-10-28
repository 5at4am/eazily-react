# Testing guide

## Safe local checks

```powershell
npm.cmd run test:source
npm.cmd run test:auth
npm.cmd run test:auth-options
npm.cmd run test:navigation
npm.cmd run test:connection-recovery
npm.cmd run test:functionality
npm.cmd run lint
npm.cmd run build
```

`test:source` compiles the app and every JSX fixture to catch broken imports after cleanup. It does not open a browser or verify interactions.


`test:functionality` runs the selected non-browser suites for Auth, database, seller rules, policies, registration, posting, Realtime, chat, automation, discovery and booking history. It explicitly skips the partner-registration browser suite. Tests use local fixtures/PGlite and do not prove hosted delivery or device behavior.

Keep fixtures under `scripts/`; they are not unused application screens. Existing browser scripts are preserved, but browser verification in this environment requires connected BrowserOS Neo tools.

## Read-only live check

```powershell
npm.cmd run audit:backend
node scripts/auth-settings-audit.cjs
```

These verify existing backend names and public Auth provider availability. They do not send OTPs or print keys. `product-integration-audit.cjs` inventories all accessible projects and counts records without printing record contents; it is optional, not a normal application startup step.

## Explicit live development test

```powershell
node scripts/hosted-functionality-test.cjs --run-development
```

This is a write test. The script requires the expected development project and public frontend settings. It obtains privileged credentials privately to create/clean disposable accounts, but tests persistence and isolation with actual user JWTs. Do not run it against production or remove its target checks.

It checks Auth codes, profiles, sessions, addresses, preferences, partner drafts, service requests, Realtime, support/replies and private Storage. It creates synthetic users, does not send real email/SMS, and reports cleanup. Results are in `.tmp/hosted-functionality-result.json`; never commit secrets or fixture sessions.

Check the exit code and every failed case. A successful retry does not explain an earlier transport failure. If cleanup fails, review `remainingFixtureIds` and remove only that run's known synthetic records.

## Manual browser/device journey

1. Sign in with a real inbox; verify delivery and identity.
2. Save profile/address/preferences, refresh, and sign out/in.
3. Save a partner draft; reopen it and verify the saved step.
4. After SMS and policies are ready, submit and approve a test partner.
5. Publish a service, request it as another account, accept it and complete it.
6. Verify customer/partner history, chat, read counts, support and uploads.
7. Test slow/offline connections and safe retries; check that requests/messages are not duplicated.
8. Check identity changes, forbidden admin access and unrelated-account denial.
9. On Android, test background/resume, keyboard, native back and session restoration.

Visual checks must include narrow phones and desktop widths, keyboard focus, long text and reduced motion. A build or source compilation alone does not prove those checks.

## Evidence

See [live database results](DATABASE-TEST-2026-10-11.md), [product readiness](PRODUCT-READINESS-2026-10-11.md), and [cleanup validation](CLEANUP-2026-10-11.md). Dated results describe the tested state, not a permanent certification.
