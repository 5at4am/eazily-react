import { useState } from 'react';
import { Field } from '../../components/Ui.jsx';
import { confirmedEmail, linkedProviders } from '../../auth/policy.js';

const PROVIDER_LABELS = { google: 'Google', email: 'Email address' };
const formatDate = value => (value ? new Date(value).toLocaleDateString() : '—');

// Security panel for a signed-in account: linked sign-in methods, setting or
// changing the password, and revoking every other session.
export default function AccountSecurity({ auth, account, notify, onSignedOut }) {
  const user = account?.user;
  const [panel, setPanel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const providers = linkedProviders(user).filter(provider => provider === 'google' || provider === 'email');
  if (!user) return null;
  const signOutEverywhere = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (await auth.controller.signOutEverywhere()) {
        notify('Signed out on all devices.');
        onSignedOut?.();
      } else notify('Could not sign out everywhere. Please try again.');
    } finally { setBusy(false); }
  };
  if (panel === 'sessions') return <>
    <Field label="Type SIGN OUT to confirm" value={confirmText} onChange={event => setConfirmText(event.target.value)} autoCapitalize="characters" />
    <p className="policy-note">This ends your current session too. Sign back in with Google or your email code.</p>
    <button className="btn btn-outline full" disabled={busy || confirmText.trim().toUpperCase() !== 'SIGN OUT'} onClick={() => void signOutEverywhere()}>{busy ? 'Signing out…' : 'Sign out everywhere'}</button>
    <button type="button" className="link" onClick={() => { setPanel(null); setConfirmText(''); }}>Cancel</button>
  </>;
  return <>
    <h3>Sign-in methods</h3>
    <ul className="security-list">
      <li><span>Email address</span><small>{confirmedEmail(user) ? 'Verified' : 'Not verified'}</small></li>
      {providers.includes('google') && <li><span>Google</span><small>Linked</small></li>}
    </ul>
    <p className="policy-note">{user.email || 'No email address is linked to this account.'}</p>
    <p>Use Google or an email code to sign in. No mobile verification is required.</p>
    <h3>Session</h3>
    <p>Account created {formatDate(user.created_at)}. Last signed in {formatDate(user.last_sign_in_at)}.</p>
    <button type="button" className="btn btn-outline full" onClick={() => setPanel('sessions')}>Sign out everywhere</button>
  </>;
}
