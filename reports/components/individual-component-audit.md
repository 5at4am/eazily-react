# Individual component audit

**Status: IN_PROGRESS.** Source inventory covers 221 component declarations in 74 JSX/TSX files. The complete record set is `component-inventory.json`; it records source location, inferred category, props, imports/JSX relationships, approximate route association, and explicit NOT_TESTED statuses. Static relationships can miss dynamic rendering and indirect use.

## Audited representatives and evidence

| Component / area | Static review | Browser evidence | Finding |
|---|---|---|---|
| `App` (`src/App.jsx`) | Route/view-state selection, auth and role access wiring inspected | Route-specific browser tests only; not every gate/role | Preserve routing and auth gates. |
| Customer navigation (`src/components/CustomerNavigation.jsx`, `CustomerDrawer.jsx`, `Ui.jsx`) | Shared navigation primitives and drawer semantics inspected | `customer-navigation-test.mjs` passes navigation/history/account-switch assertions; responsive browser test passes home widths through 1920px before a later route assertion fails | Verified only for covered scenarios; not all menu states or assistive technology. |
| Partner onboarding/legal | Forms and policy acceptance flows inspected | `service-partner-legal-browser-test.cjs` passes policy missing/retry/acceptance flow | Flow verified; not a full component state/keyboard audit. |
| Partner home dashboard (`PartnerDashboard.jsx`, `partner-dashboard.css`) | Shared role dashboard and styling inspected | Authenticated fixture produced auth/backend error; no clean end-to-end dashboard verification | Keep functionality and report appearance as unverified; hard-coded light palette is a review risk. |
| `Select` / `Tabs` primitives (`src/components/ui/`) | Source files exist | No import/use found by source search; no browser coverage | Potential unused components, not proven dead at runtime. |

## Component-level completion rule

The inventory's `accessibility_status`, `functional_status`, and `visual_status` remain `NOT_TESTED` unless an actual component-level verification exists. Browser testing of one journey is not generalized to all components on that route. The current evidence is insufficient to provide defensible independent 0–10 scores for all 221 components; see `component-scorecard.json` for coverage-based scoring policy.
