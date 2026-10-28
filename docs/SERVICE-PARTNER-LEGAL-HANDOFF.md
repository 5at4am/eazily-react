# Service Partner legal-document handoff

## Current temporary state (23 October 2026)

Two clearly marked test-only rows are now published in the linked hosted project so the final step can be exercised end to end:

- `eazily-service-partner-terms`, version `test-only-2026-10-23`
- `eazily-service-partner-privacy-policy`, version `test-only-2026-10-23`

Their titles start with `TEST ONLY` and their content states that they are not approved legal documents. The app recognises this version/title pattern and shows a visible test-policy warning on the final step and inside each policy sheet. Replace both rows with authorised text before real users can register. The reproducible seed is `supabase/service_partner_test_legal_documents.sql`; it must not be treated as production legal content.

## Why the final step was blocked

The final Service Partner step needs two published rows in `public.legal_documents` with these exact keys:

- `eazily-service-partner-terms` (`kind = 'terms'`)
- `eazily-service-partner-privacy-policy` (`kind = 'privacy_policy'`)

Before the test-only rows were added, the hosted project `rujrweqttrqdmkkbamjt` had no rows with either key. It still has only two Influencer rows, and both are unpublished:

- `eazily-influencer-provider-terms` (`published = false`)
- `eazily-influencer-provider-privacy-policy` (`published = false`)

No approved Service Partner policy text exists in the project. The original block was therefore a content/configuration block, not a CSS or click-handler block. The UI and submission RPC still refuse consent and submission whenever either required row is missing.

## What the UI does now

- Both policy names remain tappable when a document is missing.
- Each missing policy opens a status sheet explaining that the policy is not published.
- Tapping the acceptance checkbox while policies are missing opens the same explanation and does not record consent.
- A visible "Policies not published" message names the missing documents.
- If the policy query fails, a retry control is shown.
- After both documents are published, "Check again" loads the real text and enables acceptance.
- `npm run test:service-partner-legal:browser` covers these states with fixtures; it does not contact Supabase.

## Publishing the real documents

Use only approved legal text supplied by the authorised owner. Do not publish the fixture text from `scripts/service-registration-test.cjs` or the status-sheet wording as a real policy.

Each row needs at least:

```sql
insert into public.legal_documents
  (kind, language, version, title, content, published, effective_at, document_key, last_updated_at)
values
  ('terms', 'English', '<approved-version>', 'Eazily Service Partner Terms & Conditions',
   '<approved terms text>', true, '<effective timestamp>', 'eazily-service-partner-terms', '<timestamp>'),
  ('privacy_policy', 'English', '<approved-version>', 'Eazily Service Partner Privacy Policy',
   '<approved privacy text>', true, '<effective timestamp>', 'eazily-service-partner-privacy-policy', '<timestamp>');
```

Keep the version and effective date fixed for a published document. If the text changes later, publish a new version rather than silently editing an accepted version.

## Verification

```sql
select document_key, language, version, published, effective_at
from public.legal_documents
where document_key in (
  'eazily-service-partner-terms',
  'eazily-service-partner-privacy-policy'
)
order by document_key, effective_at desc;
```

Both rows must return `published = true` and an `effective_at` that is not in the future. Reload the final step, open both policy names, accept the checkbox and then submit. A successful submission creates the consent records and moves only that application to `submitted`; it does not start a trial, approve the partner or publish a listing.
