import { partnerBookingStatus, serviceRequestStatus } from '../services/customerBookings.js';

export const NOTIFICATION_SEEN_KEY = 'eazily-customer-notifications-seen';

export function seenKey(userId) {
  return `${NOTIFICATION_SEEN_KEY}:${userId}`;
}

export function readSeenAt(userId) {
  try {
    const value = Number(localStorage.getItem(seenKey(userId)) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function writeSeenAt(userId) {
  try {
    localStorage.setItem(seenKey(userId), String(Date.now()));
  } catch {
    // Storage failure must not block notifications.
  }
}

function requestSentence(row, label) {
  const name = row.service_name || 'Service request';
  const city = row.details?.city || row.city || 'your city';
  if (label.includes('Finding')) return `We are looking for a professional for ${name} in ${city}.`;
  if (label === 'Confirmed') return `${name} was accepted. Review final charges before work begins.`;
  if (label === 'In progress') return `${name} is in progress.`;
  if (label === 'Completed') return `${name} is complete. Leave a review after your visit.`;
  if (label === 'Cancelled') return `${name} was cancelled. Any refund is processed separately.`;
  return `Waiting for the professional to accept your ${name} request.`;
}

function orderSentence(order, label) {
  const title = order.title || 'Your booking';
  if (label === 'Backup price approval needed') return 'A replacement offer is waiting for your approval.';
  if (label === 'On the way') return `The professional is on the way for ${title}.`;
  if (label === 'Confirmed') return `${title} was accepted. Agree the final scope before work begins.`;
  if (label === 'In progress') return `${title} is in progress.`;
  if (label === 'Awaiting customer confirmation') return `You need to confirm the final scope for ${title}.`;
  if (label === 'Completed') return `${title} is complete. Rate your experience.`;
  if (label === 'Cancelled') return `${title} was cancelled.`;
  if (label === 'Disputed') return `${title} is disputed. Support will follow up.`;
  if (label.includes('enquiry') || label.includes('Introduction') || label.includes('Consultation')) return `${label} — the partner will respond shortly.`;
  return `${title} — waiting for the professional to accept.`;
}

function event(kind, id, icon, title, meta, body, at) {
  return { id: `${kind}:${id}`, kind, icon, title, meta, body, at: new Date(at).getTime() };
}

export function buildNotificationEvents({ requests = [], orders = [], ledger = [] } = {}) {
  const events = [];
  for (const row of requests) {
    if (!row?.id) continue;
    const status = serviceRequestStatus(row);
    events.push(event('booking', row.id, 'clipboard', row.service_name || 'Service request',
      status, requestSentence(row, status), row.updated_at || row.created_at));
  }
  for (const row of orders) {
    if (!row?.id) continue;
    const status = partnerBookingStatus(row);
    events.push(event('booking', row.id, 'briefcase', row.title || 'Booking',
      status, orderSentence(row, status), row.updated_at || row.created_at));
  }
  for (const row of ledger) {
    if (!row?.id) continue;
    const expiry = row.expires_at ? `, expires ${new Date(row.expires_at).toLocaleDateString()}` : '';
    events.push(event('wallet', row.id, 'rupee', row.kind || 'Wallet',
      `₹${Number(row.amount || 0).toLocaleString('en-IN')}`,
      `₹${Number(row.amount || 0).toLocaleString('en-IN')} ${(row.kind || 'wallet entry').toLowerCase()} recorded${expiry}.`,
      row.created_at));
  }
  return events.sort((a, b) => b.at - a.at).slice(0, 60);
}

export function unreadSince(events, seenAt) {
  return events.filter(eventItem => !seenAt || eventItem.at > seenAt).length;
}
