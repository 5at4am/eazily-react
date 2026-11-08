import assert from 'node:assert/strict';
import { partnerNavigationFor } from '../src/features/partners/partnerNavigation.js';
import { resolvePartnerNotificationDestination } from '../src/features/partners/partnerNotification.js';

const approvedRoutes = ['home', 'orders', 'post', 'growth', 'earnings', 'profile', 'messages'];
const restrictedRoutes = ['home', 'profile'];
const expectedNav = {
  professional: ['home', 'orders', 'post', 'messages', 'profile'],
  influencer: ['home', 'orders', 'post', 'growth', 'profile'],
  consultant: ['home', 'orders', 'post', 'growth', 'profile'],
};

for (const [role, routes] of Object.entries(expectedNav)) {
  const full = partnerNavigationFor(role, true);
  assert.deepEqual(full.routes, approvedRoutes, `${role} receives approved workspace routes`);
  assert.deepEqual(full.items.map(([id]) => id), routes, `${role} receives role-specific navigation`);
  assert.ok(full.items.every(([id]) => full.routes.includes(id)), `${role} navigation only links to allowed routes`);

  const limited = partnerNavigationFor(role, false);
  assert.deepEqual(limited.routes, restrictedRoutes, `${role} is limited before approval`);
  assert.deepEqual(limited.items.map(([id]) => id), restrictedRoutes, `${role} sees only safe pending routes`);
}

assert.deepEqual(partnerNavigationFor('unknown', true).items.map(([id]) => id), restrictedRoutes);
assert.deepEqual(partnerNavigationFor('professional', 1).routes, restrictedRoutes, 'Only literal approval enables operational routes');

const professionalApplication = { id: 'application-1', role: 'professional' };
const applications = [professionalApplication, { id: 'application-2', role: 'influencer' }];
assert.deepEqual(
  resolvePartnerNotificationDestination({ destination_type: 'application', partner_application_id: 'application-1' }, 'professional', applications),
  { type: 'application', application: professionalApplication },
  'Application alerts resolve only to the matching application and role',
);
assert.equal(resolvePartnerNotificationDestination({ destination_type: 'application', partner_application_id: 'application-1' }, 'influencer', applications), null, 'Application alert cannot cross partner roles');
assert.deepEqual(resolvePartnerNotificationDestination({ order_id: 'order-1' }, 'professional', applications), { type: 'booking', orderId: 'order-1' }, 'Legacy booking alerts retain their destination');
assert.equal(resolvePartnerNotificationDestination({ destination_type: 'booking' }, 'professional', applications), null, 'Malformed booking alert has no destination');
assert.equal(resolvePartnerNotificationDestination({ destination_type: 'unknown', order_id: 'order-1' }, 'professional', applications), null, 'Unknown typed destination is rejected');
console.log('PASS partner navigation role/status configuration');
