import Icon from '../../components/Icon.jsx';
import ServiceIllustration from '../user-art/ServiceIllustration.jsx';
import MediaPreview from './MediaPreview.jsx';
import './service-post-status.css';

const labels = { published: 'Live', paused: 'Paused', draft: 'Draft', pending_review: 'Safety check', changes_required: 'Update needed', rejected: 'Not approved', archived: 'Archived' };
const nextStep = post => {
  if (post.status === 'pending_review') return 'This listing needs a quick safety check before it appears to customers. You can still edit it.';
  if (post.status === 'changes_required') return 'Make the requested update, then publish again.';
  if (post.status === 'rejected') return 'This listing cannot be shown. Review the reason before editing or contacting support.';
  if (post.status === 'paused') return post.review_notes?.startsWith('Admin hidden:') ? 'This listing is hidden by Eazily. Contact support if you think this is a mistake.' : 'Customers cannot see this listing while it is paused.';
  return '';
};

export default function ServicePostList({ posts, busy, onAdd, onEdit, onAction }) {
  const services = posts.filter(post => (post.details?.postType || 'offering') === 'offering');
  return <section className="service-post-list"><div className="section-head"><div><span className="eyebrow">Service Partner</span><h2>My Services</h2></div><button className="btn btn-primary" onClick={onAdd}><Icon name="plus" size={18} /> Add Service</button></div>
    {!services.length && <section className="service-list-empty"><span><Icon name="briefcase" size={25} /></span><h3>Apni Service Jodein</h3><p>Apna kaam yahan add karein, taaki customers aapki service dekh sakein.</p><button className="btn btn-primary" onClick={onAdd}>+ Add Service / Service Jodein</button></section>}
    {services.map(post => <article className="service-management-card" key={post.id}><div className="service-card-cover">{post.details.media?.[0] ? <MediaPreview media={post.details.media.slice(0, 1)} /> : <ServiceIllustration name={post.details.service || post.details.category} />}</div><div className="service-card-content"><div className="service-card-heading"><span className={`service-status service-status-${post.status}`}>{labels[post.status] || post.status}</span><details><summary aria-label="More service actions"><Icon name="more" size={20} /></summary><div><button type="button" disabled={busy} onClick={() => onAction(post, 'duplicate')}>Duplicate</button><button type="button" disabled={busy || post.status === 'archived'} onClick={() => onAction(post, 'archive')}>Archive</button></div></details></div><h3>{post.details.title || post.details.service || 'Service'}</h3><p><b>₹{Number(post.details.serviceCharge || 0).toLocaleString('en-IN')}</b> · {post.details.pricingType || 'Fixed Price'}</p>{nextStep(post) && <p className="service-next-step">{nextStep(post)}</p>}{post.review_notes && <small>{post.review_notes}</small>}<div className="service-card-actions"><button type="button" className="btn btn-outline" onClick={() => onEdit(post)}>Edit</button>{post.status === 'published' && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => onAction(post, 'pause')}>Pause</button>}{post.status === 'paused' && !post.review_notes?.startsWith('Admin hidden:') && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => onAction(post, 'resume')}>Resume</button>}</div></div></article>)}
  </section>;
}
