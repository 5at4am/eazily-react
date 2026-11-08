import { readRows, rpc } from '../../services/experience.js';

export async function readServerSeenAt(userId) {
  try {
    const rows = await readRows('customer_notification_read_state', query => query.eq('customer_id', userId).limit(1));
    const value = rows[0]?.last_seen_at ? new Date(rows[0].last_seen_at).getTime() : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return null;
  }
}

export async function writeServerSeenAt() {
  try {
    await rpc('record_customer_notifications_seen');
    return true;
  } catch {
    return false;
  }
}
