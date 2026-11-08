/**
 * VendorDashboard — mobile-first vendor / service-partner home screen.
 *
 * Matches the Eazily "Vendor Dashboard" image spec:
 *   • Header: brand wordmark + "Vendor Dashboard" label, notification bell
 *   • Profile card: avatar with verified badge, city, star rating
 *   • Online toggle card
 *   • "Your Overview" 2×2 stat grid (today's earning, total earning, pending, completed)
 *   • "Confirmed Jobs" list (customer initial chip, metadata row, chat button)
 *
 * All data comes from the same props already provided to PartnerDashboard so nothing
 * new needs to be wired into PartnerApp.
 */
import Icon from '../../components/Icon.jsx';
import { translate as t } from '../../lib/translate.js';
import './vendor-dashboard.css';

/* ─── money helper (mirrors PartnerApp money) ─────────────────────────────── */
const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function rupees(n) { return '₹ ' + fmt.format(Number(n || 0)); }

/* ─── colour palette for the overview stat cards ──────────────────────────── */
const STAT_THEMES = [
  { bg: '#F0EEFF', icon: '#7C5CFC' },   // purple – today's earning
  { bg: '#E8F4FF', icon: '#2D9CDB' },   // blue   – total earning
  { bg: '#FFF4E5', icon: '#F2994A' },   // amber  – pending jobs
  { bg: '#E8F8EF', icon: '#27AE60' },   // green  – completed jobs
];

/* ─── colour palette for customer-initial chips ───────────────────────────── */
const CHIP_COLOURS = [
  { bg: '#EDE9FE', fg: '#6D28D9' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#DBEAFE', fg: '#1E40AF' },
];

function chipColour(name = '') {
  const idx = (name.charCodeAt(0) || 0) % CHIP_COLOURS.length;
  return CHIP_COLOURS[idx];
}

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';
}

function fmtTime(iso) {
  if (!iso) return t('Time TBD');
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(iso) {
  if (!iso) return t('Date TBD');
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

/* ─── sub-components ──────────────────────────────────────────────────────── */

function VendorHeader({ notifications, onNotifications }) {
  return (
    <header className="vd-header">
      <div className="vd-brand">
        <span className="vd-brand-name">Eazily</span>
        <span className="vd-brand-sub">
          <Icon name="chevronRight" size={13} />
          {t('Vendor Dashboard')}
        </span>
      </div>
      <button
        type="button"
        className="vd-bell"
        aria-label={t('Notifications')}
        onClick={onNotifications}
      >
        <Icon name="bell" size={21} />
        {notifications > 0 && (
          <span className="vd-bell-dot" aria-hidden="true" />
        )}
      </button>
    </header>
  );
}

function VendorProfile({ profile, approved, reviews }) {
  const name = profile.businessName || profile.name || t('Partner');
  const city = [profile.city, profile.state].filter(Boolean).join(', ');
  const avgRating =
    reviews.length
      ? (
          reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length
        ).toFixed(1)
      : null;

  return (
    <section className="vd-profile">
      <div className="vd-avatar-wrap">
        <span className="vd-avatar">{initials(name)}</span>
        {approved && (
          <span className="vd-avatar-check" aria-label={t('Verified')}>
            <Icon name="check" size={11} />
          </span>
        )}
      </div>
      <div className="vd-profile-copy">
        <span className={`vd-verified-label${approved ? ' is-approved' : ''}`}>
          {approved ? (
            <>
              <Icon name="check" size={14} />
              {t('Verified Partner')}
            </>
          ) : (
            <>
              <Icon name="clock" size={14} />
              {t('Verification pending')}
            </>
          )}
        </span>
        {city && (
          <p className="vd-city">
            <Icon name="location" size={14} />
            {city}
          </p>
        )}
        {avgRating && (
          <p className="vd-rating">
            <span className="vd-star" aria-hidden="true">★</span>
            {t('Rating:')} <strong>{avgRating}</strong>
            <span className="vd-rating-count">({reviews.length} {t('reviews')})</span>
          </p>
        )}
      </div>
    </section>
  );
}

function OnlineCard({ online, busy, approved, onToggle }) {
  return (
    <section
      className={`vd-online-card${online ? ' is-online' : ''}`}
      aria-label={t('Availability')}
    >
      <span className="vd-online-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M1 6.5C4.5 3 9 1.5 12 1.5c3 0 7.5 1.5 11 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 10c2.2-2.2 5-3.5 8-3.5s5.8 1.3 8 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 13.5C8.5 12 10.2 11 12 11s3.5 1 5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="17.5" r="1.8" fill="currentColor" />
        </svg>
      </span>
      <div className="vd-online-copy">
        <b>
          {t('You are')} <span className="vd-online-state">{online ? t('Online') : t('Offline')}</span>
        </b>
        <small>
          {online
            ? t('You will receive new job requests')
            : t('Turn on to receive new job requests')}
        </small>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={online}
        aria-label={t('Toggle availability')}
        className="vd-toggle"
        disabled={!approved || busy}
        onClick={onToggle}
      >
        <span className="vd-toggle-thumb" />
      </button>
    </section>
  );
}

function OverviewGrid({ todayEarning, totalEarning, pending, completed }) {
  const stats = [
    { label: t("Today's Earning"), value: rupees(todayEarning), icon: 'rupee', ...STAT_THEMES[0] },
    { label: t('Total Earning'),   value: rupees(totalEarning),  icon: 'rupee', ...STAT_THEMES[1] },
    { label: t('Pending Jobs'),    value: pending,               icon: 'briefcase', ...STAT_THEMES[2] },
    { label: t('Completed Jobs'),  value: completed,             icon: 'check', ...STAT_THEMES[3] },
  ];

  return (
    <section className="vd-overview" aria-label={t('Your Overview')}>
      <h2 className="vd-section-title">{t('Your Overview')}</h2>
      <div className="vd-stats-grid">
        {stats.map(({ label, value, bg, icon: iconName }) => (
          <article key={label} className="vd-stat-card" style={{ '--vd-stat-bg': bg, '--vd-stat-icon': STAT_THEMES[stats.findIndex(s => s.label === label)].icon }}>
            <span className="vd-stat-icon" aria-hidden="true">
              <Icon name={iconName} size={22} />
            </span>
            <strong className="vd-stat-value">{value}</strong>
            <span className="vd-stat-label">{label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function JobRow({ order, onChat }) {
  const customerName = order.customer_name || order.customerName || t('Customer');
  const workType     = order.details?.service || order.title || t('Service');
  const location     = order.details?.area || order.details?.locality || '';
  const distance     = order.details?.distance ? `${order.details.distance} km` : '';

  const colour = chipColour(customerName);

  return (
    <article className="vd-job-row">
      <span
        className="vd-job-chip"
        aria-hidden="true"
        style={{ '--vd-chip-bg': colour.bg, '--vd-chip-fg': colour.fg }}
      >
        {initials(customerName)}
      </span>

      <div className="vd-job-body">
        <strong className="vd-job-name">{customerName}</strong>
        <div className="vd-job-meta">
          <span className="vd-job-tag">{t('Work:')} {workType}</span>
          {location && (
            <>
              <span className="vd-job-sep" aria-hidden="true">|</span>
              <span className="vd-job-tag">
                <Icon name="location" size={12} />
                {location}
              </span>
            </>
          )}
          {distance && (
            <>
              <span className="vd-job-sep" aria-hidden="true">|</span>
              <span className="vd-job-tag">{distance}</span>
            </>
          )}
        </div>
        <div className="vd-job-meta vd-job-time">
          {order.deadline && (
            <>
              <span className="vd-job-tag">
                <Icon name="calendar" size={12} />
                {t('Working Date:')} {fmtDate(order.deadline)}
              </span>
              <span className="vd-job-sep" aria-hidden="true">|</span>
              <span className="vd-job-tag">
                <Icon name="clock" size={12} />
                {t('Time:')} {fmtTime(order.deadline)}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="vd-job-chat"
        aria-label={`${t('Chat with')} ${customerName}`}
        onClick={() => onChat(order)}
      >
        <Icon name="message" size={18} />
      </button>
    </article>
  );
}

function ConfirmedJobs({ orders, onViewAll, onChat }) {
  const confirmed = orders
    .filter(o => ['accepted', 'active', 'awaiting_acceptance'].includes(o.status))
    .slice(0, 5);

  return (
    <section className="vd-jobs" aria-label={t('Confirmed Jobs')}>
      <div className="vd-jobs-head">
        <h2 className="vd-section-title">{t('Confirmed Jobs')}</h2>
        <button type="button" className="vd-view-all" onClick={onViewAll}>
          {t('View All')} <Icon name="chevronRight" size={14} />
        </button>
      </div>

      {confirmed.length ? (
        <div className="vd-job-list">
          {confirmed.map(order => (
            <JobRow key={order.id} order={order} onChat={onChat} />
          ))}
        </div>
      ) : (
        <div className="vd-jobs-empty">
          <Icon name="briefcase" size={28} />
          <p>{t('No confirmed jobs yet')}</p>
        </div>
      )}
    </section>
  );
}

/* ─── main export ──────────────────────────────────────────────────────────── */

export default function VendorDashboard({
  profile = {},
  approved = false,
  data,
  online,
  busy,
  setRoute,
  setSheet,
  act,
  setAvailability,
  setOnline,
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEarning = data.earnings
    .filter(e =>
      ['available', 'pending', 'paid'].includes(e.state) &&
      new Date(e.created_at) >= todayStart,
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const totalEarning = data.earnings
    .filter(e => ['available', 'pending', 'paid'].includes(e.state))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const pending   = data.orders.filter(o => o.status === 'requested').length;
  const completed = data.orders.filter(o => o.status === 'completed').length;
  const notifications = data.notifications.filter(n => !n.read_at).length;

  function handleToggle() {
    act(async () => {
      const result = await setAvailability(!online);
      setOnline(result.online);
    });
  }

  return (
    <div className="vd-root">
      <VendorHeader
        profile={profile}
        notifications={notifications}
        onNotifications={() => setSheet('Notifications')}
      />

      <div className="vd-body">
        <VendorProfile
          profile={profile}
          approved={approved}
          reviews={data.reviews}
        />

        <OnlineCard
          online={online}
          busy={busy}
          approved={approved}
          onToggle={handleToggle}
        />

        <OverviewGrid
          todayEarning={todayEarning}
          totalEarning={totalEarning}
          pending={pending}
          completed={completed}
        />

        <ConfirmedJobs
          orders={data.orders}
          onViewAll={() => setRoute('orders')}
          onChat={order => setSheet({ order })}
        />
      </div>
    </div>
  );
}
