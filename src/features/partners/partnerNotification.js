/** Resolve only destinations owned by the currently open partner workspace. */
export function resolvePartnerNotificationDestination(notification, role, applications = []) {
  if (!notification) return null;

  const type = notification.destination_type || (notification.order_id ? 'booking' : null);
  if (type === 'application') {
    const application = applications.find(item =>
      item.id === notification.partner_application_id && item.role === role,
    );
    return application ? { type, application } : null;
  }

  if (type === 'booking' && notification.order_id) {
    return { type, orderId: notification.order_id };
  }

  return null;
}
