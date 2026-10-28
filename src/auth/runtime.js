import { supabase } from '../lib/supabase.js';
import { getWorkspaceAccount } from '../services/partners.js';
import { EMAIL_OTP_LENGTH } from './config.js';
import { startGoogleSignIn } from './nativeOAuth.js';

async function loadAuthSettings() {
  const response = await fetch(new URL('/auth/v1/settings', import.meta.env.VITE_SUPABASE_URL), {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Sign-in methods could not be loaded. Please retry.');
  const settings = await response.json();
  return { email: settings.external?.email === true, phone: false,
    google: settings.external?.google === true, signup: settings.disable_signup !== true };
}

export const authRuntime = { client: supabase, loadAccount: getWorkspaceAccount, loadAuthSettings: supabase ? loadAuthSettings : null, emailOtpLength: EMAIL_OTP_LENGTH, googleSignIn: startGoogleSignIn };
