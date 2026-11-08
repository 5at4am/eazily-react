# Version 1.0.1 — 2026-11-07

## Partner navigation header

- Removed the non-functional workspace-switch button from partner headers.
- Removed the duplicate profile avatar; profile remains accessible from the existing navigation.
- Kept notifications as the sole right-side header action, positioned at the far right with a transparent background and no border.
- Reduced header spacing and title/context typography to make more page content visible.
- Preserved the back button on secondary partner routes and kept notification controls at a 44px touch target.
- Applied the compact header treatment to Service Partner, Influencer, and Consultant interfaces.
- Updated partner navigation browser assertions for the removed switch and unfilled notification control.

## Verification and visual review

- `npm.cmd run test:partner-navigation:browser` — passed.
- `npm.cmd run test:responsive:browser` — passed before the final CSS specificity fix.
- `npm.cmd run test:source` — passed.
- `npm.cmd run lint` — passed with one existing Fast Refresh warning in `scripts/service-partner-verify-mobile-fixture.jsx`.
- `npm.cmd run build` — passed.
- Visual review: captured and reviewed partner workspace screenshots at phone (390px) and desktop (1280px) widths. The compact title/context stack and right-aligned outline-free bell render correctly; the phone layout fits without horizontal overflow and the desktop header spans the content width cleanly.
- Fixture caveat: the desktop screenshot also shows the isolated test fixture's invalid UUID retry message; this is fixture data, not a header rendering issue.
