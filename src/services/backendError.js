// Postgres raises these from require_confirmed_service_partner_email. The registration
// form blocks the same case before it submits, so this mapping is the fallback that
// stops raw SQL text from reaching a user if the client and the database ever disagree.
const EMAIL_VERIFICATION_REQUIRED = /complete email verification before submitting|verified email must match the confirmed account email/i;

export function emailVerificationRequired(error) {
  return EMAIL_VERIFICATION_REQUIRED.test(String(error?.message || ''));
}

export const EMAIL_VERIFICATION_MESSAGE = 'Verify your email before submitting. Sign in with Google or use the code sent to your email address.';

export function backendError(error) {
  const message = String(error?.message || '');
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError' || /aborterror|timeouterror|fetch failed|failed to fetch|networkerror|network request failed/i.test(message)) {
    return new Error('Connection interrupted. Check your saved history before retrying. Your changes may have reached the server.');
  }
  if (emailVerificationRequired(error)) return new Error(EMAIL_VERIFICATION_MESSAGE);
  if (error?.code === '42501') return new Error('Your account cannot perform this action. Sign in with the correct account or contact support.');
  if (['PGRST301', 'bad_jwt', 'session_not_found'].includes(error?.code)) return new Error('Your session expired. Sign in again to continue.');
  return error instanceof Error ? error : new Error(message || 'This action could not be completed. Try again.');
}
