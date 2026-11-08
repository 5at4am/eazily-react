const APPROVED_ROUTES = Object.freeze([
  'home',
  'orders',
  'post',
  'growth',
  'earnings',
  'profile',
  'messages',
]);

const RESTRICTED_ROUTES = Object.freeze(['home', 'profile']);

const NAVIGATION_BY_ROLE = Object.freeze({
  professional: Object.freeze([
    Object.freeze(['home', 'home', 'Home']),
    Object.freeze(['orders', 'briefcase', 'Jobs']),
    Object.freeze(['post', 'plus', 'Add Post']),
    Object.freeze(['messages', 'messageCircle', 'Messages']),
    Object.freeze(['profile', 'person', 'Profile']),
  ]),
  influencer: Object.freeze([
    Object.freeze(['home', 'home', 'Home']),
    Object.freeze(['orders', 'briefcase', 'Jobs']),
    Object.freeze(['post', 'plus', 'Add']),
    Object.freeze(['growth', 'chart', 'Growth']),
    Object.freeze(['profile', 'person', 'Profile']),
  ]),
  consultant: Object.freeze([
    Object.freeze(['home', 'home', 'Home']),
    Object.freeze(['orders', 'briefcase', 'Jobs']),
    Object.freeze(['post', 'plus', 'Add']),
    Object.freeze(['growth', 'chart', 'Growth']),
    Object.freeze(['profile', 'person', 'Profile']),
  ]),
});

const RESTRICTED_NAVIGATION = Object.freeze([
  Object.freeze(['home', 'home', 'Home']),
  Object.freeze(['profile', 'person', 'Profile']),
]);

/**
 * Navigation is a presentation of workspace access, not an authorization boundary.
 * The caller's approved flag must already include the partner's status and any
 * role-specific eligibility gates; backend policies continue to enforce actions.
 */
export function partnerNavigationFor(role, approved) {
  const unrestricted = approved === true;
  return {
    items: unrestricted
      ? (NAVIGATION_BY_ROLE[role] || RESTRICTED_NAVIGATION)
      : RESTRICTED_NAVIGATION,
    routes: unrestricted ? APPROVED_ROUTES : RESTRICTED_ROUTES,
  };
}
