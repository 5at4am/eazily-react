# Cross-component consistency matrix

| Pattern | Shared reference | Observed consistency / divergence | Evidence and status |
|---|---|---|---|
| Buttons and controls | `design-system.css`, `Ui.jsx`, `DESIGN.md` | Shared 44px minimum and focus styling exist; legacy CSS and feature-local rules create variants | Static review; not all rendered variants compared. |
| Forms | Shared `Field`/form patterns plus feature forms | Visible labels and validation are implemented in multiple feature flows; error semantics vary by feature | Legal browser flow passed; broad field-by-field screen reader verification not run. |
| Cards / surfaces | Surface, divider, radius and elevation tokens | Customer styles increasingly use aliases; partner dashboard CSS includes fixed whites and bespoke pale colors; intentionally distinct operations UI is documented | Source evidence; rendered cross-route comparison blocked for partner home. |
| Navigation | Customer/partner bottom nav; staff navigation | Variants are intentional by workspace and viewport, but each needs its own coverage | Customer responsive checks passed; responsive test later failed a navigation-presence assertion. |
| Dialogs / sheets | Shared sheet patterns in `Ui.jsx` and feature-specific dialogs | Shared behavior exists; full focus-return, escape, nested-dialog comparison not established | Static only except tested legal sheet flow. |
| Icons | `Icon.jsx` inline family; lucide-react usage also exists | Multiple sources may yield inconsistent stroke/size; not necessarily a defect where feature-specific icon needs justify it | Static dependency observation; needs visual sampling. |
| Empty / error / loading feedback | Shared feedback components and route-level states | Component vocabulary exists; copy and action affordance vary by workflow | No complete state-by-state browser sweep. |
| Typography / spacing | `DESIGN.md` scale and `design-system.css` tokens | System is documented; legacy/page-specific rules mean token adoption is partial | Source review only. |

**Rule:** treat documented role/workspace variations as intentional; consolidate only after rendered comparison and behavior review. Do not infer inconsistency solely from different class names.
