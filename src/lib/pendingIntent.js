// Signing in temporarily replaces the customer shell, so an action that needs an
// account (booking, messaging, account panels) would otherwise be lost. Store the
// intent for a short window and let UserApp resume it after authentication.
const STORAGE_KEY = 'eazily-pending-intent';
const MAX_AGE_MS = 20 * 60 * 1000;

export function savePendingIntent(intent) {
  if (!intent?.type) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...intent, savedAt: Date.now() }));
  } catch {
    // Private browsing or a storage quota failure must not block sign-in.
  }
}

export function readPendingIntent() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw);
    if (!intent || typeof intent !== 'object' || !intent.type) {
      clearPendingIntent();
      return null;
    }
    if (!intent.savedAt || Date.now() - Number(intent.savedAt) > MAX_AGE_MS) {
      clearPendingIntent();
      return null;
    }
    return intent;
  } catch {
    clearPendingIntent();
    return null;
  }
}

export function clearPendingIntent() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures; there is nothing to recover from.
  }
}
