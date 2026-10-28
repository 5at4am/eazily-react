# Development setup review - 2026-10-10

The user confirmed that linked project `rujrweqttrqdmkkbamjt` is a development/test project. Database inspection used read-only catalog and configuration queries. No hosted settings, migrations, account records or providers were changed.

## Confirmed hosted state

- 89 public tables; zero public tables without RLS enabled. This is not proof that every policy is correct.
- All 59 local timestamped migration versions appear in hosted CLI history. Versions alone do not prove definition parity or prevent schema drift.
- Profiles and categories exist.
- Private buckets: partner-media (50 MiB), profile-media (10 MiB), chat-attachments (10 MiB).
- supabase_realtime is not FOR ALL TABLES and publishes only public.realtime_events.
- Automation master, notification delivery, payment reconciliation, refunds and payouts are disabled.
- Subscription master, rollout and checkout are disabled.

## Local corrections and validation

The preflight now reads the same public-key variable as the frontend, recognizes the two excluded legal drafts, reports coexistence of migration paths accurately, and handles the Windows Supabase CLI shim. The older manual runner recognizes 48 manifest entries but still rejects the current project link; it must not be used to replay an already installed database. README and environment instructions use VITE_SUPABASE_PUBLISHABLE_KEY. The runbook now describes the function authentication configuration actually present in config.toml.

Production build, local authentication tests and the complete 48-file manifest database/security fixture passed. Lint has zero errors and one existing React refresh warning in a mobile test fixture. Offline deployment preflight intentionally remains blocked: it cannot certify hosted verification, backup readiness or authorization, and operator variables are incomplete.

## Next product work

1. Verify Auth provider configuration and exact development redirect URLs without sending unsolicited SMS/email.
2. Test real signup and profile loading with separate customer and partner test accounts.
3. Test partner approval, professional discovery, booking submission/acceptance/status and support; verify unrelated accounts cannot access private records.
4. Verify actual Storage uploads, signed URLs, Realtime transport and Edge function deployments.
5. Resolve approved legal content, production environment, backups and monitoring before a pilot launch.

Use timestamped forward migrations for this project's existing CLI history after reviewing missing changes. Do not reinstall the root SQL manifest, repair history to hide discrepancies, or enable financial providers as part of setup.
