# App status — 22 October 2026

> Superseded authentication status: Google and email OTP now replace phone verification. See [current setup](GOOGLE-EMAIL-AUTH-SETUP.md).

> Update 23 October 2026: the shared `send-sms` function is deployed but remains
> disabled (`EAZILY_SMS_PROVIDER_ENABLED` is not true) and the hosted Phone
> provider is still off. The hook code now supports capcom6 for staging; see
> [SMS-CAPCOM6.md](GOOGLE-EMAIL-AUTH-SETUP.md). This dated report is otherwise unchanged.

The home page has six custom generated promotional images in total: the original hero plus five new service photographs. Five new images cover cleaning, AC care, electrical work, moving, and beauty. Four promotional slides and four service collection cards use these images. Images are imported through Vite so production builds include them, and collection photos load lazily. Generated people are not used for actual provider identities, reviews, or work samples.

The built-in image generation tool produced the assets. Exact prompts and saved paths for the five additions are in `home-campaign-images.json`. The optimized JPEGs are in `src/features/home/campaign/`; sizes range from 134,319 to 185,758 bytes. The original optimized hero is in `src/features/home/eazily-home-editorial.jpg`.

## Verified

| Check | Evidence | Limit |
| --- | --- | --- |
| Production build | `npm.cmd run build` passes; all six JPEGs appear in the output. | Does not verify rendered layout. |
| Source compilation | App and seven JSX fixtures resolve and compile. | Compilation does not prove click interactions work. |
| Existing offline regression tests | 17 suites pass: account/auth rules, database rules, seller flows, legal and registration rules, posting, realtime/chat logic, catalogue/discovery, and customer bookings. | These are local tests; they do not prove live message delivery or booking completion. |
| Connection recovery | Existing test passes for ambiguous writes, expired sessions, and account permissions. | No real device network interruption was tested. |
| Hosted backend metadata | Read-only audit finds no missing names among 64 referenced database functions and 56 table/storage names. | Object existence does not verify every permission, record, or business outcome. |
| Hosted authentication settings | Email enabled; phone and Google disabled. | No real login or email delivery was attempted. |

## Confirmed unavailable or incomplete

| Feature | Finding |
| --- | --- |
| Phone OTP | Hosted phone provider disabled, `send-sms` endpoint returns 404, local SMS provider flag disabled, local hook signing secret missing. No SMS was sent. |
| Google sign-in | Hosted Google authentication provider disabled. |
| Android background push | Customer and partner notification screens explicitly say background push is not configured. In-app updates are separate. |
| Saved payment methods | Add-payment-method control is disabled because its secure provider flow is not configured (`ProfileDetails.jsx`). |
| Receipt download | The current receipt action only explains that a provider invoice must be attached (`ProfileDetails.jsx`). |
| Paid influencer collaborations and consultant sessions | The live role marketplace exposes unpaid enquiries and states official payment setup is pending (`RoleMarketplace.jsx`). |
| Role marketplace review control | “View All Reviews” has no action handler in `RoleMarketplace.jsx`. |

Referral and partner rewards are configuration-dependent. The code displays an unavailable message unless the relevant programme is enabled; current programme state was not verified.

## Fixed during this update

- Replaced home-page sample “saved addresses” with an explicit city-entry form.
- Replaced the home-page add-address placeholder with navigation to the existing address-management screen.
- Removed the home-page GPS action that obtained permission without resolving a service city. The selector now clearly asks for a city.
- City confirmation uses the entered city consistently and rejects blank input, instead of silently falling back to Bhopal.
- Corrected the malformed apostrophe in the service-section title.

Address persistence itself still requires an authenticated account and was not exercised live.

## Not verified

BrowserOS tools are unavailable in this session. Rendered appearance, keyboard navigation, mobile breakpoints, and real click flows have not been browser-verified. The browser-only partner registration test was skipped.

No real customer booking, professional acceptance, chat delivery, payment, webhook, refund, payout, document upload, Android installation, or push delivery was performed. General service checkout has a Cashfree integration in source, but its live operation was not verified. The app is not yet verified as production-ready end to end.
