const assert = require('node:assert/strict');
const now = Date.now();
const minAgo = n => new Date(now - n * 60000).toISOString();

(async () => {
  const { buildNotificationEvents, unreadSince } = await import('../src/features/account/customerNotifications.js');
  const requests = [{ id: 'req-1', service_name: 'AC Service', status: 'pending', created_at: minAgo(5), updated_at: minAgo(5) }];
  const orders = [
    { id: 'ord-1', title: 'Painting', status: 'accepted', role: 'professional', created_at: minAgo(20), updated_at: minAgo(10) },
    { id: 'ord-2', title: 'Cleaning', status: 'completed', role: 'professional', created_at: minAgo(60), updated_at: minAgo(50) },
  ];
  const ledger = [{ id: 'wal-1', kind: 'reward', amount: 50, created_at: minAgo(2) }];

  const events = buildNotificationEvents({ requests, orders, ledger });
  assert.equal(events.length, 4, 'events for requests + orders + ledger');
  // Newest first
  for (let i = 1; i < events.length; i += 1) assert.ok(events[i - 1].at >= events[i].at, 'sorted newest first');
  assert.equal(events[0].kind, 'wallet');
  assert.equal(events[0].title, 'reward');
  assert.equal(events[0].meta, '₹50');
  assert.ok(events[0].body.includes('recorded'), 'wallet event has a descriptive body');
  assert.equal(events.find(e => e.id === 'booking:req-1').title, 'AC Service');
  assert.ok(events.find(e => e.id === 'booking:req-1').body.includes('Waiting for the professional to accept your AC Service request'), 'request body describes the waiting state');
  assert.equal(events.find(e => e.id === 'booking:ord-1').meta, 'Confirmed');
  assert.ok(events.find(e => e.id === 'booking:ord-1').body.includes('Painting was accepted'), 'accepted order body is descriptive');
  assert.equal(events.find(e => e.id === 'booking:ord-2').meta, 'Completed');
  assert.ok(events.find(e => e.id === 'booking:ord-2').body.includes('is complete'), 'completed order body is descriptive');

  // Unread: only events newer than the seen timestamp
  assert.equal(unreadSince(events, now - 3 * 60000), 1, 'one event newer than seen baseline');
  assert.equal(unreadSince(events, now), 0, 'nothing new at current time');

  console.log('PASS customer notification aggregation: sources, recency, labels, unread baseline');
})().catch(error => { console.error(error); process.exitCode = 1; });
