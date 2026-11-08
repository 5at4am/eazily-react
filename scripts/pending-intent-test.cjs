const assert = require('node:assert/strict');

// pendingIntent.js reads sessionStorage and Date.now(). Provide a small
// in-memory sessionStorage and a controllable clock before importing it.
const store = new Map();
globalThis.sessionStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
};

let now = 1_700_000_000_000;
const realNow = Date.now;
Date.now = () => now;
const resetClock = () => { now = 1_700_000_000_000; };
const resetStore = () => { store.clear(); resetClock(); };

(async () => {
  const { savePendingIntent, readPendingIntent, clearPendingIntent } = await import('../src/lib/pendingIntent.js');
  try {
    // 1. Saving an intent round-trips.
    resetStore();
    savePendingIntent({ type: 'booking', request: { serviceName: 'AC Service' }, page: { route: 'categories' } });
    const saved = readPendingIntent();
    assert.equal(saved.type, 'booking');
    assert.equal(saved.request.serviceName, 'AC Service');
    assert.equal(saved.page.route, 'categories');
    assert.equal(saved.savedAt, now, 'savedAt timestamp is captured');

    // 2. A malformed payload is dropped and cleared.
    resetStore();
    store.set('eazily-pending-intent', 'not-json');
    assert.equal(readPendingIntent(), null);
    assert.equal(store.has('eazily-pending-intent'), false);

    // 3. An intent with a missing type is discarded.
    resetStore();
    savePendingIntent({ request: {} });
    assert.equal(readPendingIntent(), null);

    // 4. Expired intents are dropped after the 20-minute TTL.
    resetStore();
    savePendingIntent({ type: 'route', route: 'messages' });
    now += 20 * 60 * 1000 + 1;
    assert.equal(readPendingIntent(), null);
    assert.equal(store.has('eazily-pending-intent'), false);

    // 5. clearPendingIntent removes the stored intent.
    resetStore();
    savePendingIntent({ type: 'panel', panel: 'My Bookings' });
    clearPendingIntent();
    assert.equal(store.has('eazily-pending-intent'), false);
    assert.equal(readPendingIntent(), null);

    console.log('PASS: pending intent save/read/clear/TTL behaviour');
  } finally {
    Date.now = realNow;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
