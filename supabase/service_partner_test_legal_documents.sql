-- TEST ONLY. These rows exist solely to exercise the Service Partner final
-- step. They are not approved legal documents and must be replaced with
-- authorised Terms and Privacy Policy text before real users can register.
begin;

insert into public.legal_documents
  (kind, language, version, title, content, published, effective_at, document_key, last_updated_at)
select
  'terms',
  'English',
  'test-only-2026-10-23',
  'TEST ONLY - Service Partner Terms & Conditions',
  $doc$EAZILY – TEST ONLY SERVICE PARTNER TERMS AND CONDITIONS
TEST DOCUMENT — NOT A LEGAL AGREEMENT
1. Internal testing only
This document exists only to test the Service Partner registration flow. It is not legal advice, not an approved Eazily policy, and must not be used to obtain consent from real users.
2. Test consent
Accepting this document has no legal effect. It must be replaced by an approved Service Partner Terms and Conditions before production use.
3. No rights or obligations
Nothing in this test document creates any right, obligation, warranty, payment term or liability for any person.
Effective Date: 23 October 2026
Last Updated: 23 October 2026$doc$,
  true,
  '2026-10-23T00:00:00Z',
  'eazily-service-partner-terms',
  '2026-10-23T00:00:00Z'
where not exists (
  select 1 from public.legal_documents
  where document_key = 'eazily-service-partner-terms' and language = 'English'
);

insert into public.legal_documents
  (kind, language, version, title, content, published, effective_at, document_key, last_updated_at)
select
  'privacy_policy',
  'English',
  'test-only-2026-10-23',
  'TEST ONLY - Service Partner Privacy Policy',
  $doc$EAZILY – TEST ONLY SERVICE PARTNER PRIVACY POLICY
TEST DOCUMENT — NOT A LEGAL POLICY
1. Internal testing only
This document exists only to test the Service Partner registration flow. It is not legal advice, not an approved Eazily privacy policy, and must not be used to obtain consent from real users.
2. No real privacy terms
Accepting this document has no legal effect and does not describe how personal data is actually collected, used or retained.
3. Replacement required
This document must be replaced by an approved Service Partner Privacy Policy before production use.
Effective Date: 23 October 2026
Last Updated: 23 October 2026$doc$,
  true,
  '2026-10-23T00:00:00Z',
  'eazily-service-partner-privacy-policy',
  '2026-10-23T00:00:00Z'
where not exists (
  select 1 from public.legal_documents
  where document_key = 'eazily-service-partner-privacy-policy' and language = 'English'
);

commit;
