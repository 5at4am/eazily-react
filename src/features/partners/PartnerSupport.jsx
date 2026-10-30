import { useEffect, useState } from 'react';
import { readRows } from '../../services/experience.js';
import { useRealtime } from '../../lib/realtime.jsx';
import SupportForm from '../account/SupportForm.jsx';
import SupportThread from '../account/SupportThread.jsx';

const labels = { open: 'Open', in_progress: 'In Progress', waiting_customer: 'Waiting for you', resolved: 'Resolved', closed: 'Closed' };

export default function PartnerSupport({ notify }) {
  const { revision } = useRealtime();
  const [tickets, setTickets] = useState([]);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    readRows('support_tickets', query => query.order('created_at', { ascending: false }).limit(100))
      .then(rows => { if (active) setTickets(rows); })
      .catch(error => notify(error.message));
    return () => { active = false; };
  }, [notify, revision, reload]);

  return <section className="partner-support">
    <h2>Help &amp; Support</h2>
    <SupportForm notify={notify} onCreated={() => setReload(value => value + 1)} />
    <h3>My tickets</h3>
    {!tickets.length && <p>Your support requests and replies will appear here.</p>}
    {tickets.map(ticket => <article className="review-item support-ticket" key={ticket.id}>
      <b>EAZ-{ticket.id.slice(0, 8).toUpperCase()} <span className={`support-badge ${ticket.status}`}>{labels[ticket.status] || ticket.status}</span></b>
      <p>{ticket.category} · {ticket.description}</p>
      <small>Raised {new Date(ticket.created_at).toLocaleString('en-IN')} · Updated {new Date(ticket.updated_at || ticket.created_at).toLocaleString('en-IN')}</small>
      <SupportThread ticket={ticket} revision={revision} />
    </article>)}
  </section>;
}
