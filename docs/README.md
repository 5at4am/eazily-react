# Eazily documentation

Start with the current guides. Older root documents and dated reports remain available for implementation history.

| Guide | Purpose |
| --- | --- |
| [Project structure](PROJECT-STRUCTURE.md) | Source ownership, reusable components, CSS loading order and developer workflow |
| [Application](APP.md) | Folder responsibilities, navigation, Auth, save flows and Android setup |
| [Database](database/README.md) | Supabase target, table families, RPCs, RLS, Storage and migration rules |
| [Schema reference](database/SCHEMA.md) | Metadata for all 89 public tables; no customer records |
| [Google and email OTP](GOOGLE-EMAIL-AUTH-SETUP.md) | Current authentication and email delivery setup |
| [Testing](TESTING.md) | Local tests, live development tests, browser/device checks and evidence limits |
| [Cleanup record](CLEANUP-2026-10-11.md) | Removed code, retained files, recovery snapshot and validation |
| [Product readiness](PRODUCT-READINESS-2026-10-11.md) | Completed integration fixes and remaining launch gates |
| [Live database test](DATABASE-TEST-2026-10-11.md) | Results and reliability observations from actual database requests |
| [Staging runbook](staging/RUNBOOK.md) | Deployment gates and migration reconciliation requirements |

## Implementation history

The root documents [IMPLEMENTATION.md](../IMPLEMENTATION.md), [CHAT-MESSAGING.md](../CHAT-MESSAGING.md), [REALTIME.md](../REALTIME.md), [BACKGROUND-AUTOMATION.md](../BACKGROUND-AUTOMATION.md), [DASHBOARD-REDESIGN.md](../DASHBOARD-REDESIGN.md) and [USER-ARTWORK.md](../USER-ARTWORK.md) explain individual feature changes. Some describe earlier migration orders or setup states; read them as history, not current operating instructions. The former partner demo guide was removed with that feature. For the current backend, use the database guide and staging runbook. Do not replay an older migration sequence against an existing database.

Never include API secrets, database passwords, customer records or OTPs in documentation.
