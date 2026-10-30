import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { translate } from './lib/translate.js';
import Icon from './components/Icon.jsx';
import { Brand, Toast } from './components/Ui.jsx';
import { partnerRoles } from './data/partners.js';
import { AccountContext } from './lib/account.js';
import { RealtimeProvider, useRealtimeController } from './lib/realtime.jsx';
import { ConsumerPolicyPage } from './features/legal/ConsumerLegal.jsx';
import { catalog } from './data/catalog.js';
import { artworkFor, assetById } from './features/user-art/artwork.js';
import { replaceNavigationState, useNativeShellBack } from './lib/nativeShell.js';
import { workspacePaths } from './lib/workspace.js';
import { PARTNER_DEMO_ENABLED } from './features/partners/demo/config.js';
import { useAuth } from './auth/useAuth.js';
import { routeAccess } from './auth/policy.js';
import { requireBackend } from './services/experience.js';
import ConnectionNotice from './components/ConnectionNotice.jsx';

const UserApp = lazy(() => import('./pages/UserApp.jsx'));
const DemoWorkspace = lazy(() => import('./features/partners/demo/DemoWorkspace.jsx'));
const AuthScreen = lazy(() => import('./auth/AuthScreen.jsx'));
const PasswordRecoveryScreen = lazy(() => import('./auth/PasswordRecoveryScreen.jsx'));
const PartnerApp = lazy(() => import('./pages/PartnerApp.jsx'));
const PartnerOnboarding = lazy(() => import('./features/partners/PartnerOnboarding.jsx'));
const AdminApp = lazy(() => import('./pages/AdminApp.jsx'));
function Loading() { return <main className="splash"><Brand/><p role="status">Loading...</p></main>; }
const WELCOME_COMPLETED_KEY = 'eazily-welcome-completed';
function hasCompletedWelcome() {
  try { return localStorage.getItem(WELCOME_COMPLETED_KEY) === 'true'; } catch { return false; }
}
function completeWelcome() {
  try { localStorage.setItem(WELCOME_COMPLETED_KEY, 'true'); } catch { /* Keep navigation working when storage is unavailable. */ }
}
function initialView() {
  if (location.pathname === '/user/home') return { stage: 'customer', role: 'customer' };
  const role = Object.entries(workspacePaths).find(([, path]) => path === location.pathname)?.[0];
  if (role) return { stage: 'workspace', role };
  return hasCompletedWelcome() ? { stage: 'customer', role: 'customer' } : { stage: 'welcome', role: 'customer' };
}
export default function App() {
  const auth = useAuth();
  const account = auth.account;
  const [view, setView] = useState(initialView);
  const authReturnView = useRef(view);
  const beginSignIn = useCallback(() => setView(current => { authReturnView.current = current; return { stage: 'auth', role: current.role || 'customer' }; }), []);
  const [toast, setToast] = useState('');
  const timer = useRef();
  const notify = useCallback((message, duration = 6000) => { clearTimeout(timer.current); setToast(message); timer.current = setTimeout(() => setToast(''), duration); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const enterCustomer = useCallback(() => { completeWelcome(); replaceNavigationState({ eazilyDepth: 0, eazilyWorkspace: 'customer' }, workspacePaths.customer); setView({ stage: 'customer', role: 'customer' }); }, []);
  const enterPartner = useCallback(role => { if (!workspacePaths[role]) return; completeWelcome(); replaceNavigationState({ eazilyDepth: 0, eazilyWorkspace: role }, workspacePaths[role]); setView({ stage: 'workspace', role }); }, []);
  const enterWelcome = useCallback(() => { replaceNavigationState({ eazilyDepth: 0 }, '/'); setView({ stage: 'welcome', role: 'customer' }); }, []);
  const leaveSignIn = () => { if (view.stage === 'auth') setView(authReturnView.current); else enterWelcome(); };
  useEffect(() => {
    const onSignIn = beginSignIn;
    const onPop = () => setView(initialView());
    window.addEventListener('eazily-sign-in', onSignIn);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('eazily-sign-in', onSignIn); window.removeEventListener('popstate', onPop); };
  }, [beginSignIn]);
  useEffect(() => {
    const completed = event => {
      const role = Object.entries(workspacePaths).find(([, path]) => path === event.detail?.path)?.[0] || 'customer';
      enterPartner(role);
    };
    const failed = () => beginSignIn();
    window.addEventListener('eazily-oauth-complete', completed);
    window.addEventListener('eazily-oauth-error', failed);
    return () => { window.removeEventListener('eazily-oauth-complete', completed); window.removeEventListener('eazily-oauth-error', failed); };
  }, [enterPartner, beginSignIn]);
  useEffect(() => {
    if (view.stage === 'auth' && account.user && ['authenticated', 'profile_required'].includes(auth.status)) enterPartner(view.role);
  }, [view.stage, view.role, account.user, auth.status, enterPartner]);
  useEffect(() => {
    if (account.user && ['authenticated', 'profile_required'].includes(auth.status) && view.stage === 'welcome') enterCustomer();
  }, [account.user, auth.status, view.stage, enterCustomer]);
  // A recovery link is only good for setting a password, so it overrides every view
  // until the controller reports the recovery session as spent.
  useEffect(() => {
    if (auth.recovery) enterWelcome();
  }, [auth.recovery, enterWelcome]);
  useNativeShellBack(() => {
    if (view.stage === 'auth') { leaveSignIn(); return true; }
    if (['partner-choice', 'demo', 'registration'].includes(view.stage)) { enterWelcome(); return true; }
    return false;
  }, view.stage === 'welcome', () => notify(translate('Press back again to exit'), 2200));
  const logout = async () => { await auth.controller.logout(); enterWelcome(); };
  const context = { ...account, requestAuth: beginSignIn, refresh: auth.controller.refresh, logout };
  const realtime = useRealtimeController({ user: account.user, workspace: view.role, onAuthoritativeRefresh: auth.controller.refresh });
  const access = routeAccess(account, view.role);
  const privateWorkspace = view.role !== 'customer' && ['workspace', 'registration'].includes(view.stage);
  const addRole = () => setView({ stage: 'partner-choice', role: view.role });
  const editRegistration = () => setView({ stage: 'registration', role: view.role });
  const enterDemo = PARTNER_DEMO_ENABLED ? () => setView({ stage: 'demo', role: view.role }) : undefined;
  let content;
  if (auth.recovery) content = <PasswordRecoveryScreen auth={auth} onDone={() => enterCustomer()} />;
  else if (location.pathname === '/terms' || location.pathname === '/privacy') content = <ConsumerPolicyPage kind={location.pathname === '/terms' ? 'terms' : 'privacy_policy'} />;
  else if (view.stage === 'welcome') content = <Welcome onCustomer={enterCustomer} onService={enterCustomer} onPartner={addRole} onEnterDemo={enterDemo} />;
  else if (view.stage === 'partner-choice') content = <PartnerChoice onSelect={enterPartner} onBack={enterWelcome} />;
  else if (view.stage === 'demo' && PARTNER_DEMO_ENABLED) content = <DemoWorkspace initialRole={view.role} onExit={enterWelcome} />;
  else if (auth.status === 'initialising' && (privateWorkspace || view.stage === 'auth')) content = <Loading />;
  else if (auth.status === 'error' && !account.user && !auth.contact && (privateWorkspace || view.stage === 'auth')) content = <main className="setup"><p role="alert">{auth.error}</p><button className="btn btn-primary" onClick={() => void auth.controller.refresh()}>Retry account access</button><button className="link" onClick={enterWelcome}>Back</button></main>;
  else if (view.stage === 'auth' || (privateWorkspace && !account.user)) content = <AuthScreen auth={auth} partnerRole={view.role === 'customer' || view.role === 'admin' ? null : view.role} onContinue={() => enterPartner(view.role)} onBack={leaveSignIn} onEnterDemo={enterDemo} />;
  else if (account.user && auth.status === 'profile_required') content = <ProfileSetup account={account} onSaved={auth.controller.refresh} notify={notify} logout={logout} />;
  else if (account.user && ['blocked', 'suspended'].includes(auth.status)) content = <main className="setup"><h1>Account access restricted</h1><p>Contact support to review your account status.</p><button className="btn btn-outline" onClick={logout}>Sign out</button></main>;
  else if (privateWorkspace && view.role === 'admin' && access === 'allowed') content = <AdminApp notify={notify} account={account} logout={logout} />;
  else if (privateWorkspace && (['registration', 'assessment_required'].includes(access) || view.stage === 'registration' && access === 'allowed')) content = <PartnerOnboarding key={view.role} role={view.role} account={account} existing={account.applications.find(item => item.role === view.role)} notify={notify} onDone={async () => { await auth.controller.refresh(); enterPartner(view.role); }} onBack={enterCustomer} onPreview={enterDemo} />;
  else if (privateWorkspace && access === 'allowed') content = <PartnerApp key={view.role} role={view.role} account={account} notify={notify} onWorkspace={enterPartner} onAddRole={addRole} onEditRegistration={editRegistration} />;
  else if (privateWorkspace) content = <main className="setup"><h1>Workspace unavailable</h1><p>{access === 'denied' ? 'Your account does not have access to this workspace.' : `Application status: ${access.replaceAll('_', ' ')}.`}</p><button className="btn btn-outline" onClick={enterCustomer}>Customer home</button><button className="link" onClick={logout}>Sign out</button></main>;
  else content = <UserApp key={account.user?.id || 'guest'} notify={notify} account={account} onWorkspace={enterPartner} onAddRole={addRole} />;
  return <AccountContext.Provider value={context}><RealtimeProvider value={realtime}><div className={'phone-shell peazily-ui' + (view.role === 'customer' && ['customer', 'workspace'].includes(view.stage) ? ' customer-workspace' : '')}><ConnectionNotice accountError={account.user && auth.error ? auth.error : ''} onRefresh={auth.controller.refresh}/><Suspense fallback={<Loading/>}>{content}</Suspense><Toast message={toast}/></div></RealtimeProvider></AccountContext.Provider>;
}
function ProfileSetup({ account, onSaved, notify, logout }) {
  // Google supplies a name; only ask for what the provider did not give us.
  const suggested = account.profile?.full_name?.trim() || account.user?.user_metadata?.full_name || account.user?.user_metadata?.name || '';
  const [name, setName] = useState(suggested);
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault(); if (busy) return;
    if (!name.trim()) return notify('Enter your full name.');
    setBusy(true);
    try {
      const { error } = await requireBackend().from('profiles').update({ full_name: name.trim() }).eq('id', account.user.id).select('id').single();
      if (error) throw error;
      await onSaved();
    } catch (error) { notify(error.message); } finally { setBusy(false); }
  }
  return <main className="setup"><form className="setup-body" onSubmit={save}><h1>Complete your profile</h1>{!account.profile?.full_name?.trim() && suggested && <p className="lead">Confirm the name Google shared with us.</p>}<label className="form-label" htmlFor="profile-name">Full name</label><input className="field" id="profile-name" autoComplete="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} /><button className="btn btn-primary full" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button><button type="button" className="link" onClick={logout}>Sign out</button></form></main>;
}
const welcomeServiceGroups = catalog.find(item => item.id === 'manpower')?.groups || [];
const welcomePreviewServices = [...new Map(Array.from({ length: Math.max(0, ...welcomeServiceGroups.map(group => group.items.length)) }, (_, index) => welcomeServiceGroups.map(group => group.items[index])).flat().filter(Boolean).map(name => {
  const [id] = artworkFor(name);
  return [id, { name, src: assetById[id] }];
})).values()].filter(item => item.src);
function Welcome({
  onCustomer,
  onService,
  onPartner,
  onEnterDemo
}) {
  const [previewStart, setPreviewStart] = useState(0);
  const previewTouching = useRef(false);
  useEffect(() => {
    if (welcomePreviewServices.length <= 8) return undefined;
    const timer = window.setInterval(() => {
      if (document.hidden || previewTouching.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setPreviewStart(index => (index + 8) % welcomePreviewServices.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);
  const visibleServices = Array.from({ length: Math.min(8, welcomePreviewServices.length) }, (_, index) => welcomePreviewServices[(previewStart + index) % welcomePreviewServices.length]);
  return <main className="welcome-screen welcome-entry">
    <div className="welcome-intro"><span className="eyebrow">{translate('Welcome to Eazily')}</span><h1>{translate('What would you like to do?')}</h1></div>
    <div className="welcome-tabs" role="tablist" aria-label="Choose your Eazily experience">
      <button type="button" role="tab" id="welcome-customer-tab" aria-selected="true" aria-controls="welcome-customer-preview" onClick={onCustomer}><Icon name="search" size={18} /><span>{translate('Find & Book Services')}</span></button>
      <button type="button" role="tab" aria-selected="false" onClick={onPartner}><Icon name="briefcase" size={18} /><span>{translate('Join as a Partner')}</span></button>
    </div>
    <section className="welcome-customer-preview" id="welcome-customer-preview" role="tabpanel" aria-labelledby="welcome-customer-tab">
      <button type="button" className="welcome-preview-tap" aria-label={translate('Open Find & Book Services')} onClick={onService} onPointerDown={() => { previewTouching.current = true; }} onPointerUp={() => { previewTouching.current = false; }} onPointerCancel={() => { previewTouching.current = false; }}>
      <span className="welcome-preview-grid">{visibleServices.map(({ name, src }) => <span className="welcome-preview-image" key={src}><img src={src} alt="" loading="eager" decoding="async" draggable="false" /><span>{translate(name)}</span></span>)}</span>
      </button>
    </section>
    <p className="welcome-sign-in">Browse services. Sign in to save your profile and submit a booking.</p>
    {PARTNER_DEMO_ENABLED && onEnterDemo && <button type="button" className="btn btn-outline welcome-demo-entry" onClick={onEnterDemo}>Enter Demo Mode</button>}
  </main>;
}
function PartnerChoice({
  onSelect,
  onBack
}) {
  return <main className="welcome-screen"><button className="icon-btn" onClick={onBack}><Icon name="arrowLeft" /></button><section><span className="eyebrow">{translate("Eazily Partner")}</span><h1>{translate("Choose how you want to earn")}</h1>{Object.entries(partnerRoles).map(([role, info]) => <button className="welcome-choice" key={role} onClick={() => onSelect(role)} style={{
        '--role': info.colour
      }}><Icon name={info.icon} /><span><b>{info.label}</b><small>{info.description}</small></span><Icon name="chevronRight" /></button>)}</section></main>;
}
