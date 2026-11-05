const routes = new Set(['home', 'categories', 'bookings', 'messages', 'videos', 'profile']);
export const emptyCustomerPage = Object.freeze({ route: 'home', selectedMain: null, selectedGroup: null, service: null, vendor: null, bulkOrdersOrigin: null, scrollY: 0 });

export function readCustomerPage(state, href) {
  const saved = state?.eazilyCustomerPage;
  const page = { ...emptyCustomerPage, ...(saved || {
    route: state?.eazilyUserRoute,
    selectedMain: state?.eazilySelectedMain || null,
    selectedGroup: state?.eazilySelectedGroup || null,
  }) };
  if (!routes.has(page.route)) page.route = 'home';
  const params = new URL(href).searchParams;
  if (params.has('service')) {
    const name = params.get('service');
    page.service = page.service?.serviceName === name ? page.service : { serviceName: name, categoryId: params.get('category') || 'manpower' };
  } else { page.service = null; page.vendor = null; }
  return page;
}

export function customerPageUrl(href, page) {
  const url = new URL(href);
  for (const key of ['service', 'category', 'vendor']) url.searchParams.delete(key);
  if (page.service) {
    url.searchParams.set('service', page.service.serviceName);
    url.searchParams.set('category', page.service.categoryId || 'manpower');
    if (page.vendor?.id) url.searchParams.set('vendor', page.vendor.id);
  }
  return url.href;
}

// Browser history is the source of truth for Back, Forward, deep links and Android Back.
// The adapter also makes navigation testable without a browser or live account.
export function createCustomerNavigator(browser, { owner = 'guest' } = {}) {
  const { history, location } = browser;
  const belongsToOwner = () => !history.state?.eazilyCustomerOwner || history.state.eazilyCustomerOwner === owner;
  let page = readCustomerPage(belongsToOwner() ? history.state : {}, location.href);
  let index = belongsToOwner() ? Number(history.state?.eazilyCustomerIndex || 0) : 0;
  let lastIndex = index;
  let revision = 0;
  let snapshot;
  const listeners = new Set();
  const stateFor = (next, nextIndex) => ({
    ...history.state, sheet: undefined, eazilyFlow: undefined, eazilyLayer: undefined,
    eazilyCustomerOwner: owner,
    eazilyCustomerPage: next, eazilyCustomerIndex: nextIndex,
    eazilyUserRoute: next.route, eazilySelectedMain: next.selectedMain,
    eazilySelectedGroup: next.selectedGroup, servicePage: Boolean(next.service),
  });
  function publish() {
    snapshot = { ...page, revision: ++revision, canBack: (belongsToOwner() && Number(history.state?.eazilyDepth || 0) > 0) || Boolean(page.service || page.selectedMain || page.bulkOrdersOrigin || page.route !== 'home'), canForward: index < lastIndex };
    listeners.forEach(listener => listener());
  }
  function saveScroll() {
    page = { ...page, scrollY: Number(browser.scrollY || 0) };
    // Preserve an open Sheet's marker; scrolling must never change its history ownership.
    history.replaceState({ ...history.state, eazilyCustomerPage: page }, '', location.href);
  }
  function restore(event) {
    page = readCustomerPage(belongsToOwner() ? history.state : {}, location.href);
    index = Number(history.state?.eazilyCustomerIndex || 0);
    if (event?.type === 'eazily-navigation-change') lastIndex = index;
    publish();
  }
  function go(patch, options = {}) {
    saveScroll();
    const next = { ...page, ...patch, scrollY: options.preserveScroll ? page.scrollY : 0 };
    if (!options.replace && !history.state?.sheet && !history.state?.eazilyLayer && JSON.stringify({ ...page, scrollY: 0 }) === JSON.stringify({ ...next, scrollY: 0 })) {
      page = next;
      history.replaceState({ ...history.state, eazilyCustomerPage: page }, '', location.href);
      publish();
      return;
    }
    const replacingSheet = Boolean(history.state?.sheet);
    const nextIndex = options.replace ? index : index + 1;
    const nextState = { ...stateFor(next, nextIndex), eazilyDepth: Number(history.state?.eazilyDepth || 0) + (options.replace ? 0 : 1) };
    if (options.replace || replacingSheet) history.replaceState(nextState, '', customerPageUrl(location.href, next));
    else history.pushState(nextState, '', customerPageUrl(location.href, next));
    page = next; index = nextIndex;
    if (!options.replace) lastIndex = index;
    publish();
  }
  function back() {
    if (Number(history.state?.eazilyDepth || 0) > 0) { saveScroll(); history.back(); return true; }
    if (page.vendor) go({ vendor: null }, { replace: true, preserveScroll: true });
    else if (page.service || page.bulkOrdersOrigin) go({ service: null, vendor: null, bulkOrdersOrigin: null }, { replace: true });
    else if (page.selectedGroup) go({ selectedGroup: null }, { replace: true });
    else if (page.selectedMain) go({ selectedMain: null }, { replace: true });
    else if (page.route !== 'home') go({ ...emptyCustomerPage }, { replace: true });
    else return false;
    return true;
  }
  publish();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (!listeners.size) {
        const sameOwner = belongsToOwner();
        const depth = sameOwner ? Number(history.state?.eazilyDepth || 0) : 0;
        const layer = sameOwner ? history.state?.eazilyLayer : undefined;
        const sheet = sameOwner ? history.state?.sheet : undefined;
        if (sameOwner) {
          page = readCustomerPage(history.state, location.href);
          index = Number(history.state?.eazilyCustomerIndex || 0);
          lastIndex = Math.max(lastIndex, index);
        }
        history.replaceState({ ...stateFor(page, index), eazilyDepth: depth, eazilyLayer: layer, sheet }, '', location.href);
        browser.addEventListener('popstate', restore);
        browser.addEventListener('eazily-navigation-change', restore);
        browser.addEventListener('scroll', saveScroll, { passive: true });
        publish();
      }
      listeners.add(listener);
      return () => { listeners.delete(listener); if (!listeners.size) { browser.removeEventListener('popstate', restore); browser.removeEventListener('eazily-navigation-change', restore); browser.removeEventListener('scroll', saveScroll); } };
    },
    go, back,
    forward() { if (index < lastIndex) { saveScroll(); history.forward(); } },
  };
}
