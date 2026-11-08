import Icon from '../../components/Icon.jsx';
import { partnerRoles } from '../../data/partners.js';
import { translate as t } from '../../lib/translate.js';
import { displayInfluencerCategory } from '../../data/influencerCategories.js';
import { displayConsultantCategory } from '../../data/consultantCategories.js';
import { computeSellerLevel } from '../../lib/sellerLevel.js';
import { weeklyEarnings } from '../../lib/earningsChart.js';
import './partner-dashboard.css';
import './partner-reference.css';

const ROLE_CONFIGS = {
  professional: { getCategory: profile => profile.category || '' },
  influencer: {
    getCategory: profile => displayInfluencerCategory(profile.category) || '',
  },
  consultant: {
    getCategory: profile => displayConsultantCategory(profile.category) || '',
  },
};

function formatOrderDeadline(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

function indiaDateKey(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const date = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function byUpcomingDeadline(first, second) {
  const firstDeadline = Date.parse(first.deadline || '');
  const secondDeadline = Date.parse(second.deadline || '');
  if (Number.isFinite(firstDeadline) && Number.isFinite(secondDeadline)) return firstDeadline - secondDeadline;
  if (Number.isFinite(firstDeadline)) return -1;
  if (Number.isFinite(secondDeadline)) return 1;
  const firstCreated = Date.parse(first.created_at || '') || 0;
  const secondCreated = Date.parse(second.created_at || '') || 0;
  return firstCreated - secondCreated;
}

/* ─── Top Bar ─────────────────────────────────────────────────────────────── */
export function DashboardTopBar({ role, name, notifications, setSheet, profile = {}, view = 'home', greeting = 'Welcome' }) {
  const displayName = profile.name || profile.creatorName || name || partnerRoles[role]?.label || 'Partner';
  const pageTitle = view === 'home'
    ? (role === 'professional' ? 'Service Dashboard' : role === 'influencer' ? 'Creator Dashboard' : 'Consultant Dashboard')
    : view === 'orders'
      ? 'Jobs'
      : view === 'profile'
        ? 'Profile'
        : view === 'growth'
          ? (role === 'influencer' ? 'Growth' : 'Business growth')
          : view === 'earnings'
            ? 'Earnings'
            : 'Daily work';

  return (
    <header className={`pd-topbar pd-topbar-professional pd-topbar-${role}`}>
      <div className="pd-topbar-row">
        <div className="pd-brand-lockup"><span className="pd-brand-wordmark">Eazily</span><h1>{view === 'home' ? `${t(greeting)}, ${displayName.split(/\s+/)[0]}` : t(pageTitle)}</h1><p className="pd-header-context">{t(partnerRoles[role]?.label || 'Partner')}{profile.city ? ` · ${profile.city}` : ''}</p></div>
        <div className="pd-header-actions">
          <button
            type="button"
            className="pd-icon-button"
            aria-label={t('Notifications')}
            onClick={() => setSheet('Notifications')}
          >
            <Icon name="bell" size={19} />
            {notifications > 0 && <span className="pd-notification-count">{notifications > 9 ? '9+' : notifications}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─── Main Partner Dashboard ──────────────────────────────────────────────── */
export default function PartnerDashboard({
  role = 'professional',
  profile = {},
  approved = false,
  application = {},
  data = { orders: [], leads: [], earnings: [], reviews: [], posts: [], notifications: [] },
  online = true,
  busy = false,
  trial = null,
  setRoute,
  setSheet,
  act,
  setAvailability,
  setOnline,
  total,
  money,
  onEditRegistration,
}) {
  /* Metric calculations */
  const requestedOrders = data.orders.filter(order => order.status === 'requested' && !order.backup_price_approval_pending).sort(byUpcomingDeadline);
  const pendingPriceOrders = role === 'professional' ? data.orders.filter(order => order.backup_price_approval_pending) : [];
  const activeOrders = data.orders.filter(order => ['accepted', 'active', 'awaiting_acceptance'].includes(order.status)).sort(byUpcomingDeadline);
  const completedOrders = data.orders.filter(order => order.status === 'completed').length;
  const todayKey = indiaDateKey(new Date());
  const todayEarnings = data.earnings.reduce((sum, entry) => {
    if (indiaDateKey(entry.created_at) !== todayKey) return sum;
    if (['available', 'pending', 'paid'].includes(entry.state)) return sum + Number(entry.amount || 0);
    if (entry.state === 'reversed') return sum - Number(entry.amount || 0);
    return sum;
  }, 0);
  const totalEarnings = total
    ? ['available', 'pending', 'paid'].reduce((sum, state) => sum + Number(total(state) || 0), 0)
    : data.earnings.reduce((sum, entry) => sum + (['available', 'pending', 'paid'].includes(entry.state) ? Number(entry.amount || 0) : entry.state === 'reversed' ? -Number(entry.amount || 0) : 0), 0);
  const ratings = data.reviews.map(review => Number(review.rating)).filter(rating => Number.isFinite(rating) && rating > 0);
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
  return <PartnerHomeDashboard
    role={role}
    profile={profile}
    approved={approved}
    application={application}
    data={data}
    trial={trial}
    online={online}
    busy={busy}
    requestedOrders={requestedOrders}
    pendingPriceOrders={pendingPriceOrders}
    activeOrders={activeOrders}
    completedOrders={completedOrders}
    todayEarnings={todayEarnings}
    totalEarnings={totalEarnings}
    averageRating={averageRating}
    money={money}
    setRoute={setRoute}
    setSheet={setSheet}
    act={act}
    setAvailability={setAvailability}
    setOnline={setOnline}
    onEditRegistration={onEditRegistration}
  />;

}
function PartnerHomeDashboard({ role, profile, approved, application, data, trial, online, busy, requestedOrders, pendingPriceOrders, activeOrders, completedOrders, todayEarnings, totalEarnings, averageRating, money, setRoute, setSheet, act, setAvailability, setOnline, onEditRegistration }) {
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.professional;
  const name = role === 'influencer'
    ? profile.creatorName || profile.name || 'Creator profile'
    : role === 'consultant'
      ? profile.name || profile.creatorName || 'Consultant profile'
      : profile.businessName || profile.name || profile.ownerName || 'Service professional';
  const category = config.getCategory(profile) || (role === 'professional' ? profile.serviceSelections?.[0]?.service : '') || '';
  const city = profile.city || profile.address?.city || '';
  const nextJob = activeOrders[0];
  const amount = value => money ? money(value) : `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const publishedOffering = data.posts.some(post => post.status === 'published' && (post.details?.postType || 'offering') === 'offering');
  const statusActive = role === 'professional' ? online : publishedOffering;
  const roleCopy = {
    professional: { kind: 'Service Professional', completed: 'Jobs completed', heading: 'Confirmed jobs', emptyTitle: 'No confirmed jobs yet', emptyBody: 'Accepted customer bookings will appear here.', statusTitle: online ? 'You’re available' : 'You’re unavailable', statusBody: online ? 'Customers can send you job requests' : 'Turn on availability to receive job requests', action: 'View requests', audience: 'Customer' },
    influencer: { kind: 'Influencer', completed: 'Collaborations completed', heading: 'Confirmed collaborations', emptyTitle: 'No active collaborations yet', emptyBody: 'Accepted brand collaborations will appear here.', statusTitle: publishedOffering ? 'Packages are live' : 'Set up your packages', statusBody: 'Manage published packages to receive brand enquiries', action: 'Manage packages', audience: 'Brand' },
    consultant: { kind: 'Consultant', completed: 'Sessions completed', heading: 'Upcoming appointments', emptyTitle: 'No upcoming appointments yet', emptyBody: 'Confirmed consultation bookings will appear here.', statusTitle: publishedOffering ? 'Consultations are listed' : 'Set up your consultation', statusBody: 'Manage your consultation offering and booking details', action: 'Manage consultations', audience: 'Client' },
  }[role] || {};
  const hasServicePost = data.posts.some(post => (post.details?.postType || 'offering') === 'offering' && !['archived', 'rejected'].includes(post.status));
  const trustedTrialEnd = approved && trial?.approval_started_at && !trial?.approval_date_missing ? trial.trial_ends_at : null;
  const trialExpired = Boolean(trustedTrialEnd && Date.parse(trustedTrialEnd) <= Date.now());
  const activePaid = trial?.status === 'active' && trial.current_period_end && Date.parse(trial.current_period_end) > Date.now();
  const roleClass = role === 'professional' ? 'pd-service-home' : role === 'influencer' ? 'pd-influencer-home' : 'pd-consultant-home';
  const decidedOrders = data.orders.filter(order => ['requested', 'accepted', 'active', 'awaiting_acceptance', 'completed', 'cancelled', 'disputed'].includes(order.status));
  const acceptedCount = data.orders.filter(order => ['accepted', 'active', 'awaiting_acceptance', 'completed'].includes(order.status)).length;
  const acceptRate = decidedOrders.length >= 3 ? Math.round((acceptedCount / decidedOrders.length) * 100) : null;
  const pipelineItems = [
    { label: role === 'influencer' ? 'Enquiries' : role === 'consultant' ? 'New requests' : 'Requested', count: requestedOrders.length, tone: 'new' },
    { label: 'Active', count: activeOrders.length, tone: 'active' },
    { label: roleCopy.completed, count: completedOrders, tone: 'done' },
  ];
  const metrics = [
    ["Today's earnings", amount(todayEarnings), 'rupee', () => setSheet('Earnings')],
    ['Total earnings', amount(totalEarnings), 'history', () => setSheet('Earnings')],
    [roleCopy.completed, completedOrders, 'check', () => setRoute('orders')],
    [`${roleCopy.audience} rating`, averageRating == null ? '—' : `${averageRating.toFixed(1)} / 5`, 'star', () => setRoute('profile')],
  ];
  const upcomingDecisions = [...requestedOrders, ...pendingPriceOrders]
    .map(order => order.response_due_at || order.deadline)
    .filter(Boolean)
    .map(value => Date.parse(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const earliestDecision = upcomingDecisions.length ? new Date(upcomingDecisions[0]) : null;
  const urgencyText = earliestDecision
    ? earliestDecision.toDateString() === new Date().toDateString()
      ? t(`Earliest deadline today at ${earliestDecision.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`)
      : t(`Earliest deadline ${earliestDecision.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
    : null;
  const showAcceptTip = acceptRate != null && acceptRate < 85;
  const showRatingHint = approved && averageRating == null;
  const sellerLevel = approved ? computeSellerLevel({ completed: completedOrders, rating: averageRating, acceptedCount, decidedCount: decidedOrders.length }) : null;
  const toggleAvailability = () => {
    if (!approved || busy || typeof setAvailability !== 'function') return;
    const nextOnline = !online;
    setOnline(nextOnline);
    const persist = async () => {
      try {
        const result = await setAvailability(nextOnline);
        if (typeof result?.online === 'boolean') setOnline(result.online);
      } catch (error) {
        setOnline(!nextOnline);
        throw error;
      }
    };
    if (act) act(persist);
    else persist().catch(() => {});
  };
  return <div className={`pd-dashboard pro-dashboard partner-home-dashboard ${roleClass}`}>
    {!approved && <section className="pro-review-notice" role="status"><Icon name="shield" size={19}/><div><strong>{t(application.status === 'under_review' ? 'Verification in progress' : 'Complete your verification')}</strong><p>{t('Your dashboard is ready. Requests, work acceptance, and payouts unlock after approval.')}</p>{approved === false && <ul className="pro-unlock-previews"><li>{t('Accept service requests')}</li><li>{t('Publish services')}</li><li>{t('Receive verified payouts')}</li></ul>}</div><button type="button" onClick={onEditRegistration}>{t('View details')} <Icon name="chevronRight" size={14}/></button></section>}
    <section className="pro-profile-card" aria-label={t(`${roleCopy.kind} profile`)}>
      <span className="pro-profile-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
      <div className="pro-profile-copy"><h2>{name}</h2><p>{[category, city].filter(Boolean).join(' · ')}</p><span className={`pro-verified ${approved ? 'approved' : ''}`}><Icon name={approved ? 'check' : 'clock'} size={13}/>{t(approved ? `Verified ${roleCopy.kind.toLowerCase()}` : 'Pending review')}</span>{sellerLevel && <span className={`pro-level-badge level-${sellerLevel.key}`}>{t(sellerLevel.label)}</span>}</div>
    </section>
    <section className={`pro-availability ${statusActive ? 'online' : ''}`}>
      <span className="pro-online-dot" aria-hidden="true"/><div><strong>{t(roleCopy.statusTitle)}</strong><p>{t(roleCopy.statusBody)}</p></div>
      {role === 'professional'
        ? <button type="button" role="switch" aria-label={t('Availability')} aria-checked={online} disabled={!approved || busy} onClick={toggleAvailability}><span/></button>
        : <button type="button" className="pro-availability-action" disabled={!approved} onClick={() => setRoute('post')}>{t(roleCopy.action)} <Icon name="chevronRight" size={14}/></button>}
    </section>
    <section className="pro-overview"><div className="pro-section-title"><h2>{t('Overview')}</h2><button type="button" onClick={() => setRoute('growth')}>{t('View insights')} <Icon name="chevronRight" size={14}/></button></div><div className="pro-metrics">
      {metrics.map(([label, value, icon, action]) => <button type="button" className="pro-metric" key={label} onClick={action}><span className="pro-metric-icon"><Icon name={icon} size={18}/></span><span className="pro-metric-label">{t(label)}</span><strong>{value}</strong></button>)}
    </div>{approved && <div className="pd-pipeline">{pipelineItems.map(item => <button type="button" key={item.label} className={`pd-pipe ${item.tone}`} onClick={() => setRoute('orders')}><b>{item.count}</b><span>{t(item.label)}</span></button>)}{acceptRate != null && <button type="button" className="pd-pipe accept" onClick={() => setRoute('growth')}><b>{acceptRate}%</b><span>{t('Accept rate')}</span></button>}</div>}{approved && <div className="pro-quick-actions"><button type="button" className="btn btn-outline" onClick={() => setRoute('post')}>{t('Post a service')} <Icon name="plus" size={15}/></button></div>}{(showAcceptTip || showRatingHint) && <div className="pro-tips">{showRatingHint && <p>{t('Complete 1 booking to get rated.')}</p>}{showAcceptTip && <p>{t('Tip: responding faster tends to improve your accept rate.')}</p>}</div>}</section>
    {role === 'professional' && !hasServicePost && approved && <section className="pro-first-offering"><span className="pro-job-icon"><Icon name="briefcase" size={19}/></span><div><strong>{t('Publish your first service')}</strong><p>{t('Give customers a clear service to review and request.')}</p></div><button type="button" onClick={() => setRoute('post')}>{t('Add service')} <Icon name="chevronRight" size={14}/></button></section>}
    {(requestedOrders.length > 0 || pendingPriceOrders.length > 0) && <section className="pro-needs-action">
      <div className="pro-section-title"><h2>{t('Needs action')}</h2><span className="needs-count">{requestedOrders.length + pendingPriceOrders.length}</span><button type="button" onClick={() => setRoute('orders')}>{t('See all')} <Icon name="chevronRight" size={14}/></button></div>
      {urgencyText && <p className="needs-urgency">{urgencyText}</p>}
      <div className="needs-list">
        {pendingPriceOrders.slice(0, 2).map(order => <button type="button" className="needs-item price" key={order.id} onClick={() => setSheet({order})}><span><strong>{order.title || order.details?.service || order.details?.category || t('Booking')}</strong><small>{t('Waiting for customer price approval')}</small></span><b>{t('Review')}</b><Icon name="chevronRight" size={16}/></button>)}
        {requestedOrders.slice(0, 2).map(order => <button type="button" className="needs-item new" key={order.id} onClick={() => setSheet({order})}><span><strong>{order.title || order.details?.service || order.details?.category || t('New request')}</strong><small>{order.deadline ? formatOrderDeadline(order.deadline) : t(role === 'influencer' ? 'New brand enquiry' : role === 'consultant' ? 'New consultation request' : 'Awaiting your response')}</small></span><b>{t(role === 'influencer' ? 'Review enquiry' : role === 'consultant' ? 'Review consultation' : 'Review request')}</b><Icon name="chevronRight" size={16}/></button>)}
      </div>
    </section>}
    <section className="pro-jobs"><div className="pro-section-title"><h2>{t(roleCopy.heading)}</h2>{requestedOrders.length === 0 && pendingPriceOrders.length === 0 && <button type="button" onClick={() => setRoute('orders')}>{t('See all')} <Icon name="chevronRight" size={14}/></button>}</div>
      {nextJob ? <button type="button" className="pro-job-card" onClick={() => setSheet({order:nextJob})}><span className="pro-job-icon"><Icon name={role === 'influencer' ? 'video' : role === 'consultant' ? 'calendar' : 'briefcase'} size={19}/></span><span className="pro-job-details"><strong>{nextJob.title || nextJob.details?.service || nextJob.details?.category || t('Work request')}</strong>{nextJob.deadline && <small>{formatOrderDeadline(nextJob.deadline)}</small>}{(role === 'professional' && (nextJob.details?.location || nextJob.details?.address || nextJob.customer_name)) && <small>{nextJob.details?.location || nextJob.details?.address || nextJob.customer_name}</small>}</span><span className="pro-job-status"><Icon name="check" size={12}/>{t(nextJob.status === 'active' ? 'In progress' : nextJob.status === 'awaiting_acceptance' ? 'Awaiting confirmation' : 'Confirmed')}</span><Icon name="chevronRight" size={16}/></button> : <div className="pro-empty-job"><span><Icon name="calendar" size={21}/></span><div><strong>{t(roleCopy.emptyTitle)}</strong><p>{t(roleCopy.emptyBody)}</p></div><button type="button" onClick={() => setRoute('orders')}>{t(roleCopy.action === 'View requests' ? roleCopy.action : 'View requests')}</button></div>}
    </section>
    {trialExpired && <section className="pro-trial-card"><div><strong>{t(activePaid ? 'Membership active' : 'Your free trial has ended')}</strong><p>{t(activePaid ? `Renewal date: ${new Date(trial.current_period_end).toLocaleDateString('en-IN')}` : 'Review subscription plans and renewal terms.')}</p></div><button type="button" onClick={() => setSheet('Subscription')}>{t(activePaid ? 'View subscription' : 'View plans')} <Icon name="chevronRight" size={14}/></button></section>}
  </div>;
}

/* ─── Business Growth Dashboard (Tab 4) ───────────────────────────────────── */
export function PartnerGrowthDashboard({ role, profile, data, setRoute, setSheet, onEditRegistration }) {
  const requested = data.orders.filter(order => order.status === 'requested' && !order.backup_price_approval_pending).length;
  const leads = (data.leads || []).filter(lead => lead.status !== 'lost').length;
  const enquiries = Math.max(requested, leads);
  const bookings = data.orders.filter(order => ['accepted', 'active', 'awaiting_acceptance', 'completed'].includes(order.status)).length;
  const workLabel = role === 'influencer' ? 'Campaigns' : role === 'consultant' ? 'Appointments' : 'Bookings';
  const reviewAudience = role === 'influencer' ? 'Brand' : role === 'consultant' ? 'Client' : 'Customer';
  const ratings = data.reviews.map(review => Number(review.rating)).filter(rating => Number.isFinite(rating) && rating > 0);
  const averageRating = ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : null;
  const workMedia = (profile.ownerShopMedia || []).length > 0 || data.posts.some(post => (post.details?.media || []).length > 0);
  const completeness = role === 'professional'
    ? [Boolean(profile.businessName && profile.city), Boolean((profile.serviceSelections || []).length || (profile.services || []).length), Boolean(profile.bio), workMedia]
    : role === 'influencer'
      ? [Boolean(profile.creatorName || profile.name), Boolean(profile.category), Boolean((profile.platforms || []).some(platform => platform.url)), data.posts.some(post => (post.details?.media || []).length > 0)]
      : [Boolean(profile.category && profile.specialisation), Boolean(profile.qualificationName || (profile.qualifications || []).length), Boolean(profile.experience), Boolean(profile.bio)];
  const completion = Math.round(completeness.filter(Boolean).length / completeness.length * 100);
  const tools = role === 'professional'
    ? [['Services and pricing', 'Manage published services', 'briefcase', () => setRoute('post')], ['Service area and hours', 'Update your registration details', 'location', onEditRegistration], ['Enquiry follow-up', `${enquiries} active enquiries`, 'message', () => setSheet('My Leads')], ['Profile preview', 'Review your partner profile', 'person', () => setRoute('profile')]]
    : role === 'influencer'
      ? [['Content and packages', 'Manage posts and offerings', 'megaphone', () => setRoute('post')], ['Social accounts', 'Review your linked accounts', 'grid', onEditRegistration], ['Enquiry follow-up', `${enquiries} active enquiries`, 'message', () => setRoute('orders')], ['Profile preview', 'Review your creator profile', 'person', () => setRoute('profile')]]
      : [['Consultations', 'Manage your consultation offering', 'briefcase', () => setRoute('post')], ['Availability', 'Review appointments and availability', 'calendar', () => setRoute('orders')], ['Qualifications', 'Review your consultant profile', 'person', onEditRegistration], ['Enquiry follow-up', `${enquiries} active enquiries`, 'message', () => setRoute('orders')]];
  const tip = completion < 100
    ? role === 'professional' && !workMedia ? 'Add clear work photos to help customers understand your services.' : 'Complete the remaining profile details to keep your partner profile up to date.'
    : data.reviews.length ? 'Reply to new enquiries promptly and keep your work details current.' : `Keep your profile current. ${reviewAudience} reviews will appear here after completed work.`;
  const chart = weeklyEarnings(data.earnings);

  return (
    <div className="pd-dashboard pd-growth-dashboard" style={{ '--pd-accent': 'var(--purple)' }}>
      <section className="pd-growth-metrics" aria-label="Business growth metrics">
        {[["Enquiries", enquiries, 'message'], [workLabel, bookings, 'briefcase'], [`${reviewAudience} reviews`, data.reviews.length, 'star']].map(([label, value, icon]) => (
          <article key={label}>
            <span className="pd-growth-icon"><Icon name={icon} size={20} /></span>
            <div><small>{label}</small><b>{value}</b></div>
          </article>
        ))}
      </section>

      <section className="pd-growth-progress pd-card" aria-labelledby="pd-profile-progress-title">
        <div className="pd-growth-progress-head">
          <span className="pd-growth-icon"><Icon name="image" size={22} /></span>
          <div><h2 id="pd-profile-progress-title">Complete your profile</h2><p>{completion}% of key profile details are complete</p></div>
          <strong>{completion}%</strong>
        </div>
        <div className="pd-progress-track" role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
          <span style={{ width: `${completion}%` }} />
        </div>
        <p className="pd-growth-hint">{tip}</p>
        <button type="button" className="pd-primary" onClick={completion < 100 ? onEditRegistration : () => setRoute('profile')}>
          {completion < 100 ? 'Complete profile' : 'View profile'}
        </button>
      </section>

      <section className="pd-card pd-growth-tools">
        <div className="pd-section-title"><h2>Business tools</h2><span>Manage your partner account</span></div>
        <div className="pd-growth-tool-list">
          {tools.map(([title, detail, icon, action]) => (
            <button type="button" key={title} onClick={action}>
              <span className="pd-growth-icon"><Icon name={icon} size={19} /></span>
              <span><b>{title}</b><small>{detail}</small></span>
              <Icon name="chevronRight" size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="pd-card pd-growth-reviews">
        <div className="pd-section-title">
          <h2>{reviewAudience} reviews</h2>
          <button type="button" className="pd-text-button" onClick={() => setRoute('profile')}>View profile<Icon name="chevronRight" size={15} /></button>
        </div>
        <div className="pd-review-summary">
          <Icon name="star" size={21} />
          <strong>{averageRating || '—'}</strong>
          <span>{data.reviews.length ? `${data.reviews.length} ${data.reviews.length === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}</span>
        </div>
        <p>{data.reviews.length ? `${reviewAudience} reviews from completed work appear on your partner profile.` : `${reviewAudience} reviews will appear here after completed work.`}</p>
      </section>

      <section className="pd-card pd-growth-earnings-chart">
        <div className="pd-section-title"><h2>{t('Weekly earnings')}</h2><span>{t('Available, pending and paid entries by week')}</span></div>
        {chart.values.some(value => value !== 0) ? <div className="pd-chart" role="img" aria-label={t('Bar chart of weekly earnings')}>{chart.values.map((value, index) => (
          <div className="pd-chart-col" key={chart.labels[index]}>
            <div className="pd-bar-track"><span className={`pd-bar ${value < 0 ? 'negative' : ''}`} style={{ height: `${Math.max(4, Math.abs(value) / chart.peak * 100)}%` }} title={`${chart.labels[index]}: ${value}`} /></div>
            <small>{chart.labels[index]}</small>
          </div>
        ))}</div> : <div className="pd-empty"><span><Icon name="rupee" size={22} /></span><div><b>{t('No earnings yet')}</b><p>{t('Weekly earnings will appear here after paid work.')}</p></div></div>}
      </section>

      <section className="pd-growth-tip">
        <span className="pd-growth-icon"><Icon name="sparkles" size={20} /></span>
        <div><b>Growth tip</b><p>{tip}</p></div>
      </section>
    </div>
  );
}

/* ─── Partner Earnings Dashboard ──────────────────────────────────────────── */
export function PartnerEarningsDashboard({ data, total, money, setSheet }) {
  const recent = [...data.earnings].sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)).slice(0, 5);
  return (
    <div className="pd-dashboard pd-earnings-dashboard" style={{ '--pd-accent': 'var(--purple)' }}>
      <section className="pd-card pd-earnings">
        <div className="pd-section-title">
          <h2><Icon name="rupee" size={19} />{t('Earnings')}</h2>
          <button type="button" className="pd-text-button" onClick={() => setSheet('Earnings')}>{t('View details')}</button>
        </div>
        <div className="pd-payout"><span>{t('Available payout')}</span><strong>{money(total('available'))}</strong></div>
        <div className="pd-pending"><span>{t('Pending payout')}</span><b>{money(total('pending'))}</b></div>
        <button type="button" className="pd-rewards" onClick={() => setSheet('Rewards')}>
          <Icon name="sparkles" size={19} /><span>{t('Rewards')}</span><Icon name="chevronRight" size={16} />
        </button>
      </section>
      <section className="pd-card pd-earnings-history">
        <div className="pd-section-title">
          <h2>Recent earnings</h2>
          <button type="button" className="pd-text-button" onClick={() => setSheet('Earnings')}>View details<Icon name="chevronRight" size={15} /></button>
        </div>
        {recent.length ? recent.map(entry => (
          <article key={entry.id}>
            <span className="pd-growth-icon"><Icon name="rupee" size={18} /></span>
            <span><b>{entry.state === 'reversed' ? 'Reversed entry' : 'Partner earnings'}</b><small>{entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN') : 'Date unavailable'}</small></span>
            <strong>{money(entry.amount)}</strong>
          </article>
        )) : (
          <div className="pd-empty">
            <span><Icon name="rupee" size={22} /></span>
            <div><h3>No earnings recorded yet</h3><p>Earnings appear here when eligible work is completed and recorded.</p></div>
          </div>
        )}
      </section>
    </div>
  );
}
