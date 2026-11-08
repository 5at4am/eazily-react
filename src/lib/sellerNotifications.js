import { partnerBookingStatus } from '../features/services/customerBookings.js';

const FALLBACK = [
  [/new[\s-]*?(request|booking)/i, 'A customer has sent you a new request. Review it before the response deadline.'],
  [/(accepted|confirmed)/i, 'The customer accepted your offer. Confirm the final scope before work begins.'],
  [/quote/i, 'A quote is waiting for your input.'],
  [/review/i, 'A review or rating update is waiting for you.'],
  [/payout|payment/i, 'Check your payment and payout status.'],
  [/offer/i, 'An offer is waiting for your decision.'],
];

export function describeSellerNotification(notification, orders = []) {
  let body = '';
  if (notification?.order_id) {
    const order = orders.find(item => item.id === notification.order_id);
    if (order) {
      body = `${order.title || order.details?.service || 'Booking'} · ${partnerBookingStatus(order)}`;
    }
  }
  if (!body) {
    const match = FALLBACK.find(([pattern]) => pattern.test(notification?.title || ''));
    body = match ? match[1] : 'Open this update to review the details.';
  }
  return { title: notification?.title || 'Update', body };
}
