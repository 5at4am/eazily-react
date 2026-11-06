import { useCallback, useEffect, useState } from 'react';
import { Field } from '../../components/Ui.jsx';
import { readRows, requireBackend, rpc } from '../../services/experience.js';
import { useRealtime } from '../../lib/realtime.jsx';
import MediaPreview from './MediaPreview.jsx';

export default function ServicePostApprovalAdmin({ notify, canManagePricing = false }) {
  const { revision } = useRealtime();
  const [posts, setPosts] = useState([]);
  const [edits, setEdits] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [applications, setApplications] = useState([]);
  const [config, setConfig] = useState(null);
  const [reasons, setReasons] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const load = useCallback(async () => {
    const [nextPosts, nextEdits, nextDecisions, rules, nextPricingRules, nextApplications] = await Promise.all([
      readRows('partner_posts', q => q.eq('role', 'professional').order('updated_at', { ascending: false }).limit(100)),
      readRows('service_post_revisions', q => q.eq('status', 'pending_review').limit(100)),
      readRows('service_post_approval_decisions', q => q.order('decided_at', { ascending: false }).limit(500)),
      readRows('service_post_approval_config'),
      canManagePricing
        ? readRows('seller_pricing_rules', q => q.eq('role', 'professional').order('version', { ascending: false }))
        : Promise.resolve([]),
      readRows('partner_applications').catch(() => []),
    ]);
    setPosts(nextPosts);
    setEdits(nextEdits);
    setDecisions(nextDecisions);
    setConfig(rules[0] || null);
    setPricingRules(nextPricingRules);
    setApplications(nextApplications);
  }, [canManagePricing]);
  useEffect(() => { load().catch(error => notify(error.message)); }, [load, notify, revision]);
  const reasonField = id => <Field label="Decision reason" value={reasons[id] || ''}
    required minLength={3} hint="Required for the audit trail and to explain the decision to the partner."
    onChange={event => setReasons(current => ({ ...current, [id]: event.target.value }))} />;
  async function reviewPost(post, status) {
    const reason = reasons[post.id]?.trim() || '';
    if (reason.length < 3) {
      notify('Add a decision reason of at least 3 characters before continuing.');
      return;
    }
    try {
      await rpc('admin_review_post', { p_id: post.id, p_status: status, p_notes: reason });
      await load();
    } catch (error) {
      const message = /pricing configuration is incomplete|complete customer pricing/i.test(error.message)
        ? 'This post is still pending. Customer pricing is not fully configured or enabled. Complete every required field for the Professional pricing rule under Seller subscription and pricing configuration, save a new enabled version, then publish again.'
        : error.message;
      notify(message);
    }
  }
  async function reviewEdit(edit, approve) {
    const reason = reasons[edit.id]?.trim() || '';
    if (reason.length < 3) {
      notify('Add a decision reason of at least 3 characters before continuing.');
      return;
    }
    try {
      await rpc('review_service_post_revision', { p_revision: edit.id, p_approve: approve, p_reason: reason });
      await load();
    } catch (error) { notify(error.message); }
  }
  async function saveRules(event) {
    event.preventDefault();
    try {
      const { error } = await requireBackend().from('service_post_approval_config').update({
        auto_publish_enabled: config.auto_publish_enabled,
        min_description_length: Number(config.min_description_length),
        duplicate_window_days: Number(config.duplicate_window_days),
        require_review_for_new_media: config.require_review_for_new_media,
        flagged_text_pattern: config.flagged_text_pattern,
        flagged_media_pattern: config.flagged_media_pattern,
        updated_at: new Date().toISOString(),
      }).eq('id', true);
      if (error) throw error;
      notify('Service Partner approval rules saved');
      await load();
    } catch (error) { notify(error.message); }
  }
  const activePricingRule = pricingRules.find(rule => rule.enabled);
  const missingPricingFields = !canManagePricing ? [] : !activePricingRule
    ? ['an enabled Professional pricing rule']
    : [
      ['seller_tax_bps', 'vendor tax rate'],
      ['customer_tax_bps', 'customer tax rate'],
      ['fee_tax_bps', 'fee tax rate'],
      ['separate_fee_paise', 'separate fee (enter 0 if none)'],
      ['include_visiting', 'visiting charge treatment'],
      ['include_additional', 'additional charge treatment'],
      ['below_100_bps', 'markup for services below ₹100'],
    ].filter(([key]) => activePricingRule[key] === null || activePricingRule[key] === undefined).map(([, label]) => label);
  const pricingReady = canManagePricing ? missingPricingFields.length === 0 : null;

  return <>
    <section className="admin-panel"><h2>Service Partner post approval</h2>
      <Field label="Show records" as="select" options={['pending', 'published', 'rejected', 'all']} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} />
      <div className={`post-pricing-readiness ${pricingReady === false ? 'needs-attention' : 'is-ready'}`} role="status">
        <b>{pricingReady === null ? 'Professional pricing is validated at publish' : pricingReady ? `Professional pricing ready · rule v${activePricingRule.version}` : 'Professional pricing needs attention'}</b>
        <p>{pricingReady === null
          ? 'Pricing settings are restricted to pricing administrators. The system will still validate the rule before publishing.'
          : pricingReady
          ? 'Customer prices can be calculated. Publishing still requires your review and a decision reason.'
          : `Before publishing, configure ${missingPricingFields.join(', ')} under Partner operations → Pricing. A decision cannot bypass this requirement.`}</p>
      </div>
      <p>Vendor approval and listing approval are separate. Publishing makes this listing visible to customers; it does not approve the vendor application.</p>
      {posts.filter(post => statusFilter === 'all' || (statusFilter === 'pending' ? ['pending_review', 'draft'].includes(post.status) : post.status === statusFilter)).map(post => {
        const latest = decisions.find(item => item.post_id === post.id);
        const autoApproved = decisions.some(item => item.post_id === post.id && item.decision === 'auto_published');
        const application = applications.find(item => item.id === post.partner_id);
        const reasonReady = (reasons[post.id] || '').trim().length >= 3;
        const canPublish = pricingReady !== false && reasonReady;
        return <article className="activity" key={post.id}>
          <div><b>{post.details?.title || 'Service post'}</b><p>{application?.details?.businessName || application?.details?.name || application?.details?.creatorName || 'Professional'} · {post.status}{autoApproved ? ' · Auto-published' : ''}</p>
            <p>{post.details?.category} · {post.details?.service}</p><p>{post.details?.description}</p>
            {post.details?.media?.length > 0 && <MediaPreview media={post.details.media} />}
            {latest && <small>Last decision: {latest.decision} · {latest.reason} · {new Date(latest.decided_at).toLocaleString('en-IN')}</small>}
            {reasonField(post.id)}</div>
          <div>{post.status === 'published' ? <button disabled={!reasonReady} onClick={() => reviewPost(post, 'paused')}>Hide listing</button>
            : <><button disabled={!canPublish} title={pricingReady === false ? 'Complete Professional pricing first' : !reasonReady ? 'Enter a decision reason first' : undefined} onClick={() => reviewPost(post, 'published')}>{post.status === 'pending_review' ? 'Approve and publish' : 'Publish listing'}</button>
              {post.status !== 'rejected' && post.status !== 'changes_required' && <button disabled={!reasonReady} onClick={() => reviewPost(post, 'changes_required')}>Request changes</button>}
              <button disabled={!reasonReady} onClick={() => reviewPost(post, 'rejected')}>Reject listing</button></>}</div>
        </article>;
      })}
      {!posts.some(post => statusFilter === 'all' || (statusFilter === 'pending' ? ['pending_review', 'draft'].includes(post.status) : post.status === statusFilter)) && <p>No {statusFilter === 'pending' ? 'pending' : statusFilter} posts.</p>}
      {edits.map(edit => <article className="activity" key={edit.id}><div>
        <b>Pending edit: {edit.details?.title || 'Service post'}</b>
        <p>{edit.details?.category} · {edit.details?.service}</p><p>{edit.details?.description}</p>
        {edit.details?.media?.length > 0 && <MediaPreview media={edit.details.media} />}
        <p>Currently live: {posts.find(post => post.id === edit.post_id)?.details?.description || 'Approved version remains live.'}</p>
        {reasonField(edit.id)}
       </div><div><button disabled={(reasons[edit.id] || '').trim().length < 3} onClick={() => reviewEdit(edit, true)}>Approve edit</button>
         <button disabled={(reasons[edit.id] || '').trim().length < 3} onClick={() => reviewEdit(edit, false)}>Request edit changes</button></div></article>)}
    </section>
    {config && <form className="admin-panel" onSubmit={saveRules}><h2>Fast approval rules</h2>
      <label><input type="checkbox" checked={config.auto_publish_enabled} onChange={event => setConfig({ ...config, auto_publish_enabled: event.target.checked })} /> Auto-publish trusted later posts</label>
      <Field label="Minimum description length" type="number" min="3" max="500" value={config.min_description_length} onChange={event => setConfig({ ...config, min_description_length: event.target.value })} />
      <Field label="Duplicate review window (days)" type="number" min="1" max="365" value={config.duplicate_window_days} onChange={event => setConfig({ ...config, duplicate_window_days: event.target.value })} />
      <label><input type="checkbox" checked={config.require_review_for_new_media} onChange={event => setConfig({ ...config, require_review_for_new_media: event.target.checked })} /> Review new photos and videos</label>
      <Field label="Flagged text pattern" value={config.flagged_text_pattern} onChange={event => setConfig({ ...config, flagged_text_pattern: event.target.value })} />
      <Field label="Flagged media path pattern" value={config.flagged_media_pattern} onChange={event => setConfig({ ...config, flagged_media_pattern: event.target.value })} />
      <button className="btn btn-primary">Save approval rules</button>
    </form>}
  </>;
}
