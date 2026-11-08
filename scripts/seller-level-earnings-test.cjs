const assert = require('node:assert/strict');
const now = Date.now();
const daysAgo = n => new Date(now - n * 86400000).toISOString();

(async () => {
  const { computeSellerLevel, computePublicLevel } = await import('../src/lib/sellerLevel.js');
  const { weeklyEarnings } = await import('../src/lib/earningsChart.js');

  // Seller levels
  assert.equal(computeSellerLevel({ completed: 0 }).label, 'New seller');
  assert.equal(computeSellerLevel({ completed: 3, rating: 4.2 }).label, 'Level 1');
  assert.equal(computeSellerLevel({ completed: 12, rating: 4.4 }).label, 'Level 2');
  assert.equal(computeSellerLevel({ completed: 30, rating: 4.7, acceptedCount: 9, decidedCount: 10 }).label, 'Top Rated');
  // Accept rate gate for Top Rated (needs >=3 decided + >=85% accept)
  assert.notEqual(computeSellerLevel({ completed: 30, rating: 4.7, acceptedCount: 2, decidedCount: 10 }).label, 'Top Rated');
  assert.notEqual(computeSellerLevel({ completed: 30, rating: 4.7, acceptedCount: 2, decidedCount: 2 }).label, 'Top Rated');

  // Public level (no accept-rate data) still rewards strong evidence, never overstates
  assert.equal(computePublicLevel({ completed: 30, rating: 4.7 }).label, 'Top Rated');
  assert.equal(computePublicLevel({ completed: 12, rating: 4.4 }).label, 'Level 2');
  assert.equal(computePublicLevel({ completed: 3, rating: 4.2 }).label, 'Level 1');
  assert.equal(computePublicLevel({ completed: 0 }).label, 'New seller');
  assert.equal(computePublicLevel({ completed: 30, rating: 3.5 }).label, 'New seller'); // high volume, low rating stays unrated

  // Weekly earnings: 8 bars, newest-last, sums only qualifying states
  const earnings = [
    { amount: 1000, state: 'pending', created_at: daysAgo(0) },
    { amount: 500, state: 'paid', created_at: daysAgo(1) },
    { amount: 200, state: 'reversed', created_at: daysAgo(1) },
    { amount: 700, state: 'security_hold', created_at: daysAgo(6) },
    { amount: 3000, state: 'paid', created_at: daysAgo(20) },
  ];
  const chart = weeklyEarnings(earnings, 8);
  assert.equal(chart.labels.length, 8);
  assert.equal(chart.values.length, 8);
  // Current week includes pending 1000 + paid 500 - reversed 200 = 1300; security_hold excluded
  assert.equal(chart.values[7], 1300);
  // The old 3000 paid entry appears in one of the earlier bars
  assert.ok(chart.values.some(value => value === 3000), 'old paid entry appears in an earlier week');
  assert.ok(chart.peak >= 3000);

  console.log('PASS seller level tiers and weekly earnings chart math');
})().catch(error => { console.error(error); process.exitCode = 1; });
