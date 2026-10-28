import { App as NativeApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { createNativeAuthCallbackHandler, googleOAuthOptions, safeAuthReturnPath, trustedGoogleAuthorizeUrl } from './oauth.js';

const handlers = new WeakMap();
const returnPathKey = 'eazily-oauth-return-path';

export async function startGoogleSignIn(client) {
  const native = Capacitor.isNativePlatform();
  try { sessionStorage.setItem(returnPathKey, safeAuthReturnPath(window.location.pathname)); } catch { /* The callback safely defaults to customer home. */ }
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: googleOAuthOptions({ native, origin: window.location.origin, returnPath: window.location.pathname }) });
  if (error) throw error;
  if (native) {
    if (!trustedGoogleAuthorizeUrl(data?.url, import.meta.env.VITE_SUPABASE_URL)) throw new Error('Invalid sign-in destination.');
    await Browser.open({ url: data.url });
  }
}

export function attachNativeOAuth(controller) {
  if (!Capacitor.isNativePlatform()) return () => {};
  let active = true;
  const listeners = [];
  let handler = handlers.get(controller);
  if (!handler) {
    handler = createNativeAuthCallbackHandler({
      exchangeCode: async code => {
        const success = await controller.completeGoogleSignIn(code);
        if (!success) window.dispatchEvent(new Event('eazily-oauth-error'));
        return success;
      },
      readReturnPath: () => { try { return sessionStorage.getItem(returnPathKey); } catch { return null; } },
      onSuccess: path => window.dispatchEvent(new CustomEvent('eazily-oauth-complete', { detail: { path } })),
      onError: message => { controller.googleSignInError(message); window.dispatchEvent(new Event('eazily-oauth-error')); },
      closeBrowser: () => Browser.close().catch(() => {}),
    });
    handlers.set(controller, handler);
  }
  const keepListener = listener => { if (active) listeners.push(listener); else listener.remove(); };
  NativeApp.addListener('appUrlOpen', ({ url }) => { if (active) void handler(url); }).then(keepListener).catch(() => {});
  Browser.addListener('browserFinished', () => { if (active) controller.cancelGoogleSignIn(); }).then(keepListener).catch(() => {});
  NativeApp.getLaunchUrl().then(result => { if (active && result?.url) void handler(result.url); }).catch(() => {});
  return () => { active = false; listeners.forEach(listener => listener.remove()); };
}
