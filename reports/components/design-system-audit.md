# Design-system audit

**Status: IN_PROGRESS — static review complete; browser coverage partial.** This is an audit of the current implementation, not a claim of conformance for every rendered component.

## Baseline from project documentation and source

| Area | Current system | Assessment |
|---|---|---|
| Framework / styling | React 19 + Vite; plain CSS and custom properties, with Tailwind v4 and a small shadcn/Radix primitive set | Existing architecture is coherent enough; avoid introducing another component or animation framework. |
| Routing / state | View-state routing in `src/App.jsx`, workspace path mapping in `src/lib/workspace.js`; React state/context, Supabase | Route and role gates are business-critical; preserve. |
| Palette | `src/design-system.css`: brand purple, semantic success/warning/danger, role colors, surface/ink/divider aliases; a persisted customer dark theme | Strong semantic foundation. Some partner dashboard declarations hard-code white/light colors, which needs verification in the actual theme context. |
| Typography | Self-hosted Poppins headings and DM Sans body/control, Devanagari fallback documented in `DESIGN.md` | Defined hierarchy; legacy/page-specific rules remain in the broader stylesheet surface. |
| Spacing / shape | 4/8/12/16/20/24/32/48px spacing; 8/10/14/16px radii; 44px control target | Clear documented baseline and shared tokens. Adoption is not universal across legacy/page CSS. |
| Iconography | Hand-built inline SVG family in `src/components/Icon.jsx`; `lucide-react` also present in dependencies/source | Two icon sources are present; audit visual consistency and accessible names where both are used. |
| Motion | CSS transitions and reduced-motion rules in shared and feature styles | Reduced-motion support exists in inspected styles; not exhaustively verified for every component. |
| Primitives | Shared hand-built components in `src/components/Ui.jsx`; Tailwind/shadcn primitives under `src/components/ui/` | Avoid duplicate primitives; static search found no imports/usages for `select.jsx` or `tabs.jsx` in `src` at audit time. Confirm before deleting. |

## Consistency baseline

Follow `DESIGN.md`: semantic tokens, readable labels, 44px targets, visible keyboard focus, one purposeful surface per group, role color reserved for status/identity, reduced-motion support, and safe-area-aware mobile navigation. Keep intentionally independent surfaces (notably the operations console) distinct where documented.

## Verified risk / follow-up

`src/features/partners/partner-dashboard.css` contains hard-coded `#fff`/white surfaces and fixed pale color values in dashboard rules (for example lines 9, 15, 28, 56, 64, 85). The shared theme layer has customer-dark selectors, but authenticated partner role/theme rendering was not verified with a clean fixture. Track as **P2, needs rendered verification**, not as a confirmed user-visible dark-mode defect. Do not globally replace colors until the route/theme contract is confirmed.

## Limitations

Token coverage and route/component relations in `component-inventory.json` are static and approximate. A component's listed token set may include tokens from imported CSS, not only declarations it renders. No automated axe/Lighthouse/Storybook suite is configured in `package.json`; WCAG status is therefore not a whole-app certification. See the functional, visual, accessibility, and responsive audits for executed browser evidence and gaps.
