import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { translate } from './lib/translate.js';
import Icon from './components/Icon.jsx';
import { Brand, Toast } from './components/Ui.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { partnerRoles } from './data/partners.js';
import { AccountContext } from './lib/account.js';
import { RealtimeProvider } from './lib/realtime.jsx';
import { ConsumerPolicyPage } from './features/legal/ConsumerLegal.jsx';
import { catalog } from './data/catalog.js';
import { artworkFor, assetById } from './features/user-art/artwork.js';
import { replaceNavigationState, useNativeShellBack } from './lib/nativeShell.js';
import { workspacePaths } from './lib/workspace.js';
import { PARTNER_DEMO_ENABLED } from './features/partners/demo/config.js';

const UserApp = lazy(() => import('./pages/UserApp.jsx'));
const DemoWorkspace = lazy(() => import('./features/partners/demo/DemoWorkspace.jsx'));
const guest = { user: null, profile: null, roles: [], applications: [], isAdmin: false };
const offlineRealtime = { available: false, connectionState: 'Offline', networkOnline: true, revision: 0, scopes: [], lastSyncedAt: null, setPublicAudience: () => {}, retry: () => {} };
function Loading() { return <main className="splash"><Brand/><p role="status">Loading...</p></main>; }
function initialView() {
  if (location.pathname === '/user/home') return { stage: 'customer', role: 'customer' };
  const role = Object.entries(workspacePaths).find(([key, path]) => key !== 'admin' && key !== 'customer' && path === location.pathname)?.[0];
  return role ? { stage: 'demo', role } : { stage: 'welcome', role: 'customer' };
}
export default function App() {
  const [view, setView] = useState(initialView);
  const [toast, setToast] = useState('');
  const timer = useRef();
  const notify = useCallback(message => { clearTimeout(timer.current); setToast(message); timer.current = setTimeout(() => setToast(''), 3400); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const enterCustomer = useCallback(() => { replaceNavigationState({ eazilyDepth: 0, eazilyWorkspace: 'customer' }, workspacePaths.customer); setView({ stage: 'customer', role: 'customer' }); }, []);
  const enterPartner = useCallback(role => { replaceNavigationState({ eazilyDepth: 0, eazilyWorkspace: role }, workspacePaths[role]); setView({ stage: 'demo', role }); }, []);
  const enterWelcome = useCallback(() => { replaceNavigationState({ eazilyDepth: 0 }, '/'); setView({ stage: 'welcome', role: 'customer' }); }, []);
  useEffect(() => {
    const onSignIn = () => notify('Local sample only. Account sign-in and saved requests are unavailable.');
    const onPop = () => setView(initialView());
    window.addEventListener('eazily-sign-in', onSignIn);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('eazily-sign-in', onSignIn); window.removeEventListener('popstate', onPop); };
  }, [notify]);
  useNativeShellBack(() => {
    if (view.stage === 'partner-choice' || view.stage === 'demo') { enterWelcome(); return true; }
    return false;
  }, view.stage === 'welcome');
  const context = { ...guest, requestAuth: () => notify('Local sample only. Sign-in is unavailable.'), refresh: async () => guest, logout: enterWelcome };
  let content;
  if (location.pathname === '/terms' || location.pathname === '/privacy') content = <ConsumerPolicyPage kind={location.pathname === '/terms' ? 'terms' : 'privacy_policy'} />;
  else if (view.stage === 'welcome') content = <Welcome onCustomer={enterCustomer} onService={enterCustomer} onPartner={() => setView({ stage: 'partner-choice', role: 'customer' })} onEnterDemo={() => setView({ stage: 'demo', role: 'customer' })} />;
  else if (view.stage === 'partner-choice') content = <PartnerChoice onSelect={enterPartner} onBack={enterWelcome} />;
  else if (view.stage === 'demo') content = <DemoWorkspace initialRole={view.role} onExit={enterWelcome} />;
  else content = <UserApp notify={notify} account={guest} onWorkspace={enterPartner} onAddRole={() => setView({ stage: 'partner-choice', role: 'customer' })} />;
  return <AccountContext.Provider value={context}><RealtimeProvider value={offlineRealtime}><div className={'phone-shell' + (view.stage === 'customer' ? ' customer-workspace' : '')}><ErrorBoundary label={translate('this screen')}><Suspense fallback={<Loading/>}>{content}</Suspense></ErrorBoundary><Toast message={toast}/></div></RealtimeProvider></AccountContext.Provider>;
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
    <p className="welcome-sign-in">Local sample preview. No account, booking or payment is created.</p>
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
