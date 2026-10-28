import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ConsumerLegalLinks } from '../features/legal/ConsumerLegal.jsx';
import { normalizeEmail, maskEmail } from './policy.js';
import { EMAIL_OTP_LENGTH } from './config.js';
import OtpInput from './OtpInput.jsx';
import './auth.css';
import { IN_APP_BACK_EVENT } from '../lib/nativeShell.js';

export default function AuthScreen(props) {
  return <GoogleEmailSignIn {...props} />;
}

export function GoogleEmailSignIn({ auth, onBack, onContinue, partnerRole }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!auth.resendAt || auth.resendAt <= Date.now()) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [auth.resendAt]);
  const remaining = Math.max(0, Math.ceil(((auth.resendAt || 0) - now) / 1000));
  const busy = Boolean(auth.oauthPending || auth.providersLoading || ['initialising', 'otp_sending', 'verifying'].includes(auth.status));
  const configured = auth.status !== 'configuration_required';
  const googleAvailable = configured && auth.providers?.google === true && !auth.providersError;
  const emailAvailable = configured && auth.providers?.email === true && !auth.providersError;
  const length = sent ? auth.otpLength || EMAIL_OTP_LENGTH : EMAIL_OTP_LENGTH;
  async function sendCode() {
    setLocalError('');
    if (busy || !emailAvailable || remaining > 0) return;
    const normalized = normalizeEmail(email);
    if (!normalized) { setLocalError('Enter a valid Gmail or email address.'); return; }
    if (await auth.controller.sendOtp({ contact: normalized, shouldCreateUser: auth.providers?.signup !== false })) {
      setCode(''); setNow(Date.now()); setSent(true);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (sent) { if (await auth.controller.verifyOtp(code)) onContinue(); }
    else await sendCode();
  }
  const back = () => {
    if (sent) { auth.controller.changeContact(); setSent(false); setCode(''); setLocalError(''); }
    else onBack();
  };
  useEffect(() => {
    const nativeBack = event => {
      if (!sent || event.detail.handled) return;
      event.detail.handled = true; event.stopImmediatePropagation();
      if (!busy) { auth.controller.changeContact(); setSent(false); setCode(''); setLocalError(''); }
    };
    window.addEventListener(IN_APP_BACK_EVENT, nativeBack, true);
    return () => window.removeEventListener(IN_APP_BACK_EVENT, nativeBack, true);
  }, [sent, busy, auth.controller]);
  return <main className="setup auth-customer auth-choice-screen">
    <button type="button" className="auth-choice-back" onClick={back} disabled={['otp_sending', 'verifying'].includes(auth.status)} aria-label={sent ? 'Change email address' : 'Go back'}><Icon name="arrowLeft" size={20} />Back</button>
    <div className="auth-choice-brand" aria-label="Eazily">eazily<span>.</span></div>
    <section className="auth-choice-intro"><span className="eyebrow">{partnerRole ? 'PARTNER ACCESS' : 'YOUR EVERYDAY, MADE EASIER'}</span><h1>{sent ? 'Check your inbox' : 'Welcome to Eazily'}</h1><p>{sent ? `Enter the ${length}-digit code sent to ${maskEmail(auth.contact || email)}.` : 'Sign in or create an account with Google or an email verification code. No password needed.'}</p></section>
    {!configured && <p className="auth-method-note" role="status">Sign-in is not available in this version yet.</p>}
    {auth.providersLoading && <p role="status">Checking sign-in options...</p>}
    {auth.providersError && <div className="auth-choice-error" role="alert"><p>Sign-in options could not be loaded. Check your connection and try again.</p><button type="button" className="link" onClick={() => auth.controller.reloadAuthSettings()}>Try again</button></div>}
    <form className="auth-choice-form" onSubmit={submit}>
      {!sent ? <>
        <button type="button" className="auth-choice-google" onClick={() => auth.controller.signInWithGoogle()} disabled={busy || !googleAvailable} aria-describedby={!auth.providersLoading && !googleAvailable ? 'google-availability' : undefined}><span className="auth-google-letter" aria-hidden="true">G</span>{auth.oauthPending ? 'Opening Google...' : 'Continue with Google'}</button>
        {!auth.providersLoading && !googleAvailable && !auth.providersError && <small id="google-availability" className="auth-method-note">Google sign-in is temporarily unavailable.</small>}
        <div className="auth-choice-divider"><span>or use your email</span></div>
        <label className="form-label" htmlFor="auth-email">Gmail or email address</label>
        <div className="auth-choice-email"><input id="auth-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} maxLength={254} onChange={event => { setEmail(event.target.value); setLocalError(''); }} placeholder="you@gmail.com" required disabled={busy} aria-describedby="email-hint" aria-invalid={Boolean(localError)} /></div>
        <small id="email-hint" className="auth-method-note">{!auth.providersLoading && !emailAvailable && !auth.providersError ? 'Email sign-in is temporarily unavailable.' : 'We will email you a verification code. Check your spam folder too.'}</small>
        <button type="submit" className="btn btn-primary full" disabled={busy || !emailAvailable || remaining > 0}>{auth.status === 'otp_sending' ? 'Sending code...' : remaining > 0 ? `Try again in ${remaining}s` : 'Send email code'}</button>
      </> : <>
        <p className="auth-method-note" role="status">Use the latest code. Never share it with anyone.</p><OtpInput value={code} onChange={setCode} disabled={busy} length={length} />
        <button type="submit" className="btn btn-primary full" disabled={busy || code.length !== length}>{auth.status === 'verifying' ? 'Verifying...' : 'Verify and continue'}</button>
        <div className="auth-code-actions"><button type="button" className="link" onClick={back} disabled={busy}>Change email</button><button type="button" className="link" onClick={sendCode} disabled={busy || remaining > 0}>{remaining > 0 ? `Resend in ${remaining}s` : 'Resend code'}</button></div>
      </>}
      {(localError || auth.error) && <p className="auth-choice-error" role="alert">{localError || auth.error}</p>}
    </form>
    <footer className="auth-choice-footer"><Icon name="shield" size={20} /><p>Your account uses secure sign-in.<br />Use the same sign-in method when you return.</p><ConsumerLegalLinks /></footer>
  </main>;
}
