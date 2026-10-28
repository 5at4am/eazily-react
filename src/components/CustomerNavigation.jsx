import Icon from './Icon.jsx';
import { translate } from '../lib/translate.js';
import './customer-navigation.css';

/**
 * Android app bar.
 *
 * Root screens show the menu button (drawer), drilled-in screens show back.
 * The browser-style forward/home buttons were removed: Android users expect
 * the system back gesture, and the drawer carries the "go home" shortcut.
 */
export default function CustomerNavigation({
  title,
  canBack = false,
  onBack,
  onOpenMenu,
  menuOpen = false,
  onSearch,
  showSearch = true
}) {
  return <header className="customer-navigation" role="banner">
    {canBack
      ? <button type="button" className="nav-action page-back" onClick={onBack} aria-label={translate('Back')}><Icon name="arrowLeft" size={22} /></button>
      : <button type="button" className="nav-action menu-button" onClick={onOpenMenu} aria-label={translate('Open menu')} aria-expanded={menuOpen} aria-controls="customer-drawer"><Icon name="menu" size={22} /></button>}
    <span className="page-navigation-title" aria-live="polite">{translate(title)}</span>
    {showSearch && <button type="button" className="nav-action" onClick={onSearch} aria-label={translate('Search')}><Icon name="search" size={21} /></button>}
  </header>;
}
