# Functional audit

**Status: PARTIAL.** Functional browser success, static review, and failed test assertions are reported separately.

## Browser checks recorded

| Command | Result | Meaning |
|---|---|---|
| `node scripts/customer-navigation-test.mjs` | PASS | Category/service/provider back-forward, related services, URL cleanup, scroll restoration, sheet transitions, nested views, deep links, branch truncation; account-switch privacy/conversation clearing and account-panel resubscription. |
| `node scripts/service-partner-legal-browser-test.cjs` | PASS | Missing policies block acceptance, retry loads policy content, acceptance becomes available. |
| `node scripts/responsive-browser-test.cjs` | PARTIAL / exits 1 | Welcome and customer home sizes pass; later assertion says `Explore navigation missing`. |
| `node scripts/service-partner-verify-mobile-browser-test.cjs` | FAIL assertion | Expected “Verify mobile” card absent in this fixture; whether stale expectation or regression requires product/flow reconciliation. |
| `node scripts/service-posting-browser-test.cjs` | FAIL assertion | Expected first-service guidance not found; source/test expectation must be reconciled before calling it a product defect. |

Additional repository test state from the audit run: production build, lint, source-integrity, functionality regression (non-browser), service-posting, influencer-flow, and consultant-legal passed; lint reported four warnings. Partner navigation/dashboard browser tests failed later assertions on route/status expectations. `partner-demo-model-test.cjs` reports a fixture/model discrepancy (markup 25,000 vs SQL 12,000). These test findings are not all confirmed UI defects.

## Coverage gaps

Authenticated partner end-to-end verification is blocked by the fixture/auth/backend state. Admin, all role-gated states, all component states, and all keyboard/touch interactions were not exhaustively exercised. See issue tracker for follow-up and verification status.
