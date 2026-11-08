import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { EmptyState } from '../../components/Ui.jsx';
import { readRows } from '../../services/experience.js';
import { translate as t } from '../../lib/translate.js';
import { useRealtime } from '../../lib/realtime.jsx';
import { buildNotificationEvents, readSeenAt, unreadSince, writeSeenAt } from './customerNotifications.js';
import { readServerSeenAt, writeServerSeenAt } from './customerNotificationsServer.js';

export function CustomerNotificationBadge({ userId }) {
  const { revision } = useRealtime();
  const [seenAt, setSeenAt] = useState(() => readSeenAt(userId));
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!userId) { setUnread(0); return undefined; }
    let active = true;
    readServerSeenAt(userId).then(value => { if (active && value != null) setSeenAt(value); }).catch(() => {});
    Promise.allSettled([
      readRows('service_requests', query => query.eq('customer_id', userId).order('updated_at', { ascending: false }).limit(40)),
      readRows('partner_orders', query => query.eq('customer_id', userId).order('updated_at', { ascending: false }).limit(40)),
    ]).then(([requestsResult, ordersResult]) => {
      if (!active) return;
      const events = buildNotificationEvents({
        requests: requestsResult.status === 'fulfilled' ? requestsResult.value : [],
        orders: ordersResult.status === 'fulfilled' ? ordersResult.value : [],
      });
      setUnread(unreadSince(events, seenAt));
    }).catch(() => {});
    return () => { active = false; };
  }, [userId, revision, seenAt]);
  if (!unread) return null;
  return <span className="notification-badge" aria-label={t(`${unread} unread notifications`)}>{unread}</span>;
}

export default function CustomerNotifications({ userId, onOpenBookings, onOpenWallet }) {
  const { revision } = useRealtime();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [seenAt, setSeenAt] = useState(() => readSeenAt(userId));
  const load = () => {
    if (!userId) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    readServerSeenAt(userId).then(value => { if (value != null) setSeenAt(value); }).catch(() => {});
    Promise.allSettled([
      readRows('service_requests', query => query.eq('customer_id', userId).order('updated_at', { ascending: false }).limit(40)),
      readRows('partner_orders', query => query.eq('customer_id', userId).order('updated_at', { ascending: false }).limit(40)),
      readRows('wallet_ledger', query => query.eq('customer_id', userId).order('created_at', { ascending: false }).limit(30)),
    ]).then(([requestsResult, ordersResult, ledgerResult]) => {
      const next = buildNotificationEvents({
        requests: requestsResult.status === 'fulfilled' ? requestsResult.value : [],
        orders: ordersResult.status === 'fulfilled' ? ordersResult.value : [],
        ledger: ledgerResult.status === 'fulfilled' ? ledgerResult.value : [],
      });
      setEvents(next);
      setUnread(unreadSince(next, seenAt));
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [userId, revision, seenAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const markSeen = () => {
    const now = Date.now();
    setSeenAt(now);
    setUnread(0);
    writeSeenAt(userId);
    writeServerSeenAt().catch(() => {});
  };
  const actionFor = eventItem => eventItem.kind === 'wallet' ? onOpenWallet : onOpenBookings;
  return <section className="customer-notifications">
    <div className="notifications-toolbar">
      <p>{t(unread ? `${unread} new` : 'All caught up')}{t(' · Updates for your requests, bookings and wallet.')}</p>
      {unread > 0 && <button type="button" className="link" onClick={markSeen}>{t('Mark all as seen')}</button>}
    </div>
    {loading ? <p role="status">{t('Loading notifications…')}</p>
      : events.length ? <div className="notification-list">{events.map(eventItem => (
        <button type="button" className="notification-row" key={eventItem.id} onClick={actionFor(eventItem)}>
          <span className="notification-icon"><Icon name={eventItem.icon} size={18} /></span>
          <span className="notification-copy"><b>{t(eventItem.title)}</b><small>{t(eventItem.body || eventItem.meta)}</small><small>{t(new Date(eventItem.at).toLocaleString('en-IN'))}</small></span>
          {!seenAt || eventItem.at > seenAt ? <i className="notification-dot" aria-label={t('Unread')} /> : null}
          <Icon name="chevronRight" size={17} />
        </button>
      ))}</div>
        : <EmptyState icon="bell" title="No notifications yet" text="Updates about your requests, bookings and wallet will appear here." />}
  </section>;
}
