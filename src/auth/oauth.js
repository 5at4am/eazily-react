import { workspacePaths } from '../lib/workspace.js';

export const NATIVE_AUTH_CALLBACK = 'com.eazily.app://auth/callback';
export const safeAuthReturnPath = path => Object.values(workspacePaths).includes(path) ? path : workspacePaths.customer;

export function googleOAuthOptions({ native = false, origin, returnPath } = {}) {
  return {
    redirectTo: native ? NATIVE_AUTH_CALLBACK : origin ? `${origin}${safeAuthReturnPath(returnPath)}` : undefined,
    skipBrowserRedirect: native,
    queryParams: { prompt: 'select_account' },
  };
}

export function readNativeAuthCallback(href) {
  let url;
  try { url = new URL(href); } catch { return null; }
  if (url.protocol !== 'com.eazily.app:' || url.hostname !== 'auth' || url.pathname !== '/callback' || url.username || url.password || url.port) return null;
  if (url.searchParams.has('error')) return { error: 'Google sign-in was not completed. Try again.' };
  const code = url.searchParams.get('code');
  return code && code.length <= 2048 ? { code } : { error: 'This sign-in link is incomplete. Start Google sign-in again.' };
}

export function trustedGoogleAuthorizeUrl(href, supabaseUrl) {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && url.origin === new URL(supabaseUrl).origin && url.pathname === '/auth/v1/authorize' && url.searchParams.get('provider') === 'google';
  } catch { return false; }
}

export function createNativeAuthCallbackHandler({ exchangeCode, readReturnPath, onSuccess, onError, closeBrowser }) {
  // App.getLaunchUrl and appUrlOpen can deliver the same code. Exchange it once.
  const completed = new Set();
  const pending = new Map();
  return async href => {
    const callback = readNativeAuthCallback(href);
    if (!callback) return false;
    if (callback.error) { onError(callback.error); await closeBrowser?.(); return true; }
    if (completed.has(callback.code)) return true;
    if (pending.has(callback.code)) return pending.get(callback.code);
    const path = safeAuthReturnPath(readReturnPath?.());
    const work = (async () => {
      try {
        const success = await exchangeCode(callback.code);
        await closeBrowser?.();
        if (success) {
          completed.add(callback.code);
          if (completed.size > 8) completed.delete(completed.values().next().value);
          onSuccess(path);
        }
        return true;
      } catch { onError('Google sign-in could not be completed. Start again.'); return true; }
      finally { pending.delete(callback.code); }
    })();
    pending.set(callback.code, work);
    return work;
  };
}
