# Project scripts

Run scripts from the project root. Filenames remain stable because tests and fixture HTML files reference them.

| Group | Main entries | Behavior |
| --- | --- | --- |
| Local validation | `source-integrity-test.cjs`, `auth-test.cjs`, `functionality-regression.cjs`, `connection-recovery-test.cjs` | Compile/import checks, controller tests and selected local regressions |
| Feature database tests | `database-test.cjs`, `chat-test.cjs`, `seller-test.cjs`, legal/registration/posting/discovery tests | Local PGlite fixtures; not live production writes |
| Browser/device evidence | `*-browser-test.cjs`, `partner-registration-flow-test.cjs`, JSX/HTML fixtures | UI checks; current agent workflow requires connected BrowserOS Neo |
| Read-only live audits | `auth-settings-audit.cjs`, `backend-contract-audit.cjs`, `product-integration-audit.cjs`, `public-feed-audit.cjs` | Provider status, schema names, counts or public feed availability |
| Explicit live fixture test | `hosted-functionality-test.cjs --run-development` | Creates and cleans synthetic accounts/records on the guarded development project |
| Deployment gates | `staging-preflight.cjs`, `staging-deploy.cjs`, `staging-migrate.ps1` | Read the staging runbook; old project guards must not be bypassed |
| Maintenance/assets | `normalise-migrations.mjs`, optimisation scripts, `bundle-report.cjs` | Not startup steps; migration normalisation rewrites SQL and needs separate review |

The old temporary signup probes were removed. Do not replace them with scripts that send email to random inboxes or leave unknown accounts behind.

Package commands and evidence limits are documented in [Testing](../docs/TESTING.md). Never pass private keys or passwords in command arguments or commit test sessions/logs containing secrets.
