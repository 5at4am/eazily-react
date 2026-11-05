import Icon from '../../components/Icon.jsx';
import { translate as t } from '../../lib/translate.js';
import { PARTNER_DEMO_ENABLED } from './demo/config.js';
import PartnerPageHeader from './PartnerPageHeader.jsx';
import PartnerSectionHeader from './PartnerSectionHeader.jsx';
import './partner-dashboard.css';

const presentation = {
  professional: { title: 'Service dashboard', label: 'Service Partner', icon: 'workers', accent: 'var(--purple)', incoming: 'New requests', ongoing: 'Upcoming jobs', workIcon: 'briefcase', primary: 'Add service' },
  influencer: { title: 'Creator dashboard', label: 'Influencer Partner', icon: 'megaphone', accent: 'var(--purple)', incoming: 'New enquiries', ongoing: 'Upcoming collaborations', workIcon: 'video', primary: 'Create post' },
  consultant: { title: 'Consultation dashboard', label: 'Consultation Partner', icon: 'briefcase', accent: 'var(--purple)', incoming: 'New enquiries', ongoing: 'Upcoming consultations', workIcon: 'calendar', primary: 'Manage availability' },
};

export function DashboardTopBar({ role, name, greeting, notifications, setRoute, setSheet, profile = {}, approved = false, view = 'home' }) {
  return <PartnerPageHeader role={role} name={name} greeting={greeting} notifications={notifications} setRoute={setRoute} setSheet={setSheet} profile={profile} approved={approved} variant="dashboard" view={view} />;
}

export default function PartnerDashboard({ role, approved, application, data, online, busy, trial, setRoute, setSheet, act, setAvailability, setOnline, total, money, onEditRegistration, onEnterDemo }) {
  const config = presentation[role];
  if (!approved) {
    return <div className={`pd-dashboard pd-${role}`} style={{ '--pd-accent': config.accent }}>
      <PartnerGettingStarted role={role} approved={false} application={application} data={data} onEditRegistration={onEditRegistration} setRoute={setRoute} setSheet={setSheet} />
      {PARTNER_DEMO_ENABLED && onEnterDemo && <div className="pd-preview-control"><span>Interactive sample workspace</span><button type="button" className="pd-text-button" onClick={onEnterDemo}>Enter Demo Mode<Icon name="grid" size={16} /></button></div>}
    </div>;
  }
  const requestedOrders = data.orders.filter(order => order.status === 'requested' && !order.backup_price_approval_pending);
  const pendingPriceOrders = role === 'professional' ? data.orders.filter(order => order.backup_price_approval_pending) : [];
  const requested = requestedOrders.length;
  const active = data.orders.filter(order => ['accepted', 'active'].includes(order.status));
  const completed = data.orders.filter(order => order.status === 'completed').length;
  const openLeadOrderIds = new Set((data.leads || []).filter(lead => lead.order_id && lead.status !== 'lost').map(lead => lead.order_id));
  const openBookingLeads = requestedOrders.filter(order => openLeadOrderIds.has(order.id)).length;
  const acceptedBookings = data.orders.filter(order => ['accepted', 'active', 'awaiting_acceptance'].includes(order.status)).length;
  const recordedEarnings = data.earnings.filter(entry => ['available', 'pending', 'paid'].includes(entry.state)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const metrics = {
    professional: [['New enquiries', openBookingLeads, 'message'], ['Accepted bookings', acceptedBookings, 'briefcase'], ['Completed jobs', completed, 'check'], ['Recorded earnings', money(recordedEarnings), 'rupee']],
    influencer: [['New enquiries', requested, 'message'], ['Accepted enquiries', active.length, 'video'], ['Live posts', data.posts.filter(post => post.status === 'published').length, 'megaphone'], ['Available payout', money(total('available')), 'rupee']],
    consultant: [['Accepted enquiries', active.length, 'calendar'], ['Completed orders', completed, 'check'], ['New enquiries', requested, 'message'], ['Available payout', money(total('available')), 'rupee']],
  }[role];
  const quick = {
    professional: [['My Services', 'briefcase', () => setRoute('post')], ['Business growth', 'chart', () => setRoute('growth')]],
    influencer: [['My Posts', 'megaphone', () => setRoute('post')], ['Business growth', 'chart', () => setRoute('growth')]],
    consultant: [['Availability', 'calendar', () => setRoute('orders')], ['Business growth', 'chart', () => setRoute('growth')]],
  }[role];
  const urgent = !approved ? { text: 'Verification pending. Complete your registration review before accepting work.', action: 'Review details', run: onEditRegistration } : application.review_notes ? { text: application.review_notes, action: 'Review details', run: onEditRegistration } : requested ? { text: `${requested} ${role === 'influencer' ? 'collaboration enquiry' : 'new request'}${requested === 1 ? '' : 's'} waiting for your response.`, action: 'View requests', run: () => setRoute('orders') } : null;
  const fallbackAction = role === 'consultant' ? () => setRoute('orders') : () => setSheet('post');
  const hasServicePosts = data.posts.some(post => (post.details?.postType || 'offering') === 'offering' && post.status === 'published');
  const trustedTrialEnd = approved && trial?.approval_started_at && !trial?.approval_date_missing ? trial.trial_ends_at : null;
  const trialExpired = trustedTrialEnd && Date.parse(trustedTrialEnd) <= Date.now();
  const activePaid = trial?.status === 'active' && trial.current_period_end && Date.parse(trial.current_period_end) > Date.now();
  return <div className={`pd-dashboard pd-${role}`} style={{ '--pd-accent': config.accent }}>
    <PartnerGettingStarted role={role} approved application={application} data={data} onEditRegistration={onEditRegistration} setRoute={setRoute} setSheet={setSheet} />
    {role === 'professional' && <DashboardAvailability online={online} busy={busy} approved={approved} act={act} setAvailability={setAvailability} setOnline={setOnline} />}
    {role === 'professional' && !hasServicePosts && <section className="pd-card pd-first-service"><span><Icon name="briefcase" size={24} /></span><div><h2>Add your first service</h2><p>Publish a service so customers can review your offering and send a request.</p></div><button className="pd-primary" onClick={() => setSheet('post')}>Add service</button></section>}
    {urgent && <section className="pd-notice"><Icon name={!approved ? 'shield' : 'bell'} size={20} /><p>{t(urgent.text)}</p><button className="pd-text-button" onClick={urgent.run}>{t(urgent.action)}<Icon name="chevronRight" size={16} /></button></section>}
    <section className="pd-overview" aria-label={t('Your overview')}><div className="pd-section-title"><div><h2>{t('Your overview')}</h2><p>{t('Live activity from your partner account')}</p></div></div>
      <div className="pd-metrics">{metrics.map(([label, value, icon]) => <article key={label}><span className="pd-metric-icon"><Icon name={icon} size={18} /></span><strong>{value}</strong><span>{t(label)}</span></article>)}</div>
    </section>
    <DashboardWork role={role} title={config.incoming} orders={requestedOrders} incoming setSheet={setSheet} setRoute={setRoute} />
    {pendingPriceOrders.length>0&&<DashboardWork role={role} title="Awaiting customer price approval" orders={pendingPriceOrders} setSheet={setSheet} setRoute={setRoute} />}
    {PARTNER_DEMO_ENABLED && onEnterDemo && <div className="pd-preview-control"><span>Interactive sample workspace</span><button type="button" className="pd-text-button" onClick={onEnterDemo}>Enter Demo Mode<Icon name="grid" size={16} /></button></div>}
    <section className="pd-card pd-actions"><PartnerSectionHeader title="Quick actions" icon="grid" /><button className="pd-primary" onClick={fallbackAction}><Icon name={role === 'consultant' ? 'calendar' : 'plus'} size={20} />{t(config.primary)}</button>
        <div className="pd-shortcuts">{[...quick, ['Earnings', 'rupee', () => setSheet('Earnings')], ['Support', 'message', () => setSheet('Help & Support')]].map(([label, icon, run]) => <button key={label} onClick={run}><span><Icon name={icon} size={20} /></span>{t(label)}<Icon name="chevronRight" size={15} /></button>)}</div>
      </section>
      <DashboardWork role={role} title={config.ongoing} orders={active} setSheet={setSheet} setRoute={setRoute} />
      {role === 'influencer' && <LatestPosts posts={data.posts} setRoute={setRoute} />}
      <button type="button" className="pd-growth-link" onClick={() => setRoute('growth')}><span><Icon name="chart" size={20} /></span><span><b>Grow your business</b><small>Profile, enquiries, and reviews</small></span><Icon name="chevronRight" size={18} /></button>
      {trialExpired && <section className="pd-card pd-subscription"><span className="pd-eyebrow"><Icon name="sparkles" size={16} />{activePaid ? 'Membership active' : 'Your free trial has ended'}</span><p>{activePaid ? `Renewal date: ${new Date(trial.current_period_end).toLocaleDateString('en-IN')}` : 'Choose a plan to continue publishing and receiving new bookings when billing is enabled.'}</p><button className="pd-secondary" onClick={() => setSheet('Subscription')}>{activePaid ? 'View subscription' : 'View Plans'}</button></section>}
  </div>;
}

function PartnerGettingStarted({ role, approved, application, data, onEditRegistration, setRoute, setSheet }) {
  const roleCopy = {
    professional: { offer: 'Add a service with its price and service area.', work: 'New customer requests appear in My Orders.' },
    influencer: { offer: 'Create a post or package to show brands what you offer.', work: 'Collaboration enquiries appear in My Orders.' },
    consultant: { offer: 'Add the consultation you want to offer.', work: 'Consultation enquiries appear in My Orders.' },
  }[role];
  const posts = data.posts || [];
  const hasOffer = role === 'professional'
    ? posts.some(post => (post.details?.postType || 'offering') === 'offering' && post.status === 'published')
    : posts.some(post => post.status === 'published');
  const hasDraft = posts.some(post => post.status === 'draft');
  const pending = data.orders.filter(order => order.status === 'requested' && !order.backup_price_approval_pending);
  let title;
  let explanation;
  let action;
  let run;

  if (!approved) {
    const reviewing = application.status === 'under_review';
    const changesRequested = application.status === 'changes_required';
    const draft = application.status === 'draft';
    title = reviewing ? 'Eazily is reviewing your profile' : changesRequested ? 'Eazily asked for an update' : draft ? 'Finish your registration' : 'Your profile needs approval';
    explanation = reviewing
      ? 'Your details are with Eazily for review. Posting and accepting work unlock after approval.'
      : changesRequested
        ? application.review_notes || 'Open your registration to see and make the requested changes.'
        : draft
          ? 'Add the required details so your profile can be reviewed.'
          : 'You can check your registration now. Posting and accepting work unlock after approval.';
    action = draft ? 'Continue registration' : changesRequested ? 'Update registration' : 'Review registration';
    run = onEditRegistration;
  } else if (pending.length > 0) {
    title = `${pending.length} ${role === 'influencer' ? 'collaboration ' : ''}enquir${pending.length === 1 ? 'y needs' : 'ies need'} your reply`;
    explanation = 'Open an enquiry to read the details and choose what to do next.';
    action = 'Review enquiries';
    run = () => setRoute('orders');
  } else if (role === 'influencer' && !hasOffer && hasDraft) {
    title = 'Finish your draft post';
    explanation = 'Your draft is not visible to brands yet. Open My Posts to continue it.';
    action = 'View my posts';
    run = () => setRoute('post');
  } else if (!hasOffer) {
    title = role === 'influencer' ? 'Create your first post or package' : role === 'professional' ? 'Add your first service' : 'Add your consultation offer';
    explanation = 'This gives people a clear idea of what they can ask you for.';
    action = role === 'professional' ? 'Add a service' : role === 'consultant' ? 'Add an offer' : 'Create a post';
    run = () => setSheet('post');
  } else {
    title = 'Your profile and offer are ready';
    explanation = 'Check your posts or enquiries whenever you return.';
    action = role === 'influencer' ? 'View my posts' : 'View my work';
    run = () => setRoute(role === 'professional' ? 'post' : role === 'consultant' ? 'orders' : 'post');
  }

  const steps = [
    { title: approved ? 'Set up your profile' : application.status === 'changes_required' ? 'Update your profile' : application.status === 'draft' ? 'Complete your profile' : 'Profile review', detail: approved ? 'Add your details and the work you do.' : application.status === 'under_review' ? 'Eazily is checking your submitted details.' : application.status === 'changes_required' ? 'Eazily requested an update to your registration.' : 'Add or review your registration details.' },
    { title: role === 'influencer' ? 'Share a post or package' : role === 'professional' ? 'Add a service' : 'Add a consultation', detail: approved ? roleCopy.offer : 'Available after your profile is approved.' },
    { title: role === 'influencer' ? 'Reply to brand enquiries' : 'Reply to customer enquiries', detail: approved ? roleCopy.work : 'New enquiries are available after approval.' },
  ];

  return <section className="pd-getting-started" aria-labelledby="pd-getting-started-title">
    <div className="pd-getting-started-main">
      <span className={`pd-getting-started-status${approved ? ' is-ready' : ''}`}><Icon name={approved ? 'check' : 'clock'} size={16} />{t(approved ? 'Your next step' : application.status === 'under_review' ? 'Waiting for approval' : application.status === 'changes_required' ? 'Update requested' : application.status === 'draft' ? 'Registration not finished' : 'Approval needed')}</span>
      <h2 id="pd-getting-started-title">{t(title)}</h2>
      <p>{t(explanation)}</p>
      <button type="button" className="pd-primary" onClick={run}>{t(action)}</button>
    </div>
    <div className="pd-getting-started-steps">
      <h3>{t('How this works')}</h3>
      <ol>{steps.map((step, index) => <li key={step.title} className={!approved && index > 0 ? 'is-locked' : ''}>
        <span aria-hidden="true">{index + 1}</span><div><b>{t(step.title)}</b><p>{t(step.detail)}</p></div>
      </li>)}</ol>
    </div>
  </section>;
}

function DashboardAvailability({ online, busy, approved, act, setAvailability, setOnline }) {
  return <section className="pd-availability-card" aria-label="Availability">
    <span className={`pd-availability-dot${online ? ' is-online' : ''}`} aria-hidden="true" />
    <div><b>{online ? 'You are online' : 'You are offline'}</b><small>{online ? 'You can receive new requests.' : 'Turn on availability to receive new requests.'}</small></div>
    <button type="button" role="switch" aria-label="Availability" aria-checked={online} disabled={!approved || busy} onClick={() => act(async () => { const result = await setAvailability(!online); setOnline(result.online); })}><span /></button>
  </section>;
}

export function PartnerGrowthDashboard({ role, profile, data, setRoute, setSheet, onEditRegistration }) {
  const requested = data.orders.filter(order => order.status === 'requested' && !order.backup_price_approval_pending).length;
  const leads = (data.leads || []).filter(lead => lead.status !== 'lost').length;
  const enquiries = Math.max(requested, leads);
  const bookings = data.orders.filter(order => ['accepted', 'active', 'awaiting_acceptance', 'completed'].includes(order.status)).length;
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
    : data.reviews.length ? 'Reply to new enquiries promptly and keep your work details current.' : 'Keep your profile current. Customer reviews will appear here after completed work.';

  return <div className="pd-dashboard pd-growth-dashboard" style={{ '--pd-accent': 'var(--purple)' }}>
    <section className="pd-growth-metrics" aria-label="Business growth metrics">
      {[["Enquiries", enquiries, 'message'], ['Bookings', bookings, 'briefcase'], ['Customer reviews', data.reviews.length, 'star']].map(([label, value, icon]) => <article key={label}><span className="pd-growth-icon"><Icon name={icon} size={20} /></span><div><small>{label}</small><b>{value}</b></div></article>)}
    </section>

    <section className="pd-growth-progress pd-card" aria-labelledby="pd-profile-progress-title">
      <div className="pd-growth-progress-head"><span className="pd-growth-icon"><Icon name="image" size={22} /></span><div><h2 id="pd-profile-progress-title">Complete your profile</h2><p>{completion}% of key profile details are complete</p></div><strong>{completion}%</strong></div>
      <div className="pd-progress-track" role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span style={{ width: `${completion}%` }} /></div>
      <p className="pd-growth-hint">{tip}</p>
      <button type="button" className="pd-primary" onClick={completion < 100 ? onEditRegistration : () => setRoute('profile')}>{completion < 100 ? 'Complete profile' : 'View profile'}</button>
    </section>

    <section className="pd-card pd-growth-tools"><PartnerSectionHeader title="Business tools" subtitle="Manage your partner account" /><div className="pd-growth-tool-list">{tools.map(([title, detail, icon, action]) => <button type="button" key={title} onClick={action}><span className="pd-growth-icon"><Icon name={icon} size={19} /></span><span><b>{title}</b><small>{detail}</small></span><Icon name="chevronRight" size={18} /></button>)}</div></section>

    <section className="pd-card pd-growth-reviews"><PartnerSectionHeader title="Customer reviews" action={<button type="button" className="pd-text-button" onClick={() => setRoute('profile')}>View profile<Icon name="chevronRight" size={15} /></button>} /><div className="pd-review-summary"><Icon name="star" size={21} /><strong>{averageRating || '—'}</strong><span>{data.reviews.length ? `${data.reviews.length} ${data.reviews.length === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}</span></div><p>{data.reviews.length ? 'Reviews from completed work appear on your partner profile.' : 'Customer reviews will appear here after completed work.'}</p></section>

    <section className="pd-growth-tip"><span className="pd-growth-icon"><Icon name="sparkles" size={20} /></span><div><b>Growth tip</b><p>{tip}</p></div></section>
  </div>;
}

export function PartnerEarningsDashboard({ role, data, total, money, setSheet }) {
  const recent = [...data.earnings].sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)).slice(0, 5);
  return <div className="pd-dashboard pd-earnings-dashboard" style={{ '--pd-accent': 'var(--purple)' }}>
    <DashboardPayments role={role} available={money(total('available'))} pending={money(total('pending'))} setSheet={setSheet} />
    <section className="pd-card pd-earnings-history"><PartnerSectionHeader title="Recent earnings" action={<button type="button" className="pd-text-button" onClick={() => setSheet('Earnings')}>View details<Icon name="chevronRight" size={15} /></button>} />{recent.length ? recent.map(entry => <article key={entry.id}><span className="pd-growth-icon"><Icon name="rupee" size={18} /></span><span><b>{entry.state === 'reversed' ? 'Reversed entry' : 'Partner earnings'}</b><small>{entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN') : 'Date unavailable'}</small></span><strong>{money(entry.amount)}</strong></article>) : <div className="pd-empty"><span><Icon name="rupee" size={22} /></span><div><h3>No earnings recorded yet</h3><p>Earnings appear here when eligible work is completed and recorded.</p></div></div>}</section>
  </div>;
}

function DashboardWork({ role, title, orders, incoming = false, setSheet, setRoute }) {
  const icon = incoming ? 'message' : presentation[role].workIcon;
  return <section className={`pd-card pd-work-section ${incoming ? 'pd-incoming' : ''}`}><PartnerSectionHeader title={title} icon={icon} count={orders.length} action={<button className="pd-text-button" onClick={() => setRoute('orders')}>{t('View all')}<Icon name="chevronRight" size={15} /></button>} />
    {orders.length ? <div className="pd-work-list">{orders.slice(0, 3).map(order => <article className={`pd-work-item pd-work-${role}`} key={order.id}>
      <span className="pd-work-icon">{role === 'consultant' && order.deadline ? <><b>{new Date(order.deadline).getDate()}</b><small>{new Date(order.deadline).toLocaleDateString('en-IN', { month: 'short' })}</small></> : <Icon name={presentation[role].workIcon} size={21} />}</span>
      <div className="pd-work-copy"><span className="pd-work-customer">{order.customer_name || order.customerName || t('Customer')}</span><h3>{order.title || order.details?.service || order.details?.category || t('Booking')}</h3><p><Icon name="calendar" size={14} />{order.deadline ? new Date(order.deadline).toLocaleString('en-IN') : t('Date not scheduled')}</p>{role === 'influencer' && typeof order.details?.deliverables === 'string' && <p><Icon name="video" size={14} />{order.details.deliverables}</p>}<span className="pd-order-status">{t((role==='influencer'||role==='consultant')&&order.status==='requested'?'Enquiry received':(role==='influencer'||role==='consultant')&&order.status==='accepted'?'Enquiry accepted':role==='professional'&&order.backup_price_approval_pending?'Waiting for customer price approval':role==='professional'&&order.status==='accepted'&&order.journey_status==='on_the_way'?'On the way':order.status)}</span></div>
      <button className={incoming ? 'pd-secondary' : 'pd-text-button'} onClick={() => setSheet({ order })}>{t(incoming ? 'View request' : 'View details')}<Icon name="chevronRight" size={15} /></button>
    </article>)}</div> : <div className="pd-empty"><span><Icon name={icon} size={25} /></span><div><h3>{t(incoming ? 'Nothing new right now' : role === 'influencer' || role === 'consultant' ? 'No accepted enquiries' : 'No upcoming jobs')}</h3><p>{t(incoming ? 'New requests will appear here when they arrive.' : 'Your work will appear here when it is scheduled.')}</p></div></div>}
  </section>;
}

function LatestPosts({ posts, setRoute }) {
  const latest = posts.filter(post => post.status !== 'archived').slice(0, 2);
  return <section className="pd-card"><PartnerSectionHeader title="My Latest Posts" icon="megaphone" action={<button className="pd-text-button" onClick={() => setRoute('post')}>{t('View all')}</button>} />{latest.length ? <div className="pd-latest-posts">{latest.map(post => <article key={post.id}><Icon name="video" size={20} /><div><h3>{(post.details.caption || post.details.title || t('Post')).slice(0, 72)}</h3><span className="pd-order-status">{t(post.status)}</span></div></article>)}</div> : <div className="pd-empty"><span><Icon name="megaphone" size={23} /></span><div><h3>No posts yet</h3><button className="pd-text-button" onClick={() => setRoute('post')}>{t('Create Post')}</button></div></div>}</section>;
}

function DashboardPayments({ role, available, pending, setSheet }) {
  return <section className="pd-card pd-earnings"><PartnerSectionHeader title="Earnings" icon="rupee" action={<button className="pd-text-button" onClick={() => setSheet('Earnings')}>{t('View details')}</button>} /><div className="pd-payout"><span>{t('Available payout')}</span><strong>{available}</strong></div><div className="pd-pending"><span>{t('Pending payout')}</span><b>{pending}</b></div><button className="pd-rewards" onClick={() => setSheet('Rewards')}><Icon name="sparkles" size={19} /><span>{t('Rewards')}</span><Icon name="chevronRight" size={16} /></button>{(role === 'influencer' || role === 'consultant') && <p className="pd-payment-note">{t('Enquiries do not create paid bookings or earnings. Official payment and payout setup is pending.')}</p>}</section>;
}
