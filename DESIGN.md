---
version: alpha
name: Eazily
description: A clear, dependable marketplace for Indian customers, independent partners, and operations staff.
colors:
  primary: "#6D28D9"
  secondary: "#0D7C66"
  accent: "#F2A413"
  background: "#F4F2FB"
  surface: "#FFFFFF"
  surface-soft: "#F5F3FB"
  text: "#19172C"
  text-muted: "#53546A"
  border: "#8A8175"
  divider: "#E1DEEC"
  success: "#15803D"
  warning: "#B45309"
  danger: "#C22525"
  on-primary: "#FFFFFF"
typography:
  page-title:
    fontFamily: Manrope
    fontSize: 21px
    fontWeight: 800
    lineHeight: 1.25
  section-title:
    fontFamily: Manrope
    fontSize: 17px
    fontWeight: 800
    lineHeight: 1.35
  body:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  micro:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  supporting:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  small: 8px
  control: 10px
  card: 14px
  panel: 16px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
components:
  primary-button:
    backgroundColor: "#6D28D9"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    height: 48px
    padding: 16px
  card:
    backgroundColor: "#FFFFFF"
    textColor: "#19172C"
    rounded: "{rounded.card}"
    padding: 16px
  supporting-copy:
    backgroundColor: "#FFFFFF"
    textColor: "#53546A"
    typography: "{typography.supporting}"
  soft-surface:
    backgroundColor: "#F5F3FB"
    textColor: "#19172C"
  control-outline:
    backgroundColor: "#FFFFFF"
    textColor: "#19172C"
  service-availability:
    backgroundColor: "#FFFFFF"
    textColor: "#15803D"
  attention-state:
    backgroundColor: "#FFFFFF"
    textColor: "#B45309"
  destructive-state:
    backgroundColor: "#FFFFFF"
    textColor: "#C22525"
---

## Overview

Eazily connects Indian customers with vetted local service professionals and other independent partners. Customers discover and book services; partners handle enquiries, bookings, profiles, and earnings; staff manage marketplace operations. Most sessions are mobile-first and may run on mid-range Android devices. The system uses bright working surfaces, strong ink, and deliberate brand/role colors. Partner Home takes its lilac accent from the supplied “Daily work / Business growth” reference. Manrope is bundled with the app and supports the product's Latin-script UI; retain the system fallback for other scripts.

## Colors

These values map to the existing custom properties in `src/design-system.css`; partner dashboard aliases in `src/features/partners/partner-dashboard.css` must use those shared values rather than introducing a parallel palette. Primary purple is for actions, active navigation, and key icons—not decorative gradients. Green remains the service professional's availability/confirmation color. Amber is reserved for rewards and attention. Body copy uses ink or muted ink on white/lilac; muted text remains readable and is not used for disabled states alone. The staff operations console intentionally keeps its stable light palette independent of the customer's persisted theme.

Contrast checks use WCAG relative luminance: `#19172C` on white is 17.3:1; `#53546A` on white is 7.0:1; `#6D28D9` on white is 7.1:1; white on `#6D28D9` is 7.1:1; `#15803D` on white is 5.0:1; `#B45309` on white is 5.0:1. `#8A8175` is a control outline on white (3.6:1); `#E1DEEC` is divider-only and must not communicate an interactive boundary.

## Typography

Use the bundled Manrope variable font. Use 21–24px page headings, 17–18px section headings, and 14–16px body, form-label, and supporting text. Reserve 12px for genuinely secondary metadata and navigation labels; never use smaller text for essential content. Values and status must remain understandable at 200% zoom and with Hindi translations.

## Layout

Customer discovery is a storefront: location and search first, service categories next, then real offers and professionals. Phones stay a single-column flow; customer screens expand to a 1200px content shell on tablets and desktop. Partner workspaces and registration expand into a centered, readable content area from 600px while retaining the familiar bottom navigation. Staff uses labelled desktop navigation, a compact tablet rail, and a horizontally scrollable mobile navigation strip. Preserve safe-area insets and keep sheets within the viewport; center them on larger screens. Breakpoints are 359px for narrow phones, 600px for workspace expansion, 700px for the staff desktop shell, 768px for centered dialogs and marketplace columns, and 900px for welcome-screen composition. Use the existing 4/8/12/16/20/24/32px spacing rhythm and 44px interactive targets.

## Elevation & Depth

Use white surfaces against a very light lilac background. Reserve subtle shadows for separation from the canvas; do not add nested raised cards, glows, blur, or glass effects. Border hierarchy is meaningful: stronger outlines for controls, soft dividers for non-interactive list separation.

## Shapes

Use 8px for compact chips, 10px for controls, 14px for cards, and 16px for larger panels. Avoid pill-shaped cards; pills are appropriate only for toggles, counts, and compact status badges.

## Components

- Buttons: solid purple filled primary actions; white outlined secondary actions; text actions for low-priority navigation. Use clear verbs, sentence case, visible hover/pressed/focus/disabled states, and at least 44px touch height. Keep role colors for availability and role-specific status, not every primary action.
- Forms: persistent visible labels, readable values, 44px minimum controls, and adjacent hint/error text linked with `aria-describedby`. Invalid fields expose `aria-invalid` and an actionable error message.
- Cards: one surface per content group. Incoming requests may receive a restrained purple border to distinguish the actionable queue.
- Navigation: customer and partner navigation use the existing five-item bottom bar on phones, with an active icon/label, keyboard focus, and safe-area inset. The staff console keeps labelled desktop navigation and collapses it responsively. Do not hide essential actions behind hover.
- Dialogs and sheets: preserve existing shared sheet behavior, focus handling, close affordance, and mobile sizing.
- Iconography: use the existing inline SVG family in `src/components/Icon.jsx`; label icon-only controls. Do not use emoji as icons.
- Interaction motion: use `--duration-fast` (120ms), `--duration-standard` (180ms), and `--duration-panel` (240ms) with `--ease-interaction`. Hover feedback is for fine pointers; press feedback is a restrained 0.985 scale. Drawer/sheet movement and toast fades explain state changes. Do not add entrance choreography or a second animation library. Reduced-motion users retain color/state feedback without movement.

## Do's and Don'ts

- Keep real data, approval gates, booking callbacks, and availability behavior intact when restyling.
- Keep clear empty, pending-verification, success, and error states; status is communicated by text/icon as well as color.
- Empty states should name the next useful action when one is available; connection and loading notices must not obscure the work surface.
- Respect `prefers-reduced-motion`; animate only purposeful state changes and avoid layout-shifting motion.
- Never use arbitrary fabricated metrics, purple-blue gradients as decoration, excessive card nesting, tiny supporting copy, low-contrast control boundaries, or clipped horizontal chip rows.
- Preserve role-specific identity colors while using the shared purple dashboard accent where the reference calls for it.
