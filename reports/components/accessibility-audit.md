# Accessibility audit

**Standard: WCAG 2.2 AA target. Status: PARTIAL static review; not a conformance claim.**

## Positive source evidence

- `DESIGN.md` specifies visible focus, persistent labels, linked hint/error text, `aria-invalid`, 44px minimum targets, and reduced-motion behavior.
- `src/design-system.css` defines shared `:focus-visible` outlines and reduced-motion rules; inspected drawer code uses a labelled dialog and a labelled close button.
- Partner dashboard CSS sets visible focus outlines and 44px controls in several selectors.
- Contrast values documented in `DESIGN.md` include ink/muted/brand/status foregrounds on white. Those values do not establish contrast for every role color, state, theme, or actual rendered pairing.

## Gaps / verification needed

- No axe-core/Lighthouse automated accessibility suite was found in configured package scripts.
- No systematic keyboard-only traversal, screen-reader announcement, focus trap/return, 200% zoom, text scaling, or touch-target measurement was completed across every route.
- Audit inventory keeps all component accessibility statuses `NOT_TESTED`; route-level browser coverage must not be interpreted as component-level accessibility verification.
- Validate role-specific status colors and dark-theme pairings in actual rendered contexts. Keep status conveyed by text/icon as well as color.

## Priority checks

1. Authenticated partner dashboard: keyboard traversal, switch semantics, notifications, dialog focus behavior, and theme contrast.
2. Customer drawer and sheets: open/close by keyboard, focus containment/return, Escape behavior, nested views.
3. Every form family: programmatic labels, error association/announcement, invalid state, and focus to first error.
4. Responsive navigation: target size and labels at narrow widths and 200% text zoom.
