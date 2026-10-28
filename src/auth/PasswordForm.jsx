import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { maskEmail, PASSWORD_MIN_LENGTH, PASSWORD_STRENGTH_LABELS, passwordScore } from './policy.js';

// One form for both "set your password" (Google-only account or recovery link) and
// "change your password" (account that already has an email identity).
export default function PasswordForm({ auth, variant = 'change', onDone }) {
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [revealed, setRevealed] = useState(false);
  const state = auth.password;
  const busy = state.status === 'updating';
  const done = state.status === 'updated';
  const score = passwordScore(next);
  const strength = PASSWORD_STRENGTH_LABELS[score];
  const submit = async event => {
    event.preventDefault();
    if (busy || done) return;
    if (await auth.controller.updatePassword(next, confirmation)) {
      setNext('');
      setConfirmation('');
      onDone?.();
    }
  };
  if (done) return <section className="auth-recovery-done">
    <span className="auth-recovery-mark" aria-hidden="true"><Icon name="check" size={28} /></span>
    <h1>Password updated</h1>
    <p>Use your new password the next time you sign in with your email address.</p>
    {onDone && <button type="button" className="btn btn-primary full" onClick={onDone}>Done</button>}
  </section>;
  return <form className="password-form" onSubmit={submit} noValidate>
    {variant === 'set' && <p className="auth-recovery-hint">Your account signs in with Google. Add a password so you can also sign in with your email address.</p>}
    {variant === 'recover' && <p className="auth-recovery-hint">Choose a new password for {maskEmail(state.email)}.</p>}
    <label className="form-label" htmlFor="password-next">New password</label>
    <div className="password-input">
      <input className="field" id="password-next" type={revealed ? 'text' : 'password'} autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={next} onChange={event => setNext(event.target.value)} aria-describedby="password-strength" />
      <button type="button" className="password-reveal" aria-label={revealed ? 'Hide password' : 'Show password'} aria-pressed={revealed} onClick={() => setRevealed(value => !value)}><Icon name={revealed ? 'eyeOff' : 'eye'} size={18} /></button>
    </div>
    {next && <p className="password-strength" id="password-strength" data-score={score} role="status"><span className="password-strength-bar" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i key={index} className={index < score ? 'on' : ''} />)}</span>{strength}</p>}
    <p className="auth-recovery-hint">At least {PASSWORD_MIN_LENGTH} characters, including a letter and a number.</p>
    <label className="form-label" htmlFor="password-confirm">Confirm new password</label>
    <input className="field" id="password-confirm" type={revealed ? 'text' : 'password'} autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
    {state.error && <p role="alert" className="auth-recovery-error">{state.error}</p>}
    <button className="btn btn-primary full" disabled={busy || !next || !confirmation}>{busy ? 'Updating…' : 'Update password'}</button>
  </form>;
}
