import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles.css';
import '../src/experience.css';
import '../src/partner.css';
import '../src/product-polish.css';
import '../src/design-system.css';
import '../src/pages/admin-ui.css';
import '../src/responsive.css';

// Block any backend calls: this fixture verifies layout only and uses no records.
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.includes('.supabase.co')) return Promise.reject(new Error('Responsive fixture blocks backend traffic'));
  return originalFetch(input, init);
};

const [{ default: AdminApp }, { AccountContext }, { RealtimeProvider }] = await Promise.all([
  import('../src/pages/AdminApp.jsx'),
  import('../src/lib/account.js'),
  import('../src/lib/realtime.jsx')
]);
const account = {
  user: { id: 'responsive-fixture-admin' },
  profile: { id: 'responsive-fixture-admin', role: 'admin', full_name: 'Eazily Admin' },
  staff: { staff_role: 'super_admin', permissions: [] },
  applications: [],
  roles: ['admin'],
  isAdmin: true
};
const realtime = { available: false, connectionState: 'Offline', networkOnline: true, revision: 0, scopes: [], lastSyncedAt: null, setPublicAudience: () => {}, retry: () => {} };
createRoot(document.getElementById('root')).render(
  <AccountContext.Provider value={{ ...account, logout: async () => {} }}>
    <RealtimeProvider value={realtime}>
      <div className="phone-shell peazily-ui"><AdminApp account={account} notify={() => {}} logout={() => {}} /></div>
    </RealtimeProvider>
  </AccountContext.Provider>
);
