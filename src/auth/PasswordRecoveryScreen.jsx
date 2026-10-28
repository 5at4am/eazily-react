import { Brand } from '../components/Ui.jsx';
import PasswordForm from './PasswordForm.jsx';
import { maskEmail } from './policy.js';
import './auth.css';

// Rendered above everything while a recovery link is open. The controller keeps the
// account empty for the duration, so no workspace is reachable until the new
// password is accepted and the session is reloaded normally.
export default function PasswordRecoveryScreen({ auth, onDone }) {
  const email = auth.recovery?.email || auth.password.email || '';
  return <main className="setup auth-customer auth-recovery-screen">
    <Brand />
    <section className="setup-body auth-recovery">
      <h1>Choose a new password</h1>
      <p className="lead">This link works once. Set a new password to finish signing in{email ? ` as ${maskEmail(email)}` : ''}.</p>
      <PasswordForm auth={auth} variant="recover" onDone={onDone} />
      <p className="auth-recovery-hint">Did not request this? Close the page and sign in as usual. No password was changed.</p>
    </section>
  </main>;
}
