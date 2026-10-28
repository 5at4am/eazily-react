import { useRealtime } from '../lib/realtime.jsx';

export default function ConnectionNotice({ accountError, onRefresh }) {
  const { available, networkOnline, connectionState, retry } = useRealtime();
  if (networkOnline && !accountError && (!available || connectionState === 'Live')) return null;
  const offline = !networkOnline;
  return <aside className="connection-notice" role="status" aria-live="polite">
    <div><b>{offline ? 'You’re offline' : accountError ? 'Account update unavailable' : 'Reconnecting to live updates'}</b>
      <p>{offline ? 'Keep this screen open to retain your draft. Reconnect before sending or saving.' : accountError ? 'Your current screen is preserved. Retry to refresh your account.' : 'You can keep browsing. Booking and message updates may be delayed.'}</p></div>
    {!offline && <button type="button" className="btn btn-outline" onClick={() => { retry(); void onRefresh?.(); }}>Retry connection</button>}
  </aside>;
}
