import { translate } from "../lib/translate.js";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { useAccount } from '../lib/account.js';
import { useRealtime } from '../lib/realtime.jsx';
import { getChatUnreadTotal } from '../services/chat.js';
const openSheets = [];
export function Brand() {
  return <span className="eazily-name">{translate("Eazily")}</span>;
}
const userNav = [["home", "home", "Home"], ["categories", "compass", "Explore"], ["messages", "messageCircle", "Messages"], ["videos", "clapperboard", "Videos"], ["profile", "person", "Profile"]];
export function BottomNav({
  route,
  onChange,
  seller = false,
  onPost,
  items: customItems,
  chatRole = null
}) {
  const { user } = useAccount();
  const { revision } = useRealtime();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    if (!user) { setUnread(0); return undefined; }
    getChatUnreadTotal(chatRole).then(value => { if (active) setUnread(Number(value) || 0); }).catch(() => { if (active) setUnread(0); });
    return () => { active = false; };
  }, [user, chatRole, revision]);
  // Android keeps the keyboard over the page; hide the bar instead of stacking it.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const update = () => {
      const covered = window.innerHeight - viewport.height > 140;
      document.documentElement.classList.toggle('eazily-keyboard-open', covered);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      if (!document.querySelector('.bottom-nav')) document.documentElement.classList.remove('eazily-keyboard-open');
    };
  }, []);
  const items = customItems ?? (seller ? [["home", "home", "Home"], ["messages", "message", "Messages"], ["post", "plus", "Post"], ["orders", "clipboard", "Orders"], ["profile", "person", "Profile"]] : userNav);
  const customerNav = !seller && !customItems;
  return <nav aria-label={seller ? "Partner navigation" : "Main navigation"} className={`bottom-nav ${seller ? "seller-nav" : ""} ${customerNav ? "customer-nav" : ""}`}>
      {translate(items.map(([id, icon, label]) => <button type="button" key={id} aria-current={route === id ? "page" : undefined} className={`nav-item ${route === id ? "active" : ""} ${id === "post" ? "post-nav" : ""}`} onClick={() => id === "post" ? onPost?.() : onChange(id)}>
          <span className="nav-icon"><Icon name={icon} size={customerNav ? 22 : id === "post" ? 26 : 19} />{id === 'messages' && unread > 0 && <b className="nav-unread" aria-label={`${unread} unread messages`}>{unread > 99 ? '99+' : unread}</b>}</span>
          {translate(label)}
        </button>))}
    </nav>;
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search services, loans, transport…"
}) {
  return <label className="catalog-search">
      <Icon name="search" size={19} />
      <input type="search" aria-label={translate("Search services")} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </label>;
}
export function Sheet({
  children,
  onClose,
  className = "",
  manageHistory = true
}) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  const managesHistory = useRef(manageHistory);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    managesHistory.current = manageHistory;
  }, [manageHistory]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const marker = crypto.randomUUID();
    let active = true;
    openSheets.push(marker);
    queueMicrotask(() => {
       if (active && managesHistory.current) history.pushState({
        ...history.state,
        sheet: marker
      }, '');
    });
    dialog.current?.querySelector('button')?.focus();
    const pop = () => {
      if (managesHistory.current && openSheets.at(-1) === marker && history.state?.sheet !== marker) close.current();
    };
    const key = event => {
      const sheets = document.querySelectorAll('[role="dialog"]');
      if (sheets[sheets.length - 1] !== dialog.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key === 'Tab') {
        const items = [...dialog.current.querySelectorAll('button, a[href], input, select, textarea, summary')].filter(el => !el.disabled && el.getClientRects().length);
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('popstate', pop);
    document.addEventListener('keydown', key);
    return () => {
      active = false;
      openSheets.splice(openSheets.indexOf(marker), 1);
      window.removeEventListener('popstate', pop);
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      previous?.focus?.({
        preventScroll: true
      });
      if (managesHistory.current && history.state?.sheet === marker) history.back();
    };
  }, []);
  return <div className="sheet-overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section ref={dialog} className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label="Eazily details">
        <button className="sheet-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <div className="handle" /><div className="sheet-navigation"><button type="button" className="sheet-back" onClick={onClose}><Icon name="arrowLeft" size={18} />{translate("Back")}</button></div>
        {translate(children)}
      </section>
    </div>;
}
export function Field({
  label,
  as = "input",
  options = [],
  hint,
  error,
  ...props
}) {
  const id = useId();
  const describedBy = [props['aria-describedby'], hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const fieldProps = { ...props, id: props.id || id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : props['aria-invalid'] };
  const Element = as;
  return <label className="field-wrap">
      <span className="form-label">{translate(label)}</span>
      {translate(as === "select" ? <select className="field" {...fieldProps}>{props.value === '' && !options.includes('') && <option value="" disabled>{translate('Select an option')}</option>}{translate(options.map(option => <option key={option} value={option}>{translate(option)}</option>))}</select> : as === "textarea" ? <textarea className="field area" {...fieldProps} /> : <Element className="field" {...fieldProps} />)}
      {hint && <span className="field-hint" id={`${id}-hint`}>{translate(hint)}</span>}
      {error && <span className="field-error" id={`${id}-error`} aria-live="polite">{translate(error)}</span>}
    </label>;
}
export function Toast({
  message
}) {
  return <div className={`toast ${message ? "show" : ""}`} role="status">{translate(message)}</div>;
}
export function EmptyState({
  title,
  text,
  icon = "grid",
  actionLabel,
  onAction
}) {
  return <div className="empty-state large"><Icon name={icon} size={34} /><b>{translate(title)}</b><span>{translate(text)}</span>{actionLabel && onAction && <button type="button" className="btn btn-outline empty-state-action" onClick={onAction}>{translate(actionLabel)}</button>}</div>;
}
