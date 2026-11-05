import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Brand, EmptyState, Field } from '../components/Ui.jsx';
import PartnerAdminConsole from '../features/partners/PartnerAdminConsole.jsx';
import ReferralSettings from '../features/account/ReferralSettings.jsx';
import { readRows, requireBackend, rpc } from '../services/experience.js';
import { useRealtime } from '../lib/realtime.jsx';
import ChatSupportReview from '../features/chat/ChatSupportReview.jsx';
import AutomationOperations from '../features/admin/AutomationOperations.jsx';
import SupportThread from '../features/account/SupportThread.jsx';
import SupportAttentionAlerts from '../features/admin/SupportAttentionAlerts.jsx';
import ProfileDetails from '../features/account/ProfileDetails.jsx';
import { bulkServices } from '../features/bulk-orders/bulkPricing.js';
import '../features/account/support.css';
import './admin-ui.css';

const navigation = [['overview', 'dashboard', 'Overview', 'Workspace'], ['orders', 'clipboard', 'Orders & Requests', 'Workspace'], ['users', 'person', 'Users', 'Workspace'], ['partners', 'workers', 'Partners', 'Workspace'], ['finance', 'rupee', 'Finance', 'Business'], ['growth', 'chart', 'Growth & Ratings', 'Business'], ['support', 'message', 'Support & Approvals', 'Business'], ['automation', 'settings', 'Automation', 'Governance'], ['team', 'briefcase', 'Team & HR', 'Governance'], ['settings', 'settings', 'Settings & Audit History', 'Governance'], ['my-profile', 'person', 'My Profile', 'Account']];
const routeTables = {
  orders: ['service_requests', 'partner_orders', 'bulk_quote_requests'], users: ['profiles'], finance: ['customer_payments', 'partner_earnings', 'customer_refunds', 'partner_payouts', 'business_expenses'],
  growth: ['platform_ratings'], support: ['support_tickets'], team: ['staff_access'], settings: ['admin_audit_events']
};

export default function AdminApp({ notify, account, logout }) {
  const permissions={overview:['overview.view'],orders:['orders.view'],users:['users.view'],partners:['partners.view','partner.approve','post.moderate'],finance:['finance.view','finance.manage','refund.view','payout.view'],growth:['ratings.view'],support:['support.manage','chat.review'],automation:['automation.view','automation.manage'],team:['staff.manage'],settings:['audit.view'],'my-profile':['profile.view']};
  const visible=navigation.filter(([id])=>account.profile?.role==='admin'||account.staff?.staff_role==='super_admin'||permissions[id].some(permission=>account.staff?.permissions?.includes(permission)));
  const [route, setRoute] = useState(visible[0]?.[0]||'none'), [search, setSearch] = useState(''), [city, setCity] = useState('All cities'), [period, setPeriod] = useState('This month');
  const searchInput = useRef(null);
  useEffect(() => {
    const handleShortcut = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);
  const displayName = account.profile?.full_name || account.user?.user_metadata?.full_name || 'Admin';
  function Sidebar() { let group = ''; return <aside className="admin-sidebar"><div className="admin-logo"><Brand /><span>Business control</span></div>{visible.map(([id, icon, label, section]) => <div className="admin-nav-item" key={id}>{group !== section && <small className="admin-nav-label">{group = section}</small>}<button type="button" aria-label={label} aria-current={route === id ? 'page' : undefined} className={route === id ? 'active' : ''} onClick={() => setRoute(id)} title={label}><Icon name={icon} /><span>{label}</span></button></div>)}<div className="admin-identity"><span>{displayName.slice(0, 1).toUpperCase()}</span><div><b>{displayName}</b><small>{account.staff?.staff_role || 'Administrator'}</small></div><button type="button" onClick={logout}>Sign out</button></div></aside>; }
   return <main className="admin-screen"><Sidebar /><header className="admin-header"><div className="admin-search"><Icon name="search" /><Field ref={searchInput} label="Search orders, partners, payments…" value={search} onChange={event => setSearch(event.target.value)} /><kbd>Ctrl K</kbd></div><span className="admin-demo-tag">LIVE WORKSPACE</span><div className="admin-header-title"><h1>{navigation.find(item => item[0] === route)?.[2]}</h1><p>Authoritative records · Asia/Kolkata</p></div></header><div className="admin-main">{!['automation', 'partners', 'my-profile'].includes(route) && <section className="admin-global-tools"><div className="form-grid"><Field label="Period" as="select" options={['Today', 'Yesterday', 'Last 7 days', 'This month', 'Previous month', 'Quarter', 'Year', 'Financial year', 'Custom', 'All time']} value={period} onChange={event => setPeriod(event.target.value)} /><Field label="City" as="select" options={['All cities', 'Bhopal']} value={city} onChange={event => setCity(event.target.value)} /></div><small>Active filters: {period} · {city}</small></section>}{route === 'support' && (account.profile?.role === 'admin' || account.staff?.staff_role === 'super_admin' || account.staff?.permissions?.includes('support.manage')) && <SupportAttentionAlerts onOpen={alert => { const target = alert.target === 'booking' ? 'orders' : 'support'; if (!visible.some(([id]) => id === target)) { notify('You do not have access to open this booking.'); return; } setRoute(target); setSearch(alert.entityId); }} />}{route === 'overview' ? <Overview notify={notify} onNavigate={(target, query = '') => { if (!visible.some(([id]) => id === target)) { notify('You do not have access to open this section.'); return; } setRoute(target); setSearch(query); }} /> : route === 'partners' ? <PartnerAdminConsole notify={notify} canManagePricing={account.profile?.role === 'admin'} /> : route === 'automation' ? <AutomationOperations notify={notify} /> : route === 'my-profile' ? <section className="admin-panel admin-own-profile"><h2>My Profile</h2><p>Manage your own account details. This does not change staff permissions or role.</p><ProfileDetails section="Account & Profile" profile={account.profile} notify={notify} onProfile={() => account.refresh?.()} /></section> : <Records route={route} search={search} notify={notify} />}{route === 'support' && <ChatSupportReview notify={notify} />}{route === 'settings' && account.profile?.role==='admin' && <ReferralSettings notify={notify} />}</div></main>;
}

const taskDestination = task => {
  if (['partner.approve', 'post.moderate'].includes(task.required_permission)) return 'partners';
  if (['refund.view', 'payout.view', 'finance.view', 'finance.manage'].includes(task.required_permission)) return 'finance';
  if (['support.manage', 'chat.review'].includes(task.required_permission)) return 'support';
  if (['orders.view'].includes(task.required_permission)) return 'orders';
  return 'automation';
};

function taskLabel(task) {
  const labels = { partner_application: 'Partner application', partner_post: 'Partner listing', refund_review: 'Refund review', service_issue: 'Service issue', chat_report: 'Reported conversation', payout_review: 'Payout review' };
  return labels[task.task_type] || task.task_type.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
}

function Overview({ onNavigate }) {
  const { revision } = useRealtime();
  const [summary, setSummary] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]), [taskError, setTaskError] = useState('');
  useEffect(() => { rpc('admin_dashboard_summary').then(setSummary).catch(reason => setError(reason.message)).finally(() => setLoading(false)); }, [revision]);
  useEffect(() => {
    let active = true;
    readRows('operational_review_tasks', query => query.in('status', ['pending', 'in_review']).order('due_at', { ascending: true, nullsFirst: false }).limit(6))
      .then(rows => { if (active) { setTasks(rows); setTaskError(''); } })
      .catch(reason => { if (active) { setTasks([]); setTaskError(reason.message); } });
    return () => { active = false; };
  }, [revision]);
  if (loading) return <p role="status">Loading business records…</p>;
  if (error) return <p role="alert">Unable to load business totals: {error}</p>;
  const money = value => `₹${((Number(value) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const cards = [['Total customers', summary.customers, 'users'], ['Active partners', summary.activePartners, 'partners'], ['Orders & requests', Number(summary.orders) + Number(summary.partnerOrders), 'orders'], ['Customer cash captured', money(summary.paymentsCapturedPaise), 'finance'], ['Net platform revenue', 'Pending ledger recognition', 'finance'], ['Partner payments due', money(summary.partnerPaymentsDuePaise), 'finance'], ['Refund amount pending', money(summary.refundPendingPaise), 'finance'], ['Platform rating', summary.platformRating == null ? 'No ratings yet' : `${summary.platformRating} / 5 · ${summary.ratingCount}`, 'growth']];
  return <><p className="admin-overview-lede">Know what needs attention. Act from one place.</p><section className="admin-kpis">{cards.map(([label, value, target]) => <button className="admin-kpi" key={label} onClick={() => onNavigate(target)}><span>{label}</span><b>{value}</b><small>View details <span aria-hidden="true">→</span></small></button>)}</section><section className="admin-overview-grid"><div className="admin-panel"><div className="admin-panel-head"><h2>Priority work queue</h2><button type="button" onClick={() => onNavigate('support')}>Open support</button></div>{taskError ? <p role="status">The operational review queue is unavailable. Use the authorized workspaces to review current items.</p> : tasks.length ? <div className="admin-queue-links">{tasks.map(task => <button type="button" key={task.id} onClick={() => onNavigate(taskDestination(task), task.related_entity_id)}><Icon name={task.task_type.includes('refund') || task.task_type.includes('payout') ? 'rupee' : task.task_type.includes('application') || task.task_type.includes('post') ? 'workers' : 'clipboard'} /><span><b>{taskLabel(task)}</b><small>{task.related_entity_type.replaceAll('_', ' ')} · {task.related_entity_id}</small></span><small>{task.escalated_at ? 'Escalated' : task.status === 'in_review' ? 'In review' : 'Needs review'}</small><span aria-hidden="true">→</span></button>)}</div> : <><p>No pending operational review tasks are available to your account.</p><div className="admin-queue-links"><button type="button" onClick={() => onNavigate('orders')}><Icon name="clipboard" /><span><b>Orders &amp; requests</b><small>Bookings and customer requests</small></span><span aria-hidden="true">→</span></button><button type="button" onClick={() => onNavigate('partners')}><Icon name="workers" /><span><b>Partner operations</b><small>Applications, listings and partner records</small></span><span aria-hidden="true">→</span></button><button type="button" onClick={() => onNavigate('finance')}><Icon name="rupee" /><span><b>Finance review</b><small>Payments, refunds and payouts</small></span><span aria-hidden="true">→</span></button></div></>}</div><div className="admin-panel admin-health"><h2>Business at a glance</h2><p>Live figures from authorized Eazily records.</p><dl><div><dt>Customers</dt><dd>{summary.customers}</dd></div><div><dt>Active partners</dt><dd>{summary.activePartners}</dd></div><div><dt>Orders &amp; requests</dt><dd>{Number(summary.orders) + Number(summary.partnerOrders)}</dd></div></dl><small>Updated {new Date(summary.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Missing integrations remain pending rather than appearing as zero-value successes.</small></div></section></>;
}

function Records({ route, search, notify }) {
  const { revision } = useRealtime();
  const tables = useMemo(() => routeTables[route] || [], [route]), [sets, setSets] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  // Realtime refreshes keep the current list on screen so staff do not lose their place or a note being typed.
  const loadedFor = useRef(null);
  const load = useCallback(() => { if (loadedFor.current !== tables) setLoading(true); Promise.all(tables.map(table => readRows(table, query => table === 'support_tickets' ? query.order('created_at', { ascending: false }).limit(200) : table === 'bulk_quote_requests' ? query.order('created_at', { ascending: false }).limit(100) : table === 'partner_earnings' ? query.eq('role', 'professional').limit(100) : query.limit(100)))).then(rows => { loadedFor.current = tables; setError(''); setSets(rows); }).catch(reason => setError(reason.message)).finally(() => setLoading(false)); }, [tables]);
  useEffect(load, [load, revision]);
  const records = useMemo(() => {
    const rows = sets.flatMap((rows, index) => rows.map(row => ({ ...row, _source: tables[index] }))).filter(row => !search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
    return route === 'support' ? rows.sort((a, b) => supportRank(a) - supportRank(b) || Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)) : rows;
  }, [sets, tables, search, route]);
  if (loading) return <p role="status">Loading authorized records…</p>; if (error) return <p role="alert">Unable to load this section: {error}</p>;
  return <section className="admin-panel"><div className="admin-panel-head"><h2>{route === 'finance' ? 'Payments, refunds, payouts, expenses and reconciliation' : 'Authorized records'}</h2><button onClick={() => notify('Server-authorized export requires a configured export function. Filters and formula neutralization will be retained.')}>Export</button></div>{route === 'finance' && <ServicePartnerFinanceSummary />}{route === 'support' && <SupportQueueSummary tickets={records.filter(row => row._source === 'support_tickets')} />}{records.map(row => <article className={`admin-record${row._source === 'support_tickets' && supportRank(row) === 0 ? ' support-urgent-row' : ''}`} key={`${row._source}-${row.id || row.account_id}`}><b>{row._source.replaceAll('_', ' ')}</b><span className="application-state">{row.status || row.staff_role || row.account_status || 'recorded'}</span><p>{row.id || row.account_id}</p><small>{row.created_at ? new Date(row.created_at).toLocaleString() : 'No event timestamp'}</small>{route==='finance'&&<ServicePartnerFinanceRecord row={row}/>} {route==='orders'&&row._source==='bulk_quote_requests'&&<BulkQuoteAdminRecord row={row}/>} {route==='orders'&&row._source==='partner_orders'&&row.role==='professional'&&<AdminOrderIntake orderId={row.id}/>} {route==='support'&&row._source==='support_tickets'&&<SupportTicketDetails ticket={row} />}{route==='support'&&row._source==='support_tickets'&&!row.partner_order_id&&<SupportTicketActions ticket={row} notify={notify} onChange={load}/>}{route==='support'&&row.partner_order_id&&<ServiceIssueActions ticket={row} notify={notify} onChange={load}/>}</article>)}{!records.length && <EmptyState title="No records" text="No authorized records match the active filters." />}</section>;
}

function BulkQuoteAdminRecord({ row }) {
  return <div><p>Customer {row.customer_id} · {row.customer_type} · Quote request (no approved price)</p><p>{(row.services || []).map(item => `${bulkServices.find(service => service.id === item.service_id)?.name || item.service_id} × ${item.quantity}`).join(' · ')}</p><p>{row.address} · {row.preferred_date} · {row.preferred_time}{row.company_name ? ` · ${row.company_name}` : ''}</p></div>;
}

const financeMoney = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(paise || 0) / 100);

function ServicePartnerFinanceSummary() {
  const { revision } = useRealtime();
  const [summary, setSummary] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    rpc('admin_service_partner_finance_summary').then(value => { if (active) { setSummary(value); setError(''); } })
      .catch(reason => { if (active) { setSummary(null); setError(reason.message); } });
    return () => { active = false; };
  }, [revision]);
  if (error) return <p role="alert">Service Partner finance summary unavailable: {error}</p>;
  if (!summary) return <p role="status">Loading Service Partner finance summary…</p>;
  return <section aria-label="Service Partner finance" className="admin-kpis">
    {[
      ['Customer captured', summary.customerCapturedPaise],
      ['Customer refunded', summary.customerRefundedPaise],
      ['Partner payable after refunds and paid payouts', summary.partnerPayablePaise],
      ['Recorded paid payouts', summary.paidPayoutPaise],
    ].map(([label, amount]) => <div className="admin-kpi" key={label}><b>{financeMoney(amount)}</b><span>{label}</span></div>)}
  </section>;
}

function ServicePartnerFinanceRecord({ row }) {
  if (row._source === 'customer_payments' && row.partner_order_id) return <p>Service order {row.partner_order_id} · Customer captured {financeMoney(row.amount_paise)} · Refunded {financeMoney(row.refunded_paise)}</p>;
  if (row._source === 'partner_earnings' && row.role === 'professional') return <p>Service order {row.order_id} · {row.state === 'reversed' ? 'Partner payable reversal' : 'Partner payable record'} {financeMoney(Number(row.amount) * 100)}</p>;
  if (row._source === 'partner_payouts') return <p>Order {row.order_id || 'not linked'} · {row.status === 'paid' && row.provider_reference && row.paid_at ? 'Recorded paid payout' : 'Payout record; payment not verified here'} {financeMoney(row.amount_paise)}</p>;
  return null;
}

function AdminOrderIntake({orderId}) {
  const [details,setDetails]=useState(undefined),[error,setError]=useState('');
  async function open(){try{setError('');setDetails(await rpc('get_service_booking_intake',{p_order:orderId}));}catch(reason){setError(reason.message);}}
  return <div><button className="btn btn-outline" type="button" onClick={open}>View work details</button>{details&&<div><p><b>Work requirement:</b> {details.requirement}</p>{details.address&&<p><b>Service address:</b> {details.address}</p>}</div>}{details===null&&<p>No saved work details for this order.</p>}{error&&<p role="alert">{error}</p>}</div>;
}

const openTicket = ticket => ['open', 'in_progress', 'waiting_customer'].includes(ticket.status);
const ticketAgeHours = ticket => (Date.now() - Date.parse(ticket.created_at || 0)) / 36e5;
// 0 = urgent/high and unresolved, 1 = other unresolved, 2 = resolved or closed.
function supportRank(row) {
  if (row._source !== 'support_tickets') return 3;
  if (!openTicket(row)) return 2;
  return ['urgent', 'high'].includes(row.priority) ? 0 : 1;
}

function SupportQueueSummary({ tickets }) {
  const open = tickets.filter(openTicket);
  const urgent = open.filter(ticket => ['urgent', 'high'].includes(ticket.priority)).length;
  const overdue = open.filter(ticket => ticketAgeHours(ticket) > 24).length;
  return <div className="support-queue-summary" role="status"><span>{open.length} open</span><span className={urgent ? 'alert' : ''}>{urgent} urgent</span><span className={overdue ? 'alert' : ''}>{overdue} open over 24h</span><span>{open.filter(ticket => ticket.status === 'open').length} not yet picked up</span></div>;
}

function SupportTicketDetails({ ticket }) {
  const age = ticketAgeHours(ticket);
  return <div className="support-ticket">
    <p><b>{ticket.category}</b>{['urgent', 'high'].includes(ticket.priority) && <span className="support-badge urgent">{ticket.priority}</span>}{openTicket(ticket) && age > 24 && <span className="support-badge overdue">Open {Math.floor(age)}h</span>}</p>
    {!ticket.partner_order_id && <p>{ticket.description}</p>}
    <small>Customer {ticket.customer_id}{ticket.booking_id ? ` · Service request ${ticket.booking_id}` : ''}{ticket.payment_id ? ` · Payment ${ticket.payment_id}` : ''}{ticket.screenshot_path ? ' · Screenshot attached' : ''} · Updated {new Date(ticket.updated_at || ticket.created_at).toLocaleString('en-IN')}</small>
    {ticket.screenshot_path && <SupportTicketScreenshot key={ticket.screenshot_path} path={ticket.screenshot_path} />}
    <SupportThread ticket={ticket} revision={ticket.updated_at} />
  </div>;
}

function SupportTicketScreenshot({ path }) {
  const [preview, setPreview] = useState(''), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function open() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const { data, error: downloadError } = await requireBackend().storage.from('profile-media').download(path);
      if (downloadError) throw downloadError;
      if (!['image/jpeg', 'image/png'].includes(data?.type)) throw new Error('The attachment is not a supported image.');
      if (!mounted.current) return;
      setPreview(URL.createObjectURL(data));
    } catch (reason) {
      if (mounted.current) setError(`Screenshot unavailable. The file may be missing or access may be denied. ${reason.message || ''}`);
    } finally { if (mounted.current) setLoading(false); }
  }
  return <div className="support-ticket-screenshot">
    {!preview && <button className="btn btn-outline" type="button" onClick={open} disabled={loading}>{loading ? 'Loading screenshot…' : error ? 'Retry screenshot' : 'View screenshot'}</button>}
    {error && <p role="alert">{error}</p>}
    {preview && <div><img src={preview} alt="Customer support screenshot" style={{ display: 'block', maxWidth: '100%', maxHeight: 280, objectFit: 'contain' }} /><a href={preview} target="_blank" rel="noopener noreferrer">Open full screenshot</a></div>}
  </div>;
}

// General tickets: staff may already update status/priority under the "Admins manage tickets" policy.
function SupportTicketActions({ ticket, notify, onChange }) {
  const [status, setStatus] = useState(ticket.status), [priority, setPriority] = useState(ticket.priority || 'normal'), [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {
      const result = await requireBackend().from('support_tickets').update({ status, priority, updated_at: new Date().toISOString() }).eq('id', ticket.id);
      if (result.error) throw result.error;
      await onChange(); notify('Ticket updated.');
    } catch (error) { notify(error.message); } finally { setBusy(false); }
  }
  return <form onSubmit={save}><div className="form-grid"><Field label="Ticket status" as="select" options={['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']} value={status} onChange={event => setStatus(event.target.value)} /><Field label="Priority" as="select" options={['low', 'normal', 'high', 'urgent']} value={priority} onChange={event=>setPriority(event.target.value)}/></div><button className="btn btn-outline" disabled={busy || (status === ticket.status && priority === (ticket.priority || 'normal'))}>Update ticket</button></form>;
}

function ServiceIssueActions({ ticket, notify, onChange }) {
  const [status,setStatus]=useState(ticket.status), [note,setNote]=useState(''), [busy,setBusy]=useState(false);
  async function followUp(event){event.preventDefault();if(busy)return;setBusy(true);try{await rpc('admin_follow_up_service_issue',{p_ticket:ticket.id,p_status:status,p_note:note});setNote('');await onChange();notify('Issue follow-up saved.');}catch(error){notify(error.message);}finally{setBusy(false);}}
  return <div><p><b>Linked partner order:</b> {ticket.partner_order_id}</p><p><b>Customer issue:</b> {ticket.description}</p><form onSubmit={followUp}><Field label="Issue status" as="select" options={['open','in_progress','waiting_customer','resolved','closed']} value={status} onChange={event=>setStatus(event.target.value)}/><Field label="Follow-up action" as="textarea" required minLength={3} maxLength={2000} value={note} onChange={event=>setNote(event.target.value)}/><button className="btn btn-outline" disabled={busy}>Save follow-up</button></form></div>;
}
