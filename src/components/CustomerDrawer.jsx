import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { translate } from '../lib/translate.js';
import { catalog } from '../data/catalog.js';
import { useAccount, requestSignIn } from '../lib/account.js';
import './customer-drawer.css';

const accountPanels = [
  ['clipboard', 'My Bookings'],
  ['person', 'Saved Vendors'],
  ['rupee', 'Wallet'],
  ['message', 'Help & Support'],
  ['settings', 'App Preferences']
];

function focusable(drawer) {
  return [...drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(node => node.offsetParent !== null || node === document.activeElement);
}

export default function CustomerDrawer({
  open,
  onClose,
  account,
  onNavigate,
  onCategory,
  onPanel,
  onAddRole,
  onWorkspace
}) {
  const drawer = useRef(null);
  const closeButton = useRef(null);
  const restoreFocus = useRef(null);
  const { logout } = useAccount();

  useEffect(() => {
    if (!open) return undefined;
    restoreFocus.current = document.activeElement;
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    document.documentElement.classList.add('eazily-drawer-open');
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove('eazily-drawer-open');
      restoreFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !drawer.current) return;
      const nodes = focusable(drawer.current);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const signedIn = Boolean(account?.user);
  const name = account?.profile?.full_name?.trim() || account?.user?.user_metadata?.full_name || account?.user?.user_metadata?.name || '';
  const contact = account?.user?.phone || account?.user?.email || '';
  const roles = account?.roles || [];
  const partnerRole = ['professional', 'influencer', 'consultant'].find(role => roles.includes(role));

  const go = action => () => { onClose(); action(); };
  const openPanel = name => go(() => onPanel(name));
  const signIn = go(() => requestSignIn());
  const signOut = go(() => logout());

  return <div className={`customer-drawer-root${open ? ' is-open' : ''}`}>
    <button type="button" className="customer-drawer-scrim" tabIndex={-1} aria-label={translate('Close menu')} onClick={onClose} />
    <aside id="customer-drawer" ref={drawer} className="customer-drawer" role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label={translate('Menu')}>
      <header className="customer-drawer-head">
        <span className="drawer-avatar" aria-hidden="true">{(name || 'E').trim().charAt(0).toUpperCase()}</span>
        <span className="drawer-identity">
          <small>{translate(signedIn ? 'Hello' : 'Welcome')}</small>
          <b>{translate(name || (signedIn ? 'Eazily customer' : 'Sign in'))}</b>
          {contact && <small className="drawer-contact">{contact}</small>}
        </span>
        <button type="button" ref={closeButton} className="drawer-close" onClick={onClose} aria-label={translate('Close menu')}><Icon name="close" size={22} /></button>
      </header>

      <div className="customer-drawer-body">
        {!signedIn && <button type="button" className="drawer-signin" onClick={signIn}>{translate('Sign in to book services')}<Icon name="chevronRight" size={18} /></button>}

        <section className="drawer-section" aria-labelledby="drawer-shop">
          <h2 id="drawer-shop">{translate('Shop by category')}</h2>
          <button type="button" className="drawer-row" onClick={go(() => onCategory(null, null))}>
            <span className="drawer-row-icon"><Icon name="grid" size={20} /></span>
            <span className="drawer-row-label">{translate('All services')}</span>
            <Icon name="chevronRight" size={16} />
          </button>
          {catalog.slice(0, 6).map(category => <button type="button" className="drawer-row" key={category.id} onClick={go(() => onCategory(category.id, null))}>
            <span className="drawer-row-icon"><Icon name={category.icon || 'grid'} size={20} /></span>
            <span className="drawer-row-label">{translate(category.label)}</span>
            <Icon name="chevronRight" size={16} />
          </button>)}
        </section>

        <section className="drawer-section" aria-labelledby="drawer-account">
          <h2 id="drawer-account">{translate('Your account')}</h2>
          {accountPanels.map(([icon, panel]) => <button type="button" className="drawer-row" key={panel} onClick={signedIn ? openPanel(panel) : signIn}>
            <span className="drawer-row-icon"><Icon name={icon} size={20} /></span>
            <span className="drawer-row-label">{translate(panel)}</span>
            <Icon name="chevronRight" size={16} />
          </button>)}
        </section>

        <section className="drawer-section" aria-labelledby="drawer-more">
          <h2 id="drawer-more">{translate('More from Eazily')}</h2>
          <button type="button" className="drawer-row" onClick={go(() => onNavigate('messages'))}>
            <span className="drawer-row-icon"><Icon name="messageCircle" size={20} /></span>
            <span className="drawer-row-label">{translate('Messages')}</span>
            <Icon name="chevronRight" size={16} />
          </button>
          <button type="button" className="drawer-row" onClick={go(() => onNavigate('videos'))}>
            <span className="drawer-row-icon"><Icon name="clapperboard" size={20} /></span>
            <span className="drawer-row-label">{translate('Videos')}</span>
            <Icon name="chevronRight" size={16} />
          </button>
          <button type="button" className="drawer-row" onClick={openPanel('About Eazily')}>
            <span className="drawer-row-icon"><Icon name="sparkles" size={20} /></span>
            <span className="drawer-row-label">{translate('About Eazily')}</span>
            <Icon name="chevronRight" size={16} />
          </button>
        </section>

        <section className="drawer-section drawer-partner" aria-labelledby="drawer-earn">
          <h2 id="drawer-earn">{translate('Earn with Eazily')}</h2>
          {partnerRole
            ? <button type="button" className="drawer-row" onClick={go(() => onWorkspace?.(partnerRole))}>
              <span className="drawer-row-icon"><Icon name="briefcase" size={20} /></span>
              <span className="drawer-row-label">{translate('Open partner workspace')}</span>
              <Icon name="chevronRight" size={16} />
            </button>
            : <button type="button" className="drawer-row" onClick={go(() => onAddRole?.())}>
              <span className="drawer-row-icon"><Icon name="briefcase" size={20} /></span>
              <span className="drawer-row-label">{translate('Join as a partner')}</span>
              <Icon name="chevronRight" size={16} />
            </button>}
        </section>

        {signedIn && <button type="button" className="drawer-signout" onClick={signOut}>
          <Icon name="logout" size={20} />{translate('Sign out')}
        </button>}
        <p className="drawer-version">{translate('Eazily · Local services, made easy')}</p>
      </div>
    </aside>
  </div>;
}
