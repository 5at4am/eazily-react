const assert = require('node:assert/strict');

(async () => {
  const { stagingBuildErrors } = await import('../scripts/build-policy.mjs');
  const valid = {
    EAZILY_TARGET_ENV: 'staging',
    SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
    VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_only',
    VITE_PARTNER_DEMO: 'false',
    VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP: 'false'
  };
  assert.deepEqual(stagingBuildErrors(valid), [], 'a fully configured staging build passes local environment checks');
  assert.ok(stagingBuildErrors({ ...valid, EAZILY_TARGET_ENV: 'production' }).some(error => error.includes('EAZILY_TARGET_ENV')));
  assert.ok(stagingBuildErrors({ ...valid, VITE_SUPABASE_URL: 'https://otherprojectref00000.supabase.co' }).some(error => error.includes('VITE_SUPABASE_URL')));
  assert.ok(stagingBuildErrors({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role_fixture' }).some(error => error.includes('PUBLISHABLE_KEY')));
  assert.ok(stagingBuildErrors({ ...valid, VITE_PARTNER_DEMO: 'true' }).some(error => error.includes('PARTNER_DEMO')));
  assert.ok(stagingBuildErrors({ ...valid, VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP: 'true' }).some(error => error.includes('TEST_SKIP')));
  console.log('PASS: staging build configuration matches its labelled, same-project, public-key-only, no-demo policy.');
})().catch(error => { console.error(error); process.exitCode = 1; });
