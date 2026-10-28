# Eazily product readiness — 2026-10-11

> Superseded authentication status: Google and email OTP now replace phone verification. See [current setup](GOOGLE-EMAIL-AUTH-SETUP.md).

The current release builds and is connected to development project `rujrweqttrqdmkkbamjt`. It is not yet approved for public launch. Twilio is expected from the owner in approximately two days; SMS remains disabled until configured and tested.

## Implemented in this pass

- Repeated sign-in events for the same account preserve mounted forms and private drafts. Account changes remount the customer workspace to clear another identity's cached UI.
- Account access refreshes when the network returns. An accessible notice explains offline, reconnecting and failed account updates and provides a retry.
- Chat conversations keep separate draft state, including when device session storage is restricted. Messages typed while an earlier message sends are preserved. Send/upload locks prevent overlapping submissions; failed message retries retain their operation key.
- Booking forms reject offline submission, retain form state and show persistent errors. Rebooking retains its operation key after uncertain failures instead of creating another request on each retry.
- Service cancellation reloads server records instead of inventing a cancelled state on the client.
- Profile avatar previews clear when the avatar is removed and discard stale download responses.
- A rendering failure shows a recovery screen instead of a blank app.
- Network errors advise checking saved history before retrying an uncertain write. Permission and expired-session errors give an action users can take.
- Focus indicators, control borders, chat touch targets, long references, toast wrapping and reduced-motion behavior were improved. The existing visual identity is retained.
- Current web assets were rebuilt and synced into Android, replacing the previous bundle with no configured project URL.

## Verification

Seventeen non-browser functionality suites passed. The partner-registration browser suite was explicitly skipped because BrowserOS Neo tools are not connected. Targeted Auth, booking-history and chat suites also passed after the final changes. Lint has no errors and one pre-existing fixture warning. Production build and Capacitor Android sync pass.

The earlier live database report is `DATABASE-TEST-2026-10-11.md`: twelve groups passed, including profiles, addresses, preferences, partner drafts, service requests, support/replies, Storage, sessions and account isolation. Earlier transport inconsistencies are recorded there; no reliability guarantee is inferred from a successful retry.

No browser screenshots, responsive layout verification, device session tests or full hosted accepted-booking journey were completed in this pass. Visual and interaction changes still require browser/device review before publishing. Local chat tests cover role isolation, idempotent messages, unread/read, blocking, reports and attachments; they do not prove live push delivery.

## Remaining launch gates, in order

1. Configure custom SMTP privately and repeat real email delivery and email-change verification. Previous send returned an email rate limit.
2. Configure Twilio privately, enable Phone, then test SMS delivery, confirmation and linking to an existing email account. No fake verified number or test bypass should be used for public onboarding. **Update 2026-10-21:** Twilio was replaced by MSG91. The shared Send SMS hook and its setup are in [the MSG91 guide](GOOGLE-EMAIL-AUTH-SETUP.md); Phone stays disabled until an approved DLT template exists and a real message is delivered. **Update 2026-10-23:** the same hook also supports a capcom6 Android gateway for staging and low-volume checks; see [the capcom6 guide](GOOGLE-EMAIL-AUTH-SETUP.md).
3. Supply approved operator/support details and final policies; publish them through the existing legal workflow. No policies are currently published. Drafts are not approvals.
4. Run the full live partner approval, listing publication, customer booking, acceptance, status, completion and chat journey with approved test identities. Check cross-account denial for every action.
5. Install Android SDK Platform 36 and Build Tools 35, accept the SDK licences, then build and install a debug APK. The local SDK currently lacks those components. Test offline/reconnect, background/resume, logout/session restore, uploads and keyboard behavior on a real phone. Authentication links currently have no native deep-link handler; use OTP codes for device testing until callbacks are implemented.
6. Configure production hosting/domain and exact Auth redirects, monitoring and backups. Configure and validate payments/webhooks/refunds only if paid checkout is in the release. Automated workers and Android background push are not configured.
7. Fix and retest the live video feed if live synchronization is promised; the saved-video fallback is currently available.

No production release, credential invention, legal publication, payment activation or extra-project deletion was performed.

Useful commands: `npm.cmd run dev`, `node scripts/functionality-regression.cjs --skip-browser`, `npm.cmd run android:sync`, and `npm.cmd run android:debug` after Android prerequisites are installed.
