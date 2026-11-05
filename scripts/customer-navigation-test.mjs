import assert from 'node:assert/strict';
import { createCustomerNavigator, customerPageUrl, emptyCustomerPage } from '../src/lib/customerNavigation.js';

function memoryBrowser(href = 'https://eazily.test/user/home', state = {}) {
  const events = new Map();
  const entries = [{ state: structuredClone(state), href }];
  let position = 0;
  const browser = {
    location: { href }, scrollY: 0,
    addEventListener(type, listener) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(listener); },
    removeEventListener(type, listener) { events.get(type)?.delete(listener); },
    emit(type) { events.get(type)?.forEach(listener => listener({ type, state: browser.history.state })); },
    history: {
      get state() { return entries[position].state; },
      get length() { return entries.length; },
      replaceState(next, _, url = browser.location.href) { entries[position] = { state: structuredClone(next), href: String(url) }; browser.location.href = String(url); },
      pushState(next, _, url = browser.location.href) { entries.splice(position + 1); entries.push({ state: structuredClone(next), href: String(url) }); position++; browser.location.href = String(url); },
      back() { if (position > 0) { position--; browser.location.href = entries[position].href; browser.emit('popstate'); } },
      forward() { if (position < entries.length - 1) { position++; browser.location.href = entries[position].href; browser.emit('popstate'); } },
    },
  };
  return browser;
}

const browser = memoryBrowser();
const nav = createCustomerNavigator(browser);
const unsubscribe = nav.subscribe(() => {});
assert.equal(nav.getSnapshot().canBack, false, 'The app root does not navigate out to another site.');
assert.equal(nav.back(), false);
nav.go({ ...emptyCustomerPage });
assert.equal(browser.history.length, 1, 'Repeated Home taps do not fill history with duplicate screens.');
browser.scrollY = 620; browser.emit('scroll');
nav.go({ route: 'categories' });
nav.go({ selectedMain: 'manpower' });
nav.go({ selectedGroup: 'home-property' });
nav.go({ service: { categoryId: 'manpower', serviceName: 'Plumber', requirement: 'Leaking tap' } });
nav.go({ vendor: { id: 'provider-1', display_name: 'Test professional' } }, { preserveScroll: true });
assert.equal(new URL(browser.location.href).searchParams.get('vendor'), 'provider-1');
nav.back();
assert.equal(nav.getSnapshot().vendor, null, 'Closing a provider restores its service listing.');
assert.equal(nav.getSnapshot().service.serviceName, 'Plumber');
nav.forward();
assert.equal(nav.getSnapshot().vendor.id, 'provider-1', 'Forward restores the provider, not an unrelated category.');
nav.back(); nav.back();
assert.equal(nav.getSnapshot().service, null);
assert.equal(nav.getSnapshot().selectedGroup, 'home-property', 'Back restores the actual selected group.');
nav.forward();
assert.equal(nav.getSnapshot().service.requirement, 'Leaking tap', 'Forward preserves the full service selection.');
nav.go({ service: { categoryId: 'manpower', serviceName: 'Electrician' }, vendor: null });
nav.back();
assert.equal(nav.getSnapshot().service.serviceName, 'Plumber', 'Related services retain their own history entry.');
nav.go({ ...emptyCustomerPage, route: 'profile' });
assert.equal(new URL(browser.location.href).searchParams.has('service'), false, 'Tab navigation clears old service URL parameters.');
assert.equal(new URL(browser.location.href).searchParams.has('vendor'), false);
assert.equal(nav.getSnapshot().canForward, false, 'New navigation after Back truncates the old forward branch.');
nav.back();
assert.equal(nav.getSnapshot().service.serviceName, 'Plumber');
nav.forward(); assert.equal(nav.getSnapshot().route, 'profile');
nav.go({ ...emptyCustomerPage, route: 'bookings' });
assert.equal(nav.getSnapshot().route, 'bookings', 'Bookings is a supported customer destination.');
nav.back(); assert.equal(nav.getSnapshot().route, 'profile', 'Back returns from Bookings to the previous customer screen.');

// Simulate a Sheet-owned history entry, then opening a provider from Saved Vendors.
browser.history.pushState({ ...browser.history.state, sheet: 'saved-vendors' }, '');
nav.go({ service: { categoryId: 'manpower', serviceName: 'AC Service' }, vendor: { id: 'provider-2' } });
assert.equal(browser.history.state.sheet, undefined);
nav.back();
assert.equal(nav.getSnapshot().route, 'profile', 'Leaving a sheet for a page does not leave an orphaned sheet entry.');
assert.equal(nav.getSnapshot().service, null);

// Nested chat/form steps participate in the same history and Forward availability.
nav.go({ ...emptyCustomerPage, route: 'messages' });
const state = browser.history.state;
browser.history.pushState({ ...state, eazilyCustomerIndex: state.eazilyCustomerIndex + 1, eazilyDepth: state.eazilyDepth + 1, eazilyLayer: { scope: 'chat:customer', value: { id: 'thread-1' } } }, '');
browser.emit('eazily-navigation-change');
nav.back(); assert.equal(nav.getSnapshot().route, 'messages');
assert.equal(nav.getSnapshot().canForward, true);
nav.forward(); assert.equal(browser.history.state.eazilyLayer.value.id, 'thread-1');
nav.go({ ...emptyCustomerPage });
assert.equal(browser.history.state.eazilyLayer, undefined, 'Switching pages clears nested conversation state.');

while (Number(browser.history.state.eazilyDepth || 0) > 0) nav.back();
assert.equal(nav.getSnapshot().route, 'home');
assert.equal(nav.getSnapshot().scrollY, 620, 'Returning Home restores the saved scroll position.');
unsubscribe();

const deepLink = memoryBrowser('https://eazily.test/user/home?service=Plumber&category=manpower');
const direct = createCustomerNavigator(deepLink);
const stop = direct.subscribe(() => {});
assert.equal(direct.getSnapshot().service.serviceName, 'Plumber');
assert.equal(direct.back(), true);
assert.equal(direct.getSnapshot().service, null, 'A directly opened service has a safe in-app Back fallback.');
assert.equal(deepLink.history.length, 1);
assert.equal(direct.back(), false);
stop();
const shared = customerPageUrl('https://eazily.test/user/home?ref=friend&service=Old&vendor=old', emptyCustomerPage);
assert.equal(new URL(shared).searchParams.get('ref'), 'friend', 'Unrelated URL parameters survive tab navigation.');
assert.equal(new URL(shared).searchParams.has('service'), false);
console.log('PASS: category/service/provider Back and Forward, related services, tab URL cleanup, scroll restoration, sheet transitions, nested views, deep links, and forward-branch truncation.');

const switchedAccount = memoryBrowser('https://eazily.test/user/home', {
  eazilyCustomerOwner: 'previous-account', eazilyDepth: 5,
  eazilyCustomerPage: { ...emptyCustomerPage, route: 'messages' },
  eazilyLayer: { scope: 'chat:previous-account:customer', value: { id: 'private-conversation' } },
});
const guestNav = createCustomerNavigator(switchedAccount, { owner: 'guest' });
const stopGuest = guestNav.subscribe(() => {});
assert.equal(guestNav.getSnapshot().route, 'home', 'Signing out cannot restore the previous account’s private screen.');
assert.equal(switchedAccount.history.state.eazilyLayer, undefined);
assert.equal(guestNav.back(), false, 'A new account starts with a safe app root.');
stopGuest();
console.log('PASS: account switching clears private navigation and conversation state.');

const reloadPanel = memoryBrowser('https://eazily.test/user/home', {
  eazilyCustomerOwner: 'same-account', eazilyDepth: 2, eazilyCustomerIndex: 2,
  eazilyCustomerPage: { ...emptyCustomerPage, route: 'profile' },
  eazilyLayer: { scope: 'account:same-account', value: 'My Bookings' },
});
const reloaded = createCustomerNavigator(reloadPanel, { owner: 'same-account' });
const detach = reloaded.subscribe(() => {});
assert.equal(reloadPanel.history.state.eazilyLayer.value, 'My Bookings', 'Mounting the navigator preserves the same account’s open panel.');
detach();
const detachAgain = reloaded.subscribe(() => {});
assert.equal(reloadPanel.history.state.eazilyLayer.value, 'My Bookings', 'Strict Mode resubscription does not erase a nested view.');
detachAgain();
console.log('PASS: existing account panels survive mount and resubscription.');
