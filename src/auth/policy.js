export const EMPTY_ACCOUNT = Object.freeze({ user:null, profile:null, applications:[], roles:[], staff:null, isAdmin:false });
export const validOtp=(code,length=6)=>Number.isInteger(length)&&length>=4&&length<=10&&new RegExp(`^\\d{${length}}$`).test(code);
export function normalizeEmail(value) {
  const email=String(value??'').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)?email:'';
}
export const maskEmail=email=>{const [name,domain='']=String(email||'').split('@');if(!domain)return'';const head=name.slice(0,2);return`${head}${'•'.repeat(Math.max(2,name.length-2))}@${domain}`;};

export const PASSWORD_MIN_LENGTH=8;
// Ordered, user-facing reasons a password is refused. The first entry is shown.
export function passwordIssues(password) {
  const value=String(password??'');
  const issues=[];
  if(value.length<PASSWORD_MIN_LENGTH)issues.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  if(value.length>72)issues.push('Use at most 72 characters.');
  if(!/[a-zA-Z]/.test(value))issues.push('Add at least one letter.');
  if(!/\d/.test(value))issues.push('Add at least one number.');
  return issues;
}
// 0-4 strength score. Length is weighted highest because it is what actually helps.
export function passwordScore(password) {
  const value=String(password??'');
  if(!value)return 0;
  let score=value.length>=8?1:0;
  if(value.length>=12)score++;
  if(/[a-z]/.test(value)&&/[A-Z]/.test(value))score++;
  if(/\d/.test(value))score++;
  if(/[^a-zA-Z0-9]/.test(value))score++;
  return Math.min(score,4);
}
export const PASSWORD_STRENGTH_LABELS=Object.freeze(['Too short','Weak','Fair','Good','Strong']);

// Supabase identity records, not client input, decide whether a password exists.
// A Google-only account has no email identity and must be offered "set", not "change".
export function linkedProviders(user) {
  const identities=Array.isArray(user?.identities)?user.identities.filter(Boolean):[];
  if(identities.length)return [...new Set(identities.map(identity=>identity.provider).filter(Boolean))];
  const providers=user?.app_metadata?.providers;
  return Array.isArray(providers)?[...new Set(providers)]:[];
}
export const hasPasswordIdentity=user=>linkedProviders(user).includes('email');
// Recovery links are single use and expire; the same answer must be shown whether or
// not an account exists so the form cannot be used to discover registered addresses.
export const RESET_NEUTRAL_MESSAGE='If an account exists for that address, a password reset link is on its way. Check your inbox and spam folder.';
export function passwordResetError(error) {
  const code=error?.code;
  if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||error?.status===429)return 'Too many reset emails were requested. Please wait a few minutes and try again.';
  if(['email_provider_disabled','signup_disabled','provider_disabled','otp_disabled'].includes(code))return 'Password reset by email is not available yet. Contact support for help.';
  if(error?.name==='AuthRetryableFetchError'||error?.name==='TypeError')return 'Connection unavailable. Check your connection and try again.';
  if(code==='email_address_invalid'||code==='validation_failed')return 'Enter the email address linked to your account.';
  if(code==='user_not_found')return RESET_NEUTRAL_MESSAGE;
  if(code==='same_password'||code==='password_reused')return 'Choose a password you have not used before.';
  if(code==='weak_password')return 'Choose a longer password with letters and numbers.';
  if(code==='session_not_found'||code==='no_session')return 'This reset link has expired. Request a new one.';
  if(['user_banned','user_not_confirmed'].includes(code))return 'This account cannot be recovered by email. Contact support.';
  return safeAuthError(error);
}
export function safeAuthError(error) {
  const code=error?.code;
  if (code==='otp_expired') return 'The code is incorrect or expired. Request a new code.';
  if (code==='over_email_send_rate_limit') return 'Too many email requests. Please wait before requesting another sign-in email.';
  if (code==='over_sms_send_rate_limit'||code==='over_request_rate_limit'||error?.status===429) return 'Too many attempts. Please wait before trying again.';
  if (['signup_disabled','email_provider_disabled','provider_disabled'].includes(code)) return 'This sign-in method is unavailable. Choose another enabled method.';
  if (code==='user_not_found') return 'No account was found. Create an account to continue.';
  if (error?.name==='AuthRetryableFetchError'||error?.name==='TypeError') return 'Connection unavailable. Check your connection and try again.';
  return 'Verification could not be completed. Check the code or try again later.';
}
export function accountState(account) {
  if (!account.user) return 'signed_out';
  if (!account.profile) return 'profile_required';
  if (account.profile.account_status==='closed') return 'blocked';
  if (['suspended','blocked'].includes(account.profile.account_status)) return account.profile.account_status;
  return account.profile.full_name?.trim() ? 'authenticated' : 'profile_required';
}
export function routeAccess(account,role) {
  if (!account.user) return role==='customer'?'public':'signed_out';
  const state=accountState(account);
  if (state!=='authenticated') return state;
  if (role==='customer') return 'allowed';
  if (role==='admin') return account.isAdmin?'allowed':'denied';
  if (!['professional','influencer','consultant'].includes(role)) return 'denied';
  const application=account.applications.find(a=>a.role===role);
  if (!application||application.status==='draft'||application.status==='changes_required') return 'registration';
  if (['suspended','blocked'].includes(application.status)) return application.status;
  if (application.status==='rejected') return 'rejected';
  // A submitted application owns this workspace even while human review is
  // pending. The workspace itself keeps operational actions locked until the
  // application is approved.
  if (['submitted','under_review'].includes(application.status)) return 'allowed';
  if (application.status!=='approved') return 'approval_pending';
  if (role==='consultant'&&account.assessments?.[application.id]!==true) return 'assessment_required';
  return 'allowed';
}
export function clearAccountStorage(storage) {
  if (!storage) return;
  try {for (const key of Object.keys(storage)) if (key.startsWith('eazily-')&&!['eazily-language','eazily-theme'].includes(key)) storage.removeItem(key);} catch { /* Storage can be unavailable. Memory is still cleared. */ }
}

// Trust the managed Auth confirmation timestamp, never editable profile metadata.
export function confirmedEmail(user) {
  return user?.email_confirmed_at ? normalizeEmail(user.email) : '';
}
