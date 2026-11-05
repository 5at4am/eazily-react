import Icon from '../../components/Icon.jsx';
import ServiceIllustration from '../user-art/ServiceIllustration.jsx';
import MediaPreview from './MediaPreview.jsx';
import PartnerSectionHeader from './PartnerSectionHeader.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';

const labels = { published: 'Live', paused: 'Paused', draft: 'Draft', pending_review: 'Pending', changes_required: 'Draft', rejected: 'Draft', archived: 'Archived' };

export default function ServicePostList({ posts, busy, onAdd, onEdit, onAction }) {
  const services = posts.filter(post => (post.details?.postType || 'offering') === 'offering');
  return <section className="service-post-list"><PartnerSectionHeader className="section-head" title="My Services" subtitle="Service Partner" action={<Button type="button" onClick={onAdd}><Icon name="plus" size={18} /> Add Service</Button>} />
    {!services.length && <section className="service-list-empty"><span><Icon name="briefcase" size={25} /></span><h3>Apni Service Jodein</h3><p>Apna kaam yahan add karein, taaki customers aapki service dekh sakein.</p><Button type="button" onClick={onAdd}>+ Add Service / Service Jodein</Button></section>}
    {services.map(post => <article className="service-management-card" key={post.id}><div className="service-card-cover">{post.details.media?.[0] ? <MediaPreview media={post.details.media.slice(0, 1)} /> : <ServiceIllustration name={post.details.service || post.details.category} />}</div><div className="service-card-content"><div className="service-card-heading"><Badge variant={post.status === 'published' ? 'default' : 'secondary'}>{labels[post.status] || post.status}</Badge><details><summary aria-label="More service actions"><Icon name="more" size={20} /></summary><div><button type="button" disabled={busy} onClick={() => onAction(post, 'duplicate')}>Duplicate</button><button type="button" disabled={busy || post.status === 'archived'} onClick={() => onAction(post, 'archive')}>Archive</button></div></details></div><h3>{post.details.title || post.details.service || 'Service'}</h3><p><b>₹{Number(post.details.serviceCharge || 0).toLocaleString('en-IN')}</b> · {post.details.pricingType || 'Fixed Price'}</p>{post.review_notes && <small>{post.review_notes}</small>}<div className="service-card-actions"><Button type="button" variant="outline" onClick={() => onEdit(post)}>Edit</Button>{post.status === 'published' && <Button type="button" variant="outline" disabled={busy} onClick={() => onAction(post, 'pause')}>Pause</Button>}{post.status === 'paused' && !post.review_notes?.startsWith('Admin hidden:') && <Button type="button" variant="outline" disabled={busy} onClick={() => onAction(post, 'resume')}>Resume</Button>}</div></div></article>)}
  </section>;
}
