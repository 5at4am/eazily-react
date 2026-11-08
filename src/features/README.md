# Feature modules

Feature folders hold user-facing journeys. The workspace shells in `src/pages/` choose and render them; `src/services/` owns data operations; `src/components/` owns cross-feature UI. A feature can reuse shared components without moving its feature-specific state or layout into a global component.

| Folder | Product area |
| --- | --- |
| `account/` | Customer account, support and profile actions |
| `admin/` | Staff queues and administrative workflows |
| `bulk-orders/` | Customer multi-provider/quote requests |
| `chat/` | Customer/partner conversations and attachments |
| `home/` | Customer home, discovery and campaign presentation |
| `legal/` | Customer consent and legal documents |
| `partners/` | Partner registration, assessments, posts, dashboards and legal flows |
| `requests/` | Customer service request sheet |
| `services/` | Discovery, professional profiles and service experience |
| `user-art/`, `user-motion/` | Customer visual assets and motion-specific components |
| `videos/` | Customer video feed |

## Where new code belongs

- Screen or journey-specific React UI: the owning feature folder.
- Styles used only by that UI: beside the feature, imported by its component/page.
- UI reused across multiple unrelated features: `src/components/` after confirming the interaction is genuinely shared.
- Backend reads/writes and validation-facing adapters: `src/services/`.
- Static labels/category configuration: `src/data/`; never use that folder to fake live business records.
- Route/workspace selection: page shell or `src/App.jsx`, with authorization still enforced by the existing auth/backend policy.

Do not make a “universal workspace” to eliminate legitimate role layouts. Reuse stable controls and data contracts; keep each role's navigation, action gates and page composition explicit.

Physical moves need an import/dynamic-import scan, test path scan, CSS asset URL check, package script check and build/test pass. Until that full set is updated, an index is safer than rearranging live feature modules.
