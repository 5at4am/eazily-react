export const workspacePaths = { customer: '/user/home', professional: '/seller/service/dashboard', influencer: '/seller/influencer/dashboard', consultant: '/seller/consultant/dashboard' };
export function sellerMemberships(account) { return [...new Set((account.applications || []).map(a=>a.role))].filter(r=>['professional','influencer','consultant'].includes(r)); }
