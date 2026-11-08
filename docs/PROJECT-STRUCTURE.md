# Project structure and reading guide

This guide describes the source that is in the repository now. It is an orientation map, not a proposal to move files or change backend/deployment workflows.

## Start here

| Read this | To understand |
| --- | --- |
| `src/main.jsx` | Browser entry point and the order shared CSS is loaded |
| `src/App.jsx` | Authentication/session owner, workspace selection, route gates and shared providers |
| `src/auth/` | Sign-in, session updates and authorization-aware workspace policy |
| `src/pages/` | Customer and partner workspace shells |
| `src/features/` | User-facing feature screens and feature-local styles |
| `src/components/` | Reusable visual building blocks used by multiple screens; see [`src/components/README.md`](../src/components/README.md) |
| `src/services/` | Data access and backend-facing operations called by features |
| `src/lib/` | Shared infrastructure such as Supabase, navigation, Realtime and translations |
| `src/data/` | Static labels, catalogue definitions and presentation configuration—not a replacement for live records |
| `DESIGN.md` | Shared visual tokens and interface conventions |
| `package.json` | Supported commands and runtime dependencies |

## How a screen is assembled

The normal direction of data flow is:

```text
main.jsx
  └─ App.jsx                  session, account context, access gates
      ├─ UserApp.jsx          customer shell
      ├─ PartnerApp.jsx       partner shell and role-specific dashboard
          └─ feature screen   one job or journey
              ├─ shared component (optional)
              └─ feature service → Supabase/RPC or another existing service
```

`App.jsx` decides which workspace a signed-in account may enter. A page shell owns navigation between screens inside that workspace. A feature owns a task, such as submitting a request, viewing a professional, or managing a partner profile. A service owns the operation that reads or changes data. Keeping those responsibilities separate makes it easier to find a bug and test a journey without turning every screen into one very large component.

### What “reusable component” means

A React component is a function that returns a piece of interface. It can be rendered once or many times. For example, a screen may render the same `Field` component for email, phone, and address, passing different labels and values each time:

```jsx
<Field label="Email" value={email} onChange={event => setEmail(event.target.value)} />
<Field label="Phone" value={phone} onChange={event => setPhone(event.target.value)} />
```

Each rendered field receives its own props and state. Reuse the component when the interaction and meaning are the same; use props to vary content and state. Do not force unrelated screens into the same layout just because both contain a card or button. Shared pieces currently include `Field`, `Button`, `Sheet`, `Toast`, `EmptyState`, `SearchBox`, `BottomNav`, `Icon`, and `CustomerNavigation`. Their API and styling ownership are documented in [`src/components/README.md`](../src/components/README.md).

When rendering a list, React needs a stable `key` for each item. Give the component values and callbacks through props; keep server reads/writes in the appropriate service. A component should not secretly invent business records or perform a privileged operation.

## Folder responsibilities

### `src/`

- `auth/` — authentication screens, OTP input, provider discovery, session controller, OAuth and workspace policy.
- `components/` — cross-feature UI. A component belongs here when it has a stable shared role; feature-only UI stays with that feature.
- `data/` — static catalogue/category configuration and copy. Persisted customer or partner data belongs to the backend service layer.
- `features/` — grouped by product capability: account, bulk orders, chat, home/discovery, legal, partners, requests, services, user artwork/motion and videos. Feature CSS is kept nearby where practical.
- `lib/` — application infrastructure shared by pages/features: Supabase client, navigation state, account helpers, Realtime, native-shell support and translations.
- `pages/` — the customer and partner workspace shells (`UserApp`, `PartnerApp`). Admin/staff screens and access were retired; historical database migrations are preserved.
- `services/` — marketplace, partner, chat, consent, eligibility, media and checkout integrations.
- `main.jsx` — root rendering plus shared stylesheet imports.

### Other root folders

- `public/` — assets delivered by Vite as public files. Never put private user uploads here.
- `supabase/` — backend source and operations: SQL, migrations, Edge Functions and configuration. This pass does not reorganize or alter it.
- `android/` — native Capacitor Android project. Synced web assets and SDK/build output are generated; edit the web source in `src/` instead.
- `scripts/` — local tests, browser fixtures, asset utilities, audits and guarded staging tools. See [`scripts/README.md`](../scripts/README.md) for categories. A script with “staging” or “deploy” in its name is operational; do not casually rename, combine or run it against a hosted target.
- `docs/` — current guides and historical implementation evidence. `docs/README.md` is the index; dated screenshots and reports document past states and are not necessarily the current UI.
- `.agents/` and `.opencode/` — project agent instructions and skill material, not application runtime code.
- `backups/` — retained recovery/reference snapshots. Do not delete because a file resembles current source; it may be intentionally kept for recovery.
- `.tmp/` — ignored generated test/audit output. The dated cleanup recovery snapshot inside it is intentionally retained; the rest can be regenerated.
- `dist/`, `dist-admin/`, `node_modules/` — generated build output and installed packages, not source of truth.

## Styling: why there are many CSS files

This application uses plain CSS, not CSS Modules. `src/main.jsx` imports one global CSS entry point: `src/styles/index.css`. That file imports the global stylesheets in this order:

1. `styles.css` — original/base application rules.
2. `experience.css` and `partner.css` — customer/partner-specific legacy foundations.
3. `customer-theme.css` — persisted customer theme behavior.
4. `product-polish.css` — product-level polish and compatibility fixes.
5. `style.css` — canonical shared design tokens, icon treatment, and Tailwind utility/theme bridge.
6. `features/home/marketplace-home.css` — customer home layout.
7. `responsive.css` — cross-workspace responsive overrides.
8. `app-redesign.css` — current shared surface/control normalization layer.

The order is significant: global CSS selectors can affect many screens, and a later rule can override an earlier rule when selector specificity is equal. The entry point only centralizes imports; it does not combine or reorder their rules. Its production build was compared with the prior build and emitted byte-identical CSS assets. Feature CSS is imported by its component or page and should use feature-specific class prefixes. Customer and partner shells deliberately have different navigation and information layouts; they share tokens and controls, not one identical page layout.

The current nine global sheets contain about 1,900 rules and 6,100 declarations. A source scan found 36 selectors repeated across more than one sheet, including `:root`, `.phone-shell`, `.sheet`, and customer catalogue selectors. A repeated selector is not automatically a duplicate: it may be a later intentional override or a responsive/state variant. Do not delete or merge these rules until computed styles and representative screen states are covered by regression checks.

`style.css` is the intended token source (`--brand`, `--surface`, `--ink`, spacing, radii and motion) and defines Tailwind semantic names such as `bg-brand`, `text-ink`, `p-eazily-4`, and `rounded-eazily-card`. `DESIGN.md` explains the approved values. Tailwind v4 utilities are enabled through the Vite plugin and scanned only under `src/`; Preflight is deliberately omitted because the existing application already has a global base and resetting it would risk every screen. Existing CSS remains the owner of current layouts and feature themes. Older global styles still contain compatibility aliases and some repeated rules; this is a migration history, not a reason to add another global override. Before changing styling, search for the selector and token across all imported sheets, then edit the owning feature stylesheet where possible.

Some existing CSS files were compressed into one or a few very long lines. They were reformatted for readability without changing selectors, declarations or media rules. The CSS that looks “missing” is generally present but minified or in a feature-local file; imports are explicit in `src/styles/index.css` or the feature component.

### Styling rules for new work

- Put reusable tokens and shared component primitives in `src/style.css` and document a genuine shared design decision in `DESIGN.md`.
- Use Tailwind utilities for new component-level layout/spacing/state when they make the markup clearer; use the semantic Eazily tokens, not arbitrary colors. Do not blanket-convert established feature styles.
- Put page-specific layout in the page or feature stylesheet, not in a new catch-all global file.
- Prefix feature classes (for example `.partner-dashboard-*`) to avoid accidental cross-screen styling.
- Prefer existing CSS custom properties over new hard-coded colors, spacing, shadows and radii.
- Keep responsive and reduced-motion behavior next to the styles whose interaction they change.
- Do not “clean up” a CSS declaration based on its name alone: search all selectors, imports and visual states first.

## Tests and scripts

`package.json` is the command index; [`scripts/README.md`](../scripts/README.md) groups the scripts by purpose. Scripts ending in `-test.cjs`/`-test.mjs` are checks; `*-fixture.jsx` and `*-fixture.html` are test pages, not production UI. `*-browser-test.*` scripts use a local browser/debug endpoint and can leave screenshots/results in ignored output folders. `*-audit.*` scripts inspect state; `staging-*` and `*-deploy.*` scripts are guarded operational tools. See [`src/features/README.md`](../src/features/README.md) for feature ownership and placement rules.

Keep fixtures adjacent to their test conventions for now. The script directory is large because it holds focused regression coverage for product journeys; the filenames, not arbitrary folder moves, are the current discoverability mechanism. Before removing a test or fixture, search package scripts, imports, dynamic imports, CI and documentation references.

## What is intentionally not consolidated yet

- The three workspace shells and their feature navigation have different roles and should not be collapsed into one universal dashboard.
- The global CSS files have overlapping history and order-sensitive overrides. Merging them in one pass could change every screen; first migrate one selector family at a time with browser regression checks.
- Identical images in `docs/**` are often copied across dated visual-review folders. Those are comparison evidence. Runtime assets belong under `public/`; do not remove the evidence copy without checking its report and links.
- The timestamped Supabase migrations, canonical SQL manifest and deployment scripts are governed by the staging runbook. They must not be rearranged as frontend housekeeping.

## Recommended developer workflow

1. Find the route/workspace and feature component.
2. Trace its props/callbacks to the page shell, then its data calls to `src/services/`.
3. Check shared components and design tokens before creating new ones.
4. Make the smallest feature-scoped change; preserve auth, role gates, callbacks and empty/error/loading states.
5. Run the relevant focused test, then lint/build when feasible. For visual changes, inspect phone and desktop widths.
6. Update this guide only when ownership changes; update `DESIGN.md` only for a deliberate shared visual-system decision.
