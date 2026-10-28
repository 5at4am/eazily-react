const assert = require('node:assert/strict');
(async () => {
  const { backendError, emailVerificationRequired, EMAIL_VERIFICATION_MESSAGE } = await import('../src/services/backendError.js');
  for (const error of [{ name: 'AbortError' }, { name: 'TimeoutError' }, { message: 'TypeError: Failed to fetch' },
    { message: 'AbortError: This operation was aborted' }, { message: 'Network request failed' }]) {
    assert.match(backendError(error).message, /Check your saved history before retrying/,
      'An uncertain network result must not imply the write failed or encourage duplicate submission');
  }
  assert.match(backendError({ code: '42501', message: 'permission denied for internal_table' }).message, /correct account/);
  assert.doesNotMatch(backendError({ code: '42501', message: 'permission denied for internal_table' }).message, /internal_table/);
  assert.match(backendError({ code: 'PGRST301' }).message, /Sign in again/);
  assert.equal(backendError({ code: 'P0001', message: 'Your verified phone is required' }).message,
    'Your verified phone is required', 'Business requirements must remain visible');
  for (const message of ['Complete email verification before submitting',
    'Verified email must match the confirmed account email']) {
    assert.equal(emailVerificationRequired({ message }), true, message);
    assert.equal(backendError({ code: 'P0001', message }).message, EMAIL_VERIFICATION_MESSAGE,
      'The email gate must never surface SQL text: ' + message);
  }
  assert.equal(emailVerificationRequired({ message: 'Your verified phone is required' }), false,
    'Unrelated business messages keep their own wording');
  assert.ok(backendError({}) instanceof Error);
  console.log('PASS: uncertain writes require history checks; account permissions, expired sessions and business requirements remain distinct; the email gate never leaks SQL.');
})().catch(error => { console.error(error); process.exitCode = 1; });
