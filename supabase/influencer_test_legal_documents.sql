-- TEST ONLY. These documents exist only to exercise the Influencer flow.
-- They are not approved legal documents and must be replaced before real users register.
begin;

update public.legal_documents
set title = 'TEST ONLY - Influencer Terms & Conditions',
    content = $doc$EAZILY – TEST ONLY INFLUENCER TERMS AND CONDITIONS
TEST DOCUMENT — NOT A LEGAL AGREEMENT

1. Internal testing only
This document exists only to test the Influencer registration and consent flow. It is not legal advice, not approved Eazily policy text, and must not be used to obtain consent from real users.

2. No legal effect
Accepting this test document has no legal effect. It does not create any right, obligation, warranty, payment term, or liability for any person.

3. Test version identifier
The database version value is retained as 2026-09-12 only because the current test RPC requires that identifier. It does not indicate legal approval or an effective legal revision.

4. Replacement required
Replace this document with approved Influencer Terms before production use.

Effective Date: 27 October 2026
Last Updated: 27 October 2026$doc$,
    published = true,
    effective_at = '2026-10-27T00:00:00Z',
    last_updated_at = '2026-10-27T00:00:00Z'
where document_key = 'eazily-influencer-provider-terms'
  and language = 'English'
  and version = '2026-09-12';

update public.legal_documents
set title = 'TEST ONLY - Influencer Privacy Policy',
    content = $doc$EAZILY – TEST ONLY INFLUENCER PRIVACY POLICY
TEST DOCUMENT — NOT AN APPROVED PRIVACY POLICY

1. Internal testing only
This document exists only to test the Influencer registration and policy-viewing flow. It is not legal advice, not an approved Eazily privacy policy, and must not be used to obtain consent from real users.

2. No real privacy terms
This test document does not describe how personal data is actually collected, used, shared, or retained. Accepting it has no legal effect.

3. Test version identifier
The database version value is retained as 2026-09-12 for compatibility with the current test integration. It does not indicate legal approval or an effective legal revision.

4. Replacement required
Replace this document with an approved Influencer Privacy Policy before production use.

Effective Date: 27 October 2026
Last Updated: 27 October 2026$doc$,
    published = true,
    effective_at = '2026-10-27T00:00:00Z',
    last_updated_at = '2026-10-27T00:00:00Z'
where document_key = 'eazily-influencer-provider-privacy-policy'
  and language = 'English'
  and version = '2026-09-12';

do $$
begin
  if (select count(*) from public.legal_documents
      where document_key in ('eazily-influencer-provider-terms','eazily-influencer-provider-privacy-policy')
        and language = 'English' and version = '2026-09-12'
        and published and title like 'TEST ONLY%') <> 2 then
    raise exception 'Both Influencer test-only legal documents must be present and published';
  end if;
end $$;

commit;
