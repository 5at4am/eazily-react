import { translate } from "../lib/translate.js";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Icon from "../components/Icon.jsx";
import { BottomNav, EmptyState, SearchBox } from "../components/Ui.jsx";
import { createSearchIndex } from "../data/catalog.js";
import { useCatalog } from '../data/useCatalog.js';
import { displayInfluencerCategory } from "../data/influencerCategories.js";
import { displayConsultantCategory } from "../data/consultantCategories.js";
import RequestSheet from "../features/requests/RequestSheet.jsx";
import UserHome from "../features/home/UserHome.jsx";
import ServiceExperience from "../features/services/ServiceExperience.jsx";
import RoleMarketplace from '../features/services/RoleMarketplace.jsx';
import CustomerAccount from "../features/account/CustomerAccount.jsx";
import { canonicalService } from "../services/experience.js";
import { requestSignIn } from '../lib/account.js';
import ServiceIllustration from '../features/user-art/ServiceIllustration.jsx';
import '../features/user-art/compact-services.css';
import '../features/user-motion/user-motion.css';
import { usePublicRealtimeAudience, useRealtime } from '../lib/realtime.jsx';
import ChatWorkspace from '../features/chat/ChatWorkspace.jsx';
import { startChat } from '../services/chat.js';
import { ConsumerConsentHost } from '../features/legal/ConsumerLegal.jsx';
import { IN_APP_BACK_EVENT } from '../lib/nativeShell.js';
import { createCustomerNavigator } from '../lib/customerNavigation.js';
import CustomerNavigation from '../components/CustomerNavigation.jsx';
import CustomerDrawer from '../components/CustomerDrawer.jsx';
import { getCustomerProfessionalById } from '../services/marketplace.js';
import BulkOrders from '../features/bulk-orders/BulkOrders.jsx';
import CustomerVideos from '../features/videos/CustomerVideos.jsx';
import { CustomerPartnerBookings } from '../features/services/PartnerOfferings.jsx';
import { PARTNER_DEMO_ENABLED } from '../features/partners/demo/config.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
export default function UserApp({
  notify, account, onWorkspace, onAddRole
}) {
  const catalog = useCatalog();
  const isolatedDemo = PARTNER_DEMO_ENABLED && !isSupabaseConfigured && !account?.user;
  const { revision: realtimeRevision } = useRealtime();
  const [navigation] = useState(() => createCustomerNavigator(window, { owner: account?.user?.id || 'guest' }));
  const page = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot);
  const { route, selectedMain, selectedGroup, service, vendor, bulkOrdersOrigin } = page;
  const categorySidebar = useRef(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [request, setRequest] = useState(null);
  const [profileSheet, setProfileSheet] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchFocusToken, setSearchFocusToken] = useState(0);
  const [chatTarget, setChatTarget] = useState(null);
  useEffect(() => {
    const sidebar = categorySidebar.current;
    const active = sidebar?.querySelector('.group-nav.active');
    if (active && sidebar.scrollHeight > sidebar.clientHeight) {
      const item = active.getBoundingClientRect(), viewport = sidebar.getBoundingClientRect();
      sidebar.scrollTop += item.top - viewport.top - (sidebar.clientHeight - item.height) / 2;
    }
  }, [selectedGroup, selectedMain, route, service]);
  const [location, setLocation] = useState(() => localStorage.getItem('eazily-city') || 'Bhopal');
  usePublicRealtimeAudience(location);
  useEffect(() => {
    localStorage.setItem('eazily-city', location);
  }, [location]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('vendor');
    if (!id || !service || vendor?.id === id) return undefined;
    let active = true;
    getCustomerProfessionalById(id, service.serviceName, location).then(profile => {
      if (active) navigation.go({ vendor: profile }, { replace: true, preserveScroll: true });
    }).catch(error => { if (active) notify(error.message); });
    return () => { active = false; };
  }, [notify, realtimeRevision, service, vendor?.id, location, navigation]);
  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo({ top: page.scrollY || 0, behavior: 'instant' });
    return () => { history.scrollRestoration = previous; };
  }, [page.revision, page.scrollY]);
  useEffect(() => {
    const back = event => {
      if (event.detail.handled) return;
      if (drawerOpen) { setDrawerOpen(false); event.detail.handled = true; return; }
      event.detail.handled = navigation.back();
    };
    window.addEventListener(IN_APP_BACK_EVENT, back);
    return () => window.removeEventListener(IN_APP_BACK_EVENT, back);
  }, [navigation, drawerOpen]);
  function setVendor(next) {
    if (!next) { navigation.back(); return; }
    navigation.go({ vendor: next }, { preserveScroll: true });
  }
  function openService(next, specificVendor = null) {
    if (!account?.user && !isolatedDemo) { requestSignIn(); return; }
    const selection = { ...next, serviceName: canonicalService(next.serviceName) };
    if (['loans', 'transportation', 'blood-bank'].includes(selection.categoryId)) { setRequest(selection); return; }
    navigation.go({ service: selection, vendor: specificVendor, bulkOrdersOrigin: null });
    setSearch('');
  }
  function leaveService() { navigation.back(); }
  function openVendor(v) {
    openService({
      categoryId: v.partner_role === 'influencer' ? 'influencers' : v.partner_role === 'consultant' ? 'consultancy' : v.category_id || 'manpower',
      serviceName: v.partner_role === 'influencer'
        ? displayInfluencerCategory(v.service_names?.[0] || v.profession)
        : v.partner_role === 'consultant'
          ? displayConsultantCategory(v.service_names?.[0] || v.profession)
          : v.service_names?.[0] || canonicalService(v.profession),
      directProvider: true
    }, v);
  }
  function closeVendor() { navigation.back(); }
  function setBulkOrdersOrigin(origin) {
    if (origin) navigation.go({ bulkOrdersOrigin: origin, service: null, vendor: null });
    else navigation.back();
  }
  const searchIndex = useMemo(() => createSearchIndex(catalog), [catalog]);
  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return searchIndex.filter(item => [item.name, item.path, ...(item.aliases ?? [])].join(" ").toLowerCase().includes(query)).slice(0, 10);
  }, [search, searchIndex]);
  function openPanel(name) { setProfileSheet(name); navigate('profile'); }
  function navigate(next) {
    setDrawerOpen(false);
    if (next === 'messages' && !account?.user) { requestSignIn(); return; }
    if (next === route && !service && !bulkOrdersOrigin) { window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    navigation.go({ route: next, selectedMain: next === 'categories' ? selectedMain : null, selectedGroup: next === 'categories' ? selectedGroup : null, service: null, vendor: null, bulkOrdersOrigin: null });
  }
  function showCategories(main = null, group = null) {
    setDrawerOpen(false);
    navigation.go({ route: 'categories', selectedMain: main, selectedGroup: group, service: null, vendor: null, bulkOrdersOrigin: null });
  }
  function openSearch() {
    if (service || bulkOrdersOrigin) navigation.go({ service: null, vendor: null, bulkOrdersOrigin: null });
    else if (route !== 'categories' && route !== 'home') navigate('categories');
    else setDrawerOpen(false);
    setSearchFocusToken(token => token + 1);
  }
  function startBooking(next) {
    if (!account?.user && !next.demo) { requestSignIn(); return; }
    setRequest(next);
  }
  async function messageProvider(postId) {
    if (!account?.user) { requestSignIn(); return; }
    if (!postId) return notify('This provider does not have a published messaging profile.');
    try {
      const conversation = await startChat({ postId });
      setChatTarget(conversation.id);
      navigate('messages');
    } catch (error) { notify(error.message); }
  }
  function selectMain(id) { showCategories(id); }
  function selectGroup(id) { showCategories(selectedMain, id); }
  function selectSearchResult(item) {
    setSearch('');
    showCategories(item.mainId, item.groupId ?? null);
    const main = catalog.find(entry => entry.id === item.mainId);
    const isMain = main?.label === item.name;
    const isGroup = main?.groups?.some(group => group.label === item.name);
    if (!isMain && !isGroup) openService({ categoryId: item.mainId, serviceName: item.name });
  }
  function SearchArea() {
    return <div className="search-area">
        <SearchBox value={search} onChange={setSearch} />
        {translate(search ? <div className="search-results">{translate(results.length ? results.map(item => <button key={item.path} onClick={() => selectSearchResult(item)}><b>{translate(item.name)}</b><small>{translate(item.path)}</small></button>) : <EmptyState title="No matches found" text="Try another spelling or a simpler word." icon="search" />)}</div> : null)}
      </div>;
  }
  function Home() {
    return <UserHome route={route} navigate={navigate} selectMain={selectMain} setRequest={openService} setProfileSheet={openPanel} onMenu={() => setDrawerOpen(true)} onBulkOrders={() => setBulkOrdersOrigin('home')} onVendor={openVendor} onMessage={messageProvider} city={location} onCityChange={setLocation} notify={notify} searchArea={SearchArea()} demoMode={isolatedDemo} />;
  }
  function Categories() {
    const main = catalog.find(category => category.id === selectedMain) ?? null;
    const group = main?.groups?.find(entry => entry.id === selectedGroup) ?? null;
    const items = group?.items ?? main?.items ?? [];
    return <main className={'screen catalog-screen user-art-catalog' + (main && (!main.groups || group) ? ' user-compact-services' : main?.groups ? ' user-group-selection' : '')}>
        <header className="catalog-header">{translate(SearchArea())}</header>
        <div className="catalog-layout">
          {translate(main?.groups && group ? <aside className="catalog-side" ref={categorySidebar} aria-label={translate('Service groups')}><button className="all-back" onClick={() => showCategories()}><Icon name="arrowLeft" /><span>{translate("Back")}</span></button>{translate(main.groups.map(entry => <button className={`group-nav ${selectedGroup === entry.id ? "active" : ""}`} aria-current={selectedGroup === entry.id ? 'true' : undefined} key={entry.id} onClick={() => selectGroup(entry.id)}><ServiceIllustration name={entry.label} /><span>{translate(entry.label)}</span></button>))}</aside> : null)}
          <section className="catalog-content">
            {translate(!main ? <><section className="catalog-welcome"><h1>{translate("Choose a category")}</h1></section><div className="main-category-grid">{translate(catalog.map(category => <button className="main-category-card" onClick={() => selectMain(category.id)} key={category.id}><i className="main-category-image"><ServiceIllustration name={category.label} /></i><span className="main-category-content"><span className="main-category-name">{translate(category.label)}</span><small>{translate("View options")}</small></span></button>))}</div></> : null)}
            {translate(main?.groups && !group ? <><Breadcrumb main={main} /><section className="catalog-welcome compact"><h1>{translate("Choose a service group")}</h1></section><div className="group-card-grid">{translate(main.groups.map(entry => <button className="group-card" key={entry.id} onClick={() => selectGroup(entry.id)}><i><ServiceIllustration name={entry.label} /></i><span><b>{translate(entry.label)}</b><small>{translate(entry.items.length)}{translate(" options")}</small></span><Icon name="chevronRight" /></button>))}</div></> : null)}
            {translate(main && (!main.groups || group) ? <><Breadcrumb main={main} group={group} /><section className="catalog-welcome compact"><h1>{translate(group?.label ?? main.label)}</h1>{translate(main.filter ? <div className={`filter-chips${main.id === "influencers" ? " influencer-tier-selector" : ""}`} aria-label={main.id === "influencers" ? "Influencer follower range" : undefined}>{translate(main.filter.map(entry => <button className={filter === entry ? "active" : ""} key={entry} onClick={() => setFilter(entry)}>{translate(entry)}</button>))}</div> : null)}</section><div className="service-option-grid" key={group?.id || main.id}>{translate(items.map(name => <button className="service-option" key={name} onClick={() => openService({
                categoryId: main.id,
                serviceName: name
              })}><i><ServiceIllustration name={name} /></i><span>{translate(name)}</span></button>))}</div></> : null)}
          </section>
        </div>
        <BottomNav route={route} onChange={navigate} />
      </main>;
  }
  function Breadcrumb({
    main,
    group
  }) {
    return <div className="crumb"><button onClick={() => showCategories()}><Icon name="arrowLeft" size={14} />{translate("All Categories")}</button><Icon name="chevronRight" size={15} />{group ? <button onClick={() => showCategories(main.id)}>{translate(main.label)}</button> : <b>{translate(main.label)}</b>}{translate(group ? <><Icon name="chevronRight" size={15} /><b>{translate(group.label)}</b></> : null)}</div>;
  }
  function Messages() {
    return <main className="screen"><header className="topbar"><h1 className="greeting">{translate("Messages")}</h1></header><ChatWorkspace initialConversationId={chatTarget} onConversationHandled={() => setChatTarget(null)} notify={notify} /><BottomNav route={route} onChange={navigate} /></main>;
  }
  function Bookings() {
    return <main className="screen customer-bookings-page"><header className="topbar"><h1 className="greeting">{translate('My Bookings')}</h1><p>{translate('Check replies, prices and booking progress here.')}</p></header><CustomerPartnerBookings notify={notify} onBrowse={() => navigate('categories')} /><BottomNav route={route} onChange={navigate} /></main>;
  }
  const pages = {
    home: Home(),
    categories: Categories(),
    bookings: Bookings(),
    messages: Messages(),
    videos: <CustomerVideos route={route} onNavigate={navigate} notify={notify} />,
    profile: <CustomerAccount initialPanel={profileSheet} onInitialHandled={setProfileSheet} notify={notify} onVendor={openVendor} onNavigate={navigate} account={account} onWorkspace={onWorkspace} onAddRole={onAddRole} />
  };
  const servicePage = service && (['influencers', 'consultancy'].includes(service.categoryId)
    ? <RoleMarketplace key={service.serviceName} service={service} initialProvider={vendor} onSelectProvider={setVendor} onCloseProvider={closeVendor} managedNavigation onBack={leaveService} onMessage={messageProvider} notify={notify} />
    : <ServiceExperience key={service.serviceName} service={service} vendor={vendor} setVendor={setVendor} managedNavigation onService={openService} onBook={startBooking} onMessage={messageProvider} onBack={leaveService} onCloseVendor={closeVendor} location={location} setLocation={setLocation} notify={notify} demoMode={isolatedDemo} />);
  const pageKey = bulkOrdersOrigin ? `bulk-orders:${bulkOrdersOrigin}` : service ? `service:${service.categoryId}:${service.serviceName}` : `route:${route}`;
  const activePage = bulkOrdersOrigin ? <BulkOrders profile={account?.profile} accountId={account?.user?.id} onBack={() => setBulkOrdersOrigin(null)} /> : servicePage || pages[route] || pages.home;
  const main = catalog.find(category => category.id === selectedMain);
  const group = main?.groups?.find(item => item.id === selectedGroup);
  const title = bulkOrdersOrigin ? 'Bulk orders' : service ? (vendor ? 'Professional profile' : service.serviceName) : route === 'categories' ? (group?.label || main?.label || 'Services') : ({ home: 'Home', bookings: 'My Bookings', messages: 'Messages', videos: 'Videos', profile: 'My profile' }[route] || 'Home');
  const drilledIn = Boolean(service || bulkOrdersOrigin || selectedMain || selectedGroup || vendor);
  const showAppBar = route !== 'home' || drilledIn;
  useEffect(() => {
    if (!searchFocusToken) return undefined;
    const timer = window.setTimeout(() => {
      const input = document.querySelector('.user-app-root .catalog-search input');
      if (!input) return;
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      input.focus({ preventScroll: true });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [searchFocusToken]);
  return <div className="user-app-root">
      {showAppBar && <CustomerNavigation title={title} canBack={drilledIn} onBack={() => navigation.back()} onOpenMenu={() => setDrawerOpen(true)} menuOpen={drawerOpen} onSearch={openSearch} />}
      <CustomerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} account={account} onNavigate={navigate} onCategory={showCategories} onPanel={openPanel} onAddRole={onAddRole} onWorkspace={onWorkspace} />
      <ConsumerConsentHost /><Fragment key={pageKey}>{translate(activePage)}</Fragment>{(service || bulkOrdersOrigin) && <BottomNav route={service ? 'categories' : route} onChange={navigate} />}{translate(request ? <RequestSheet request={request} onClose={() => setRequest(null)} notify={notify} /> : null)}</div>;
}
