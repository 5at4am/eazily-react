import Icon from '../../components/Icon.jsx';
import { partnerRoles } from '../../data/partners.js';
import { translate as t } from '../../lib/translate.js';

const dashboardTitle = (role, view) => {
  const routeTitles = { growth: 'Business growth', earnings: 'Earnings', orders: 'Jobs', profile: 'My Profile' };
  if (routeTitles[view]) return routeTitles[view];
  return role === 'influencer' ? 'Creator home' : role === 'professional' ? 'Service home' : 'Consultation home';
};

const pageTitle = (role, route) => ({
  orders: 'Jobs',
  profile: 'My Profile',
  post: role === 'professional' ? 'My Services' : 'My Posts',
  messages: 'Messages',
}[route] || 'Home');

const creatorPageTitle = view => ({ home: 'Home', orders: 'Jobs', growth: 'Growth', profile: 'Profile' }[view] || 'Home');

/** Shared partner header for dashboard and workspace routes. */
export default function PartnerPageHeader({
  role,
  name,
  profile = {},
  approved = false,
  notifications = 0,
  setRoute,
  setSheet,
  onBack,
  variant = 'page',
  view = 'home',
  route = 'home',
  greeting,
}) {
  if (variant === 'dashboard' && role === 'influencer') {
    const displayName = profile.name || profile.creatorName || name || partnerRoles[role].label;
    return <header className="pd-topbar pd-topbar-compact">
      <h1 className="pd-view-title">{t(creatorPageTitle(view))}</h1>
      <nav className="pd-header-actions" aria-label={t('Partner tools')}>
        <button type="button" className="pd-icon-button" aria-label={t('Messages')} onClick={() => setRoute('messages')}><Icon name="message" size={19} /></button>
        <button type="button" className="pd-icon-button" aria-label={t('Notifications')} onClick={() => setSheet('Notifications')}><Icon name="bell" size={19} />{notifications > 0 && <span className="pd-notification-count">{notifications}</span>}</button>
        <button type="button" className="pd-avatar" aria-label={t('View Profile')} onClick={() => setRoute('profile')}>{displayName.charAt(0).toUpperCase()}</button>
        <button type="button" className="pd-switch" aria-label={t('Switch workspace')} onClick={() => setSheet('workspace')}><Icon name="grid" size={17} /></button>
      </nav>
    </header>;
  }

  if (variant === 'dashboard') {
    const displayName = profile.name || profile.creatorName || name || partnerRoles[role].label;
    return <header className="pd-topbar">
      <div className="pd-topbar-row">
        <div className="pd-welcome"><p className="pd-greeting">{t(greeting)}, {displayName}</p><p className="pd-role-location"><span>{t(partnerRoles[role].label)}</span>{profile.city && <><span aria-hidden="true">·</span><span>{profile.city}</span></>}<span className={`pd-verification${approved ? ' is-approved' : ''}`}><Icon name={approved ? 'check' : 'clock'} size={13} />{t(approved ? 'Verified' : 'Review pending')}</span></p></div>
        <nav className="pd-header-actions" aria-label={t('Partner tools')}><button type="button" className="pd-icon-button" aria-label={t('Messages')} onClick={() => setRoute('messages')}><Icon name="message" size={19} /></button><button type="button" className="pd-icon-button" aria-label={t('Notifications')} onClick={() => setSheet('Notifications')}><Icon name="bell" size={19} />{notifications > 0 && <span className="pd-notification-count">{notifications}</span>}</button><button type="button" className="pd-avatar" aria-label={t('View Profile')} onClick={() => setRoute('profile')}>{displayName.charAt(0).toUpperCase()}</button><button type="button" className="pd-switch" aria-label={t('Switch workspace')} onClick={() => setSheet('workspace')}><Icon name="grid" size={17} /></button></nav>
      </div>
      <h1 className="pd-view-title">{t(dashboardTitle(role, view))}</h1>
    </header>;
  }

  const title = pageTitle(role, route);
  const displayName = profile.name || profile.creatorName || name || partnerRoles[role].label;
  return <header className="topbar partner-header dashboard-header">
    <div className="dashboard-header-top">
      <button type="button" className="icon-btn" aria-label={t('Go back')} onClick={onBack || (() => setRoute('home'))}><Icon name="arrowLeft" /></button>
      <div className="dashboard-role"><span className="dashboard-avatar">{displayName.charAt(0).toUpperCase()}</span><small>{t(partnerRoles[role].label)}</small></div>
      <div className="dashboard-header-actions"><button className="icon-btn notification-button" aria-label={t('Notifications')} onClick={() => setSheet('Notifications')}><Icon name="bell" size={19} />{notifications > 0 && <b>{notifications}</b>}</button><button className="workspace-button" onClick={() => setSheet('workspace')}>{t('Switch')}</button></div>
    </div>
    <div className="dashboard-header-greeting"><h1>{t(title)}</h1></div>
  </header>;
}
