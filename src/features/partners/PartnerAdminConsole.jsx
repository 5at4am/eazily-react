import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, Field } from '../../components/Ui.jsx';
import { readRows, requireBackend, rpc } from '../../services/experience.js';
import { useRealtime } from '../../lib/realtime.jsx';
import ConsultantLegal from './legal/ConsultantLegal.jsx';
import ConsumerLegalCenter from '../legal/ConsumerLegal.jsx';
import SellerAdminSettings from './SellerAdminSettings.jsx';
import ServicePostApprovalAdmin from './ServicePostApprovalAdmin.jsx';
import ServiceDocumentReviewAdmin from './ServiceDocumentReviewAdmin.jsx';

const sections = [
  ['applications', 'Applications'],
  ['posts', 'Posts'],
  ['documents', 'Documents'],
  ['compliance', 'Compliance'],
  ['pricing', 'Pricing'],
  ['rules', 'Rules'],
];

const reviewStatuses = new Set(['submitted', 'under_review']);

export default function PartnerAdminConsole({ notify, canManagePricing = false }) {
  const { revision } = useRealtime();
  const [applications, setApplications] = useState([]);
  const [posts, setPosts] = useState([]);
  const [config, setConfig] = useState(null);
  const [rate, setRate] = useState({ category: '', duration: 30, price: '' });
  const [activeSection, setActiveSection] = useState('applications');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [nextApplications, nextPosts, configRows] = await Promise.all([
      readRows('partner_applications'),
      readRows('partner_posts'),
      readRows('partner_config'),
    ]);
    setApplications(nextApplications);
    setPosts(nextPosts);
    setConfig(configRows[0] || null);
  }, []);

  useEffect(() => {
    load().catch(error => notify(error.message));
  }, [load, notify, revision]);

  const pendingApplications = applications.filter(application => reviewStatuses.has(application.status)).length;
  const pendingPosts = posts.filter(post => post.status === 'pending_review').length;
  const visibleApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications
      .filter(application => !query || [
        application.details?.name,
        application.details?.creatorName,
        application.role,
        application.status,
        application.id,
      ].some(value => String(value || '').toLowerCase().includes(query)))
      .sort((left, right) => Number(reviewStatuses.has(right.status)) - Number(reviewStatuses.has(left.status))
        || Date.parse(right.submitted_at || right.created_at || 0) - Date.parse(left.submitted_at || left.created_at || 0));
  }, [applications, search]);

  async function review(kind, id, status) {
    try {
      await rpc(kind === 'application' ? 'admin_review_partner' : 'admin_review_post', {
        p_id: id,
        p_status: status,
        p_notes: null,
      });
      await load();
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveConfig(event) {
    event.preventDefault();
    try {
      const { error } = await requireBackend().from('partner_config').update(config).eq('id', true);
      if (error) throw error;
      notify('Partner rules saved');
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveRate(event) {
    event.preventDefault();
    try {
      const { error } = await requireBackend().from('consultant_rates').upsert({
        ...rate,
        duration: Number(rate.duration),
        price: Number(rate.price),
        partner_id: null,
      }, { onConflict: 'partner_id,category,duration' });
      if (error) throw error;
      notify('Consultant rate saved');
    } catch (error) {
      notify(error.message);
    }
  }

  function updateConfig(key, value) {
    setConfig(current => current ? { ...current, [key]: value } : current);
  }

  return <div className="partner-admin-console">
    <header className="partner-admin-intro">
      <div>
        <p className="partner-admin-kicker">Marketplace operations</p>
        <h2>Partner operations</h2>
        <p>Review applications, listings, documents, and marketplace rules.</p>
      </div>
      <p className="partner-admin-queue" aria-live="polite">
        <b>{pendingApplications}</b> applications to review
        <span aria-hidden="true">·</span>
        <b>{pendingPosts}</b> posts awaiting review
      </p>
    </header>

    <nav className="partner-admin-nav" aria-label="Partner operations sections">
      {sections.map(([id, label]) => <button
        type="button"
        key={id}
        className={activeSection === id ? 'active' : ''}
        aria-current={activeSection === id ? 'page' : undefined}
        onClick={() => { setActiveSection(id); setSearch(''); }}
      >
        <span>{label}</span>
        {id === 'applications' && pendingApplications > 0 && <span className="partner-admin-count">{pendingApplications}</span>}
        {id === 'posts' && pendingPosts > 0 && <span className="partner-admin-count">{pendingPosts}</span>}
      </button>)}
    </nav>

    <section className="partner-admin-view" aria-label={`${sections.find(([id]) => id === activeSection)?.[1]} workspace`}>
      {activeSection === 'applications' && <section className="admin-panel partner-admin-panel">
        <div className="partner-admin-panel-heading">
          <div><h3>Partner applications</h3><p>Submitted applications appear first. Review each record before changing its status.</p></div>
          <span>{applications.length} total</span>
        </div>
        <Field label="Search applications" type="search" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="partner-admin-list" aria-live="polite">
          {visibleApplications.map(application => <article className="partner-admin-row" key={application.id}>
            <div className="partner-admin-row-copy">
              <b>{application.details?.name || application.details?.creatorName || application.role}</b>
              <p>{application.role} · {application.status}</p>
              {application.review_notes && <small>{application.review_notes}</small>}
              <small>{application.id}</small>
            </div>
            <div className="partner-admin-actions">
              <button type="button" onClick={() => review('application', application.id, 'approved')}>Approve</button>
              <button type="button" onClick={() => review('application', application.id, 'changes_required')}>Request changes</button>
            </div>
          </article>)}
          {!visibleApplications.length && <EmptyState title={applications.length ? 'No matching applications' : 'No partner applications'} text={applications.length ? 'Try a different name, role, status, or ID.' : 'Submitted partner applications will appear here.'} />}
        </div>
      </section>}

      {activeSection === 'posts' && <>
        <ServicePostApprovalAdmin notify={notify} />
        <section className="admin-panel partner-admin-panel">
          <div className="partner-admin-panel-heading">
            <div><h3>Creator and consultant posts</h3><p>Publish or reject non-professional posts after review.</p></div>
            <span>{posts.filter(post => post.role !== 'professional').length} total</span>
          </div>
          {posts.filter(post => post.role !== 'professional').map(post => <article className="partner-admin-row" key={post.id}>
            <div className="partner-admin-row-copy">
              <b>{post.details?.title || post.role}</b>
              <p>{post.role} · {post.status}</p>
              {post.details?.description && <small>{post.details.description}</small>}
              <small>{post.id}</small>
            </div>
            <div className="partner-admin-actions">
              <button type="button" onClick={() => review('post', post.id, 'published')}>Publish</button>
              <button type="button" onClick={() => review('post', post.id, 'rejected')}>Reject</button>
            </div>
          </article>)}
          {!posts.some(post => post.role !== 'professional') && <EmptyState title="No creator or consultant posts" text="Published and submitted posts will appear here for review." />}
        </section>
      </>}

      {activeSection === 'documents' && <ServiceDocumentReviewAdmin applications={applications} notify={notify} />}

      {activeSection === 'compliance' && <>
        <section className="admin-panel partner-admin-panel"><ConsultantLegal reviewOnly /></section>
        <section className="admin-panel partner-admin-panel"><ConsumerLegalCenter reviewOnly /></section>
      </>}

      {activeSection === 'pricing' && <>
        {canManagePricing ? <SellerAdminSettings notify={notify} /> : <section className="admin-panel partner-admin-panel">
          <h3>Seller pricing</h3><p>Pricing and finance settings are available to platform admins only.</p>
        </section>}
        <form className="admin-panel partner-admin-panel partner-admin-form" onSubmit={saveRate}>
          <div className="partner-admin-panel-heading"><div><h3>Consultant rate</h3><p>Set the platform rate for a consultation category and session length.</p></div></div>
          <Field label="Consultation category" value={rate.category} required onChange={event => setRate({ ...rate, category: event.target.value })} />
          <div className="form-grid">
            <Field label="Session duration (minutes)" type="number" min="10" value={rate.duration} required onChange={event => setRate({ ...rate, duration: event.target.value })} />
            <Field label="Eazily price (₹)" type="number" min="1" value={rate.price} required onChange={event => setRate({ ...rate, price: event.target.value })} />
          </div>
          <button className="btn btn-primary">Assign rate</button>
        </form>
      </>}

      {activeSection === 'rules' && (config ? <form className="admin-panel partner-admin-panel partner-admin-form" onSubmit={saveConfig}>
        <div className="partner-admin-panel-heading"><div><h3>Partner rules and Cashfree</h3><p>Changes apply to marketplace eligibility, payments, and availability.</p></div></div>
        <div className="form-grid">
          <Field label="Influencer threshold on one platform" type="number" min="5000" value={config.influencer_threshold} onChange={event => updateConfig('influencer_threshold', Number(event.target.value))} />
          <Field label="Platform fee (%)" type="number" min="0" max="100" value={config.influencer_platform_fee_percent} onChange={event => updateConfig('influencer_platform_fee_percent', Number(event.target.value))} />
          <Field label="Initial payout release (%)" type="number" min="0" max="100" value={config.influencer_initial_release_percent} onChange={event => updateConfig('influencer_initial_release_percent', Number(event.target.value))} />
          <Field label="Customer review window (hours)" type="number" min="1" value={config.influencer_review_window_hours} onChange={event => updateConfig('influencer_review_window_hours', Number(event.target.value))} />
          <Field label="Availability freshness (minutes)" type="number" min="5" value={config.availability_minutes} onChange={event => updateConfig('availability_minutes', Number(event.target.value))} />
        </div>
        <label className="partner-admin-consent"><input type="checkbox" checked={Boolean(config.cashfree_enabled)} onChange={event => updateConfig('cashfree_enabled', event.target.checked)} />
          <span>Enable Cashfree checkout only after credentials, webhooks, Easy Split, and sandbox tests are complete.</span>
        </label>
        <button className="btn btn-primary">Save rules</button>
      </form> : <section className="admin-panel partner-admin-panel" role="status"><h3>Partner rules</h3><p>Partner rules are unavailable until the configuration record loads.</p></section>)}
    </section>
  </div>;
}
