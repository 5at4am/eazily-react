const assert = require('node:assert/strict');

(async () => {
  const { describeSellerNotification } = await import('../src/lib/sellerNotifications.js');

  const orders = [
    { id: 'ord-1', title: 'AC Service', status: 'requested', role: 'professional', details: {} },
    { id: 'ord-2', title: 'Painting', status: 'completed', role: 'professional', details: {} },
  ];

  // Linked order → rich body with order title + status
  const linked = describeSellerNotification({ id: 'n1', title: 'New booking request', order_id: 'ord-1' }, orders);
  assert.equal(linked.title, 'New booking request');
  assert.ok(linked.body.includes('AC Service'), 'body includes order title');
  assert.ok(linked.body.includes('Requested'), 'body includes status');

  const done = describeSellerNotification({ id: 'n2', title: 'Booking completed', order_id: 'ord-2' }, orders);
  assert.ok(done.body.includes('Painting') && done.body.includes('Completed'));

  // No linked order → sensible fallback sentence
  const fallback = describeSellerNotification({ id: 'n3', title: 'New booking request' }, []);
  assert.ok(fallback.body.includes('new request'), 'fallback describes the action');

  const fallbackPayment = describeSellerNotification({ id: 'n4', title: 'Payment payout updated' }, []);
  assert.ok(fallbackPayment.body.toLowerCase().includes('payment'), 'fallback maps keyword');

  console.log('PASS vendor notification description helper: order context and fallback sentences');
})().catch(error => { console.error(error); process.exitCode = 1; });
