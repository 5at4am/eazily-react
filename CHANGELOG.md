# Changelog

All notable changes to the Eazily customer & partner app (`eazily-react`) are documented here.

## [1.19.4] - 2026-11-08

### Added
- **Professional hero parallax** — the home hero now responds to scroll with layered depth: the background art, promotion card, and foreground imagery move at different speeds for a polished, sense-of-depth feel. Uses the existing campaign imagery, runs on a scroll/RAF throttle, and is fully disabled under `prefers-reduced-motion`.
- **Parallel staggered reveals** — the "to-do list" discovery grid now fades/slides in with a per-card stagger when it scrolls into view (skipped for reduced-motion users).

## [1.19.3] - 2026-11-08

### Changed
- **Profile screenshot follow-up** — reduced section gaps, consolidated profile statistics into one compact strip, constrained header actions to readable 44px-minimum targets, softened the secondary action, and improved menu-label hierarchy and supporting-text readability.
- **Profile header compressed** — the vendor profile card is now a tight block: 36px avatar, smaller role/name/location type, and the verified/reviews status moved inline under the name. The Edit/View actions sit as a compact side-by-side row, so the header no longer takes a large vertical slab. (Location line also uses a proper "·" separator.)

## [1.19.2] - 2026-11-08

### Changed
- **Vendor profile hero avatar reduced again** — the initials tile went 48px → 40px with a smaller radius and 14px initials; the name size was tightened so the identity text and actions lead the view, not the icon (applies to all roles).

## [1.19.1] - 2026-11-08

### Changed
- **Profile hero avatar smaller** — the vendor profile initials/photo tile was reduced from 68px → 48px with a tighter radius, and the hero card is more compact so the identity text and actions read as the focus rather than the icon.

## [1.19.0] - 2026-11-08

### Changed
- **Human-readable order statuses** — job cards and filter chips now show "Requested / Accepted / Active / Awaiting confirmation / Completed / Cancelled / Disputed" instead of raw database values.
- **Clearer names** — profile menu items renamed for consistency: "Enquiries & leads", "Documents & verification", and "Switch to customer home"; section titles and descriptions kept consistent across roles.

## [1.18.1] - 2026-11-08

### Fixed
- **Vendor offers query column bug** — the Jobs load referenced `service_booking_offers.created_at`, which doesn't exist; it now orders by the real `offered_at` column. Quick-accept gating loads correctly again.

### Changed
- **Profile menu trimmed to essentials** — removed the standalone "Payment History" row (transaction history is now described inside the Earnings tile), leaving My Work (Business, Services, Leads, Orders, Growth), Money & Membership (Earnings, Rewards, Subscription), Messages, and Account & Support.

## [1.18.0] - 2026-11-08

### Added
- **Expired-offer transparency on job cards** — a requested professional job without a live offer now shows an amber "Offer expired — open to review" note instead of silently missing the Quick accept button.

### Changed
- **Quick accept is double-tap-safe** — a per-job lock prevents duplicate accept calls, shows "Accepting…" while in flight, and releases on completion/failure.

## [1.17.0] - 2026-11-08

### Added
- **Starter descriptions for posting** — when creating a service, the form now offers a one-tap "Insert starter description" (service-specific, editable) so new/inexperienced vendors don't have to write from a blank box.

### Changed
- **Order detail accept** — for professional requests with a valid offer the primary action is now a clear green "Accept at listed price" button (Reject stays secondary), matching the one-tap Quick accept on the Jobs list.

## [1.16.1] - 2026-11-08

### Fixed
- **Quick accept no longer errors on requests without an active offer.** The Jobs list now loads the partner's offered/unexpired offers and only shows the green Quick accept button when a valid offer exists (previously it called the accept RPC and hit "Current unexpired Service Partner offer required").

## [1.16.0] - 2026-11-08

### Added
- **Quick accept on job cards** — professional vendors can accept a request in one tap right from the Jobs list (green Quick accept button) without opening the full order sheet; it uses the same safe accept RPC and respects offer availability/expiry server-side.
- **Plain-language money line on the dashboard** — approved vendors now see "You can withdraw ₹X · Pending ₹Y" in one glance, instead of having to interpret financial states.

### Changed
- Job cards are now keyboard-accessible (Enter/Space opens) with the quick action as a nested button so it doesn't navigate.

## [1.15.0] - 2026-11-08

### Changed
- **Vendor profile menu hub reworked** — the Profile page now groups actions into clear sections (My Work, Money & Membership, Messages, Account & Support) with descriptions on every row, so each tile explains where it goes.
- **Removed duplicate redirects** — same-destination rows were merged (e.g. "My Posts" + "My Services" → one Services entry; influencer "Enquiries" + "Active Collaborations" → one Collaborations entry; consultant "Availability" + "Appointments" → one Appointments entry).
- **Live stat chips** — under the profile hero: Orders count, Needs-action (requested) count, and Reviews (when present), each one-tap deep-link.
- **Notifications row shows an unread badge line** ("2 unread") directly in the menu; Money & Membership rows gained descriptions.

## [1.14.0] - 2026-11-08

### Added
- **Request photos** — customers can attach up to 3 images (JPG/PNG/WebP) to a professional booking. Files upload to a private `request-media` bucket owned by the customer and are readable by the linked partner once the order exists; references are stored on the private booking intake.
- **Vendor photo gallery** — the order detail now shows the customer's request photos in a tappable grid (opens the full image in a new tab). Photos are visible to the owner, the assigned partner, and staff.

### Changed
- Backend: migration 65 adds the bucket, storage RLS policies (owner all; participant read by idempotency-key match), an intake `photos` column, and extended `request_professional_booking_with_intake` / `get_service_booking_intake` signatures (backward compatible).
- Booking sheet: photo picker with thumbnails, removal, and a 3-photo cap.

## [1.13.0] - 2026-11-08

### Changed
- **Vendor Jobs page redesign** — the orders list now uses filter chips with live counts (All / Requested / Accepted / Active / Completed / Cancelled) instead of a dropdown, plus a search field with icon. Each job is a richer card: title + service/category, reference, color-coded status chip, date (with "Today …" and overdue highlighting), and a chevron.

## [1.12.0] - 2026-11-08

### Added
- **Tappable metric cards** on the vendor home — Today's/Total earnings open the Earnings sheet, Jobs opens Orders, and the rating opens Profile.
- **"Post a service" shortcut** for approved partners even when they already have a published service.
- **Unapproved-state preview** — while verification is pending, the notice now lists what unlocks after approval (accept requests, publish services, verified payouts).
- **Urgency line** on the "Needs action" queue (e.g. "Earliest deadline today at 2:00 PM").
- **Coaching hints** — "Complete 1 booking to get rated" for new sellers and a slow-accept-rate tip.

### Changed
- Removed the duplicate "See all" (Orders) from the Confirmed jobs header when the Needs-action queue is already showing it.

### Fixed
- Vendor home blank/error page: a declaration-order bug (`acceptRate` referenced before initialization) crashed the dashboard render; reordered so the page renders again.

## [1.11.0] - 2026-11-08

### Added
- **"Needs action" queue on the vendor home** — new job requests and price approvals are now unified into one section right under Overview, with a total count, the soonest deadline, and one-tap open. It answers "what should I do now?" at a glance instead of scattering items across separate blocks.

### Changed
- Removed the separate "New job requests" and "Waiting for customer price approval" blocks in favour of the unified queue; Confirmed jobs remain distinct below.

## [1.10.0] - 2026-11-08

### Added
- **Rich vendor notifications** — partner notifications (bell sheet + profile "Booking updates") now show a descriptive body, e.g. "AC Service · Requested · awaiting professional", instead of only the short title. When a notification links to an order, the body uses that order's title and status; otherwise a sensible plain-language fallback explains the action.

### Changed
- **Vendor home profile card** — removed the "Edit" button next to the profile; the card is now a clean, read-only identity/verified/level presentation. Editing remains available through Profile and the registration flow.

## [1.9.0] - 2026-11-08

### Changed
- **Rich notification content** — notification items now read like a real app: each shows a descriptive message (for example "Painting was accepted. Agree the final scope before work begins." or "We are looking for a professional for AC Service in Bhopal.") instead of only a status word. Booking, order, and wallet events each generate human sentences from the real record; the status/amount remains available as a secondary label.

## [1.8.0] - 2026-11-08

### Added
- **Server-persisted seller levels** — migration 64 adds a stored `level` column on partner applications, maintained by a trigger when an order completes (with a one-time backfill), and exposes it through a public read-only `customer_professional_levels` view. Levels are now authoritative server-side, not just computed in the UI.

### Fixed
- **Chat switching (vendor/customer)** — on desktop (≥900px) the conversation list is now a persistent left pane beside the thread, so you can switch between customers with one tap instead of being stuck in a single thread. Mobile keeps the slide-over thread with the back affordance.
- Chat composer: textarea auto-resizes (up to 112px) and keeps focus after sending; conversation date dividers now render as proper centered pills instead of unstyled paragraphs.

## [1.7.0] - 2026-11-08

### Added
- **Package-aware pricing estimate** — `service_booking_estimate` now accepts an optional package and calculates the quote using that package's price (fee/tax math unchanged). The booking sheet re-quotes when a package is selected, so the price shown before booking matches the package the customer picks.
- **Public seller badge** — professional profiles now show a level badge (Level 1 / Level 2 / Top Rated) computed from publicly visible completed-work and rating data, so customers can see standing at a glance.

### Changed
- Backend: migration `20261108000600` (service package estimation) applied live; the single-argument estimate remains for compatibility. Level logic adds `computePublicLevel` (public-safe, no private accept-rate data).

## [1.6.0] - 2026-11-08

### Added
- **Seller levels/badges** — approved partners now see a level on their dashboard profile card (New seller → Level 1 → Level 2 → Top Rated) derived from completed work, average rating, and accept rate.
- **Weekly earnings chart** — the growth view shows a quiet bar chart of the last 8 weeks (available/pending/paid net of reversals).
- **Optional service packages** — postal can add up to three packages (name, price, what's included) when creating a service; packages are shown as cards on the professional profile, and customers choose one before booking (the selection travels with the request).
- **Post-accept details** — accepted bookings show a "Share details with professional" call-to-action that opens secure messages, so final visit details can be exchanged after acceptance.
- **Server-side notification read-state** — new `customer_notification_read_state` table + `record_customer_notifications_seen()` RPC (applied live, migration 62). The notifications badge/panel now persist their "seen" baseline on the server, with local fallback, so unread state is consistent across devices.

### Changed
- Notifications module split: pure aggregation logic (`customerNotifications.js`) stays offline-testable; server read/write lives in `customerNotificationsServer.js`.

## [1.5.0] - 2026-11-08

### Added
- **Vendor dashboard pipeline strip** — under Overview, approved partners now see live counts for Requested/New, Active, and Completed bookings (role-aware labels for influencers/consultants). Each chip opens the orders view.
- **Accept rate chip** — once a partner has at least three decided requests, a fourth chip shows their accept rate (accepted ÷ decided), opening the insights/growth view for details.

### Changed
- Overview metrics remain 2×2; the pipeline sits below them as a compact, quiet strip using role accent + status colors.

## [1.4.0] - 2026-11-08

### Added
- **Customer notifications hub** — a Notifications panel in the account area aggregates recent activity from your service requests, partner bookings, and wallet ledger into one recency-sorted timeline. Each item shows an icon, title, status/amount, and time, and deep-links to My Bookings or the Wallet. Unread items are marked with a dot, a count badge shows on the account shortcut, and "Mark all as seen" sets your baseline.
- **Notifications shortcut + badge** — the account shortcuts and the customer drawer now include Notifications; the shortcut shows a live unread count.

### Changed
- Notifications are derived read-only from existing customer records (no new backend writes); the unread baseline is stored locally per account.

## [1.3.0] - 2026-11-08

### Added
- **Professional search** — the Home search now searches across professionals by name, business name, city, and specialisation (not just catalog labels). Matching professionals appear in a "Professionals" group under the category results and open straight into their profile.
- **Filter panel on the professionals list** — a Filters control opens a compact panel (minimum rating, maximum starting price, available-now, identity-verified) with an active-filter chip row and a one-tap "Clear all". Sort (highest rated / lowest price) stays one tap away.

### Changed
- The old three stacked filter controls on the service page were replaced by the panel + chips pattern; active filters are now visible and removable without reopening the panel.

## [1.2.0] - 2026-11-08

### Added
- **Rating breakdown** on professional profiles — a 1–5 star distribution bar (with counts) appears above the customer reviews list, so shoppers can judge review quality at a glance, not just the average.
- **Booking journey timeline in order detail** — the partner-order detail sheet now shows the same 3-segment progress strip (Requested → Accepted → Completed) that appears on the My Bookings list, so opened bookings still communicate where the request stands.

### Changed
- Professional profile review section: average-star stat plus a visual distribution; reviews continue to show only completed, moderated Eazily bookings.

## [1.1.0] - 2026-11-08

### Added
- **Guest browsing** — customers can explore categories, services, and professional profiles without an account. Sign-in is only required for booking, messaging, saving, and account panels.
- **Pending-intent resume** — an action that needs sign-in (booking, request, message, panel, route) is stored for 20 minutes; after signing in, the user returns to exactly where they were instead of the Home screen.
- **My Bookings panel** — proper sign-in and empty states with a "Browse services" action, review deduplication with "awaiting moderation" copy, and a rebook action for completed professional bookings.
- **Inline cancellation reason** — replaced the old `window.prompt` flow with an inline reason field + confirm/keep buttons.
- **Booking success screen** — shows an `EAZ-XXXXXXXX` reference, the 30-minute response window, a "What happens next" explainer, and a primary "View my bookings" CTA.
- **Professional profile booking CTAs** — always-visible "Book this service" (top) and sticky "Continue to booking" (bottom) actions.
- **Service-match response window** — the configured 30-minute response window is surfaced to customers in booking copy.
- **Booking OTP fix** — pgcrypto (`crypt`, `gen_salt`, `digest`) resolves on hosted Supabase via the `extensions` schema in affected functions' search paths.
- **Future-date validation** — booking/request forms validate future dates and set `min` on date inputs.

### Changed
- **Booking form UX** — preferred date is prefilled to tomorrow; the redundant summary card is condensed to one line; the backup opt-in now shows in plain English only when backup matching is actually available; the price block falls back to the published/starting price instead of showing "unavailable".
- **My Bookings journey visibility** — each booking card now shows a quiet 3-segment progress strip (Requested → Accepted → Completed) so customers can see where a request stands at a glance.
- **Service posting stepper** — replaced the thin progress bar and "Step X of 3" text with a labeled 3-segment stepper (Service · Fees · Photos & publish) that highlights the current step using the shared brand tokens.
- **Testing** — offline regression suite is green again: booking-conversion metrics updated for the redesigned dashboard, staging chain now applies migrations 1–61 (including the new admin migrations), esbuild image loaders added to art/motion browser fixtures, and an orphaned alert test removed.

### Backend
- Added `20260901004900_consultant_assessment_admin_review.sql` — `admin_list_consultant_assessment_reviews()` and `admin_approve_consultant_assessment_bank(uuid,text)` (audited, bank stays inactive until a separate activation decision).
- Added `20260901005000_admin_service_catalog_workflow.sql` — catalog groups/services tables seeded with the current taxonomy, plus `admin_catalog_snapshot()`, `admin_request_catalog_change(...)`, and `admin_review_catalog_change(...)`. Staff propose; main admin approves/rejects; all decisions audited.
- Both migrations are applied to the live Supabase project and recorded in `supabase_migrations.schema_migrations`.
