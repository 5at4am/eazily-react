# Live database integration test — 2026-10-11

Target: `rujrweqttrqdmkkbamjt`. Tests used disposable synthetic accounts and public-client authenticated requests. No real customer records were changed. No email or SMS was sent.

## Final completed run

All 12 live check groups passed:

- Eight-digit email-code verification and two authenticated accounts.
- Signup profile creation, profile updates, unrelated-account denial and blocked role escalation.
- Session restoration and token refresh with subsequent database reads.
- Address creation, editing, default switching, deletion and account isolation.
- Notification preference persistence across sessions and account isolation.
- Professional, influencer and consultant draft persistence, duplicate prevention and incomplete submission rejection.
- Service request persistence, idempotent retry and account isolation.
- Hosted Realtime delivery with unrelated-account denial.
- Support ticket persistence and account isolation.
- Support reply persistence and account isolation.
- Private profile-media upload, signed download and outsider denial.
- Logout removes the SDK session.

Read-only catalog checks found 89 public tables, all with RLS enabled; zero public storage buckets, invalid indexes or unvalidated public constraints. All 64 literal frontend RPC names and 56 table/bucket names exist. This name check does not verify every dynamic call or argument.

Cleanup passed. Separate SQL checks found zero remaining synthetic Auth users, audit addresses, audit requests or audit tickets. Existing records were preserved. Audit/event envelopes may remain as normal history.

## Reliability observations and limits

The first attempt failed during address insertion without a useful server error code. The next attempt passed addresses but timed out waiting for a Realtime event. The final run passed every group after synchronizing the two test clients following session refresh. These observations do not establish a root cause or prove that production transport is consistently reliable. The test now retains HTTP/error messages and continues other checks after a missing Realtime event while preserving a failing exit status.

Email delivery remains unverified; the previous real send attempt returned an email rate-limit error. Phone and Google providers remain disabled. No legal documents are published. Full hosted partner approval, service publication, booking acceptance/completion, chat, payments and installed-device UI tests were not performed in this run. This report confirms the tested database operations, not overall launch readiness or load capacity.

Commands: `node scripts/hosted-functionality-test.cjs --run-development` and `node scripts/backend-contract-audit.cjs`. Machine-readable final results: `.tmp/hosted-functionality-result.json`.
