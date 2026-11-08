# Shared components

`src/components/` contains UI used by more than one feature. Keep behavior and reusable markup here; keep workspace navigation composition in its component and screen-specific layout beside its feature.

## `Ui.jsx`

| Component | Purpose | Contract to preserve |
| --- | --- | --- |
| `Button` | Shared action with `primary` or `outline` visual variant | Forwards native button props; defaults to `type="button"` so it cannot submit a form accidentally. Pass `type="submit"` when a form action should submit. |
| `Field` | Labelled input, select, or textarea | Keeps the visible label, generated ID, hint/error relationships, `aria-invalid`, and native input props. |
| `Sheet` | Mobile-first modal sheet | Owns body scroll lock, Escape/back handling, focus restoration/trap, and close behavior. Keep its DOM role and event lifecycle intact when styling. |
| `BottomNav` | Customer/partner navigation bar | Receives routes/actions through props and reports unread messages; it does not own workspace authorization. |
| `SearchBox` | Shared customer service search control | Controlled by `value` and `onChange`. |
| `Toast`, `EmptyState`, `Brand` | Shared status, no-content, and identity presentation | Keep messages translated and action callbacks explicit. |

`Icon.jsx` is the existing inline SVG icon family. Use its named icons instead of emoji or a second icon dependency. Decorative instances are hidden from assistive technology; meaningful icons need a visible label or accessible name on their control.

## Styling ownership

- `src/style.css` is the shared design source: semantic color/theme tokens, typography, spacing, radii, elevations, icon defaults and Tailwind v4 theme mappings.
- Tailwind is wired through the Vite plugin. Its source scan is limited to `src/`; Preflight is excluded to avoid resetting the established app. Use semantic utilities (`bg-brand`, `text-ink`, `p-eazily-4`, `rounded-eazily-card`) for small, local component layout/state needs.
- Shared primitives in `Ui.jsx` use the `ui-*` class hooks declared in `src/style.css`. Existing class hooks such as `field`, `btn`, and `sheet` stay in place as compatibility/style variants while features are migrated gradually.
- Component-owned composition, such as `CustomerNavigation` and `CustomerDrawer`, remains in the adjacent stylesheet imported by that component. Do not move it into global CSS merely because the component is reusable within one workspace.
- Feature screens keep their own scoped CSS. A Tailwind class is not a reason to move business-specific layout or role color into the shared design file.

When adding a reusable interaction, first identify its behavior and states, then add the smallest primitive API and shared hook. Preserve native semantics, visible focus, disabled/loading/error states, reduced-motion behavior, and narrow-screen sizing. Avoid dynamic Tailwind class construction; map variants to complete class names.
