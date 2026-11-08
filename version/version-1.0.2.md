# Version 1.0.2 — 2026-11-07

## Vendor-managed listings and pricing

- Safe listings from verified Service Partners, Influencers, and Consultants publish without routine Admin approval.
- Vendors can edit and republish ordinary content and service listings without waiting in the standard review queue.
- Vendors control their service, collaboration, and consultation base prices. Eazily still applies its configured customer pricing, platform fees, and taxes.
- Consultant listings now use the consultant-entered price instead of requiring an Admin-assigned rate.
- Kept partner identity/document verification, legal and assessment requirements, registered categories, subscription eligibility, pricing validation, and booking/payment safeguards.
- Flagged contact/payment content, suspicious duplicates, incomplete listings, unregistered services, and unsafe media remain held for safety review.
- Updated partner copy and statuses to explain publishing and safety checks instead of routine approval.
- Added forward-only migration `supabase/migrations/20261107000100_vendor_managed_listings.sql` (also sourced by `supabase/vendor_managed_listings.sql`).

## Verification

- `npm.cmd run test:service-posting` — passed.
- `npm.cmd run test:influencer-flow` — passed.
- `node scripts/consultant-flow-test.cjs` — passed, including vendor-set base price calculation.
- `npm.cmd run test:source` — passed.
- `npm.cmd run test:partner-navigation:browser` — passed.
- `npm.cmd run build` — passed.
- `npm.cmd run lint` — no errors; one existing Fast Refresh warning in `scripts/service-partner-verify-mobile-fixture.jsx`.
- `npm.cmd run test:service-posting:browser` — blocked at its first dashboard assertion because its fixture remained on the sign-in screen; posting-form screenshot inspection was therefore not completed.
- The migration is prepared locally and has not been applied to hosted Supabase.
- The existing sequence-55 `admin_capability_retirement.sql` migration disables authenticated Admin/staff actions in this workspace. A moderation operator must be restored before flagged listings can be actioned; this separate access change was left untouched.
