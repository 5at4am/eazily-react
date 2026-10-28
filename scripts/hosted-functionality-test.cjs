// Explicit opt-in: disposable synthetic identities, no email/SMS delivery.
// Only synthetic rows and files created by this run are removed in cleanup.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const REF = 'rujrweqttrqdmkkbamjt';
const checks = [];
const identities = [];
const realtimeClients = [];
let admin, uploadPath;
let requestId, ticketId;
let partnerUploadPath;
const addressIds = [];
function ensure(value, message) { if (!value) throw new Error(message); }
function result(response, message) { ensure(!response.error, `${message}: ${response.error?.code || response.error?.name || 'request_failed'} (HTTP ${response.status || response.error?.status || 'unknown'}): ${typeof response.error === 'string' ? response.error : response.error?.message || ''}`); return response.data; }
function pass(name) { checks.push({ name, status: 'PASS' }); console.log(`PASS: ${name}`); }
async function main() {
  ensure(process.argv.includes('--run-development'), 'Requires --run-development; this is not an offline test.');
  ensure(fs.readFileSync(path.join(__dirname, '../supabase/.temp/project-ref'), 'utf8').trim() === REF, 'Linked project changed.');
  const env = {};
  for (const line of fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  ensure(new URL(env.VITE_SUPABASE_URL).hostname === `${REF}.supabase.co`, 'Frontend project differs.');
  const keyRequest = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `supabase projects api-keys --project-ref ${REF} --output json`], { cwd: path.join(__dirname, '..'), encoding: 'utf8', windowsHide: true, timeout: 30000 });
  ensure(keyRequest.status === 0, 'Server credentials unavailable; no fixtures created.');
  const keys = JSON.parse(keyRequest.stdout);
  const serverKey = keys.find(key => key.name === 'service_role')?.api_key;
  ensure(serverKey, 'Server credential unavailable; no fixtures created.');
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  admin = createClient(env.VITE_SUPABASE_URL, serverKey, options);
  const users = [];
  for (const label of ['A', 'B']) {
    const email = `eazily-audit-${randomUUID()}@example.com`;
    const created = result(await admin.auth.admin.createUser({ email, email_confirm: true,
      user_metadata: { full_name: `Functionality Audit ${label}` } }), 'Synthetic Auth user creation');
    identities.push(created.user.id);
    const link = result(await admin.auth.admin.generateLink({ type: 'magiclink', email }), 'Generate synthetic email OTP without delivery');
    const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
    const code = link.properties.email_otp;
    ensure(/^\d{8}$/.test(code), 'Hosted email code differs from the configured eight-digit length.');
    result(await client.auth.verifyOtp({ email, token: code, type: 'email' }), 'Real email OTP verification');
    users.push({ client, id: created.user.id });
    realtimeClients.push(client);
  }
  pass('Real eight-digit email verification and JWT sessions for two synthetic accounts');
  const [a, b] = users;
  const profile = result(await a.client.from('profiles').select('id,full_name,email,email_verified,phone').eq('id', a.id).single(), 'Own profile read');
  ensure(profile.full_name === 'Functionality Audit A', 'Auth trigger did not persist signup name.');
  ensure(profile.email_verified === true && profile.email && !profile.phone, 'Email-only signup profile did not reflect Auth confirmation.');
  const forged = await a.client.from('profiles').update({ email: 'forged@example.invalid' }).eq('id',a.id).select('email').single();
  ensure(forged.error || forged.data?.email === profile.email, 'A profile edit forged the sign-in email.');
  pass('Confirmed email profile sync without a phone and forged profile-email protection');
  result(await a.client.from('profiles').update({ full_name: 'Functionality Audit Updated' }).eq('id', a.id).select('id').single(), 'Profile update');
  ensure(result(await a.client.from('profiles').select('full_name').eq('id', a.id).single(), 'Read updated profile').full_name === 'Functionality Audit Updated', 'Profile update was not persisted.');
  ensure(result(await b.client.from('profiles').select('id').eq('id', a.id), 'Outsider profile query').length === 0, 'Cross-account profile exposed.');
  ensure((await a.client.from('profiles').update({ role: 'admin' }).eq('id', a.id)).error, 'Profile role escalation accepted.');
  pass('Signup profile creation, persistent profile updates, cross-account isolation and role protection');
  const session = result(await a.client.auth.getSession(), 'Read session').session;
  const restored = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
  result(await restored.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }), 'Restore SDK session');
  const refreshed = result(await restored.auth.refreshSession(), 'Refresh SDK session').session;
  result(await a.client.auth.setSession({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token }), 'Synchronize test clients after refresh');
  ensure(result(await restored.from('profiles').select('id').eq('id', a.id).single(), 'Read after token refresh').id === a.id, 'Refreshed session cannot read own data.');
  pass('Session restore and token refresh preserve database access');
  for (const label of ['Home', 'Work']) {
    const saved = result(await a.client.from('customer_addresses').insert({ customer_id: a.id, label,
      address: 'Synthetic audit address', locality: 'Test locality', city: 'Bhopal', pin_code: '462001', is_default: false }).select('id').single(), 'Address insert');
    addressIds.push(saved.id);
  }
  result(await a.client.from('customer_addresses').update({ address: 'Synthetic updated address' }).eq('id', addressIds[0]).select('id').single(), 'Address edit');
  result(await a.client.rpc('set_default_address', { p_address_id: addressIds[0] }), 'First default address');
  result(await a.client.rpc('set_default_address', { p_address_id: addressIds[1] }), 'Switch default address');
  const addresses = result(await restored.from('customer_addresses').select('id,address,is_default').in('id', addressIds), 'Reload addresses');
  ensure(addresses.length === 2 && addresses.filter(row => row.is_default).length === 1 && addresses.find(row => row.id === addressIds[1]).is_default, 'Default address did not persist uniquely.');
  ensure(addresses.find(row => row.id === addressIds[0]).address === 'Synthetic updated address', 'Address edit did not persist.');
  ensure(result(await b.client.from('customer_addresses').select('id').in('id', addressIds), 'Outsider address query').length === 0, 'Address exposed.');
  ensure(result(await b.client.from('customer_addresses').update({ address: 'Unauthorized' }).eq('id', addressIds[0]).select('id'), 'Outsider address update').length === 0, 'Outsider changed address.');
  ensure((await b.client.rpc('set_default_address', { p_address_id: addressIds[0] })).error, 'Outsider changed default address.');
  result(await a.client.from('customer_addresses').delete().eq('id', addressIds[0]), 'Delete address');
  ensure(result(await a.client.from('customer_addresses').select('id').eq('id', addressIds[0]), 'Verify address deletion').length === 0, 'Deleted address still present.');
  pass('Address create/edit/default/delete persist and deny unrelated accounts');
  result(await a.client.from('customer_notification_preferences').upsert({ customer_id: a.id, booking_updates: true,
    payment_notifications: true, promotions: true, consultation_reminders: false }), 'Save notification preferences');
  const preferences = result(await restored.from('customer_notification_preferences').select('promotions,consultation_reminders').eq('customer_id', a.id).single(), 'Reload preferences');
  ensure(preferences.promotions && !preferences.consultation_reminders, 'Preferences did not persist.');
  ensure(result(await b.client.from('customer_notification_preferences').select('customer_id').eq('customer_id', a.id), 'Outsider preferences query').length === 0, 'Preferences exposed.');
  pass('Notification preferences persist across sessions with account isolation');
  for (const role of ['professional', 'influencer', 'consultant']) {
    const draft = result(await a.client.rpc('save_partner_application', { p_role: role,
      p_details: { name: 'Synthetic audit partner', city: 'Bhopal', stage: 1 }, p_submit: false }), 'Save partner draft');
    const updated = result(await a.client.rpc('save_partner_application', { p_role: role,
      p_details: { name: 'Synthetic audit partner', city: 'Bhopal', stage: 2 }, p_submit: false }), 'Update partner draft');
    ensure(draft.id === updated.id && updated.status === 'draft', 'Draft update duplicated or submitted application.');
    ensure(result(await restored.from('partner_applications').select('details').eq('id', draft.id).single(), 'Reload partner draft').details.stage === 2, 'Draft stage not persisted.');
    ensure(result(await b.client.from('partner_applications').select('id').eq('id', draft.id), 'Outsider draft query').length === 0, 'Private draft exposed.');
  }
  ensure((await a.client.rpc('submit_service_partner_application', { p_details: { verifiedEmail: '' } })).error, 'Partner submitted without verified email.');
  pass('Three partner role drafts persist without duplicates; incomplete submission rejected');
  let ownerEvents = 0, outsiderEvents = 0;
  for (const [client, owner] of [[a.client, true], [b.client, false]]) {
    const channel = client.channel(`audit-${randomUUID()}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'realtime_events', filter: `audience_key=eq.${a.id}`,
    }, () => { if (owner) ownerEvents++; else outsiderEvents++; });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Hosted Realtime subscription timed out')), 15000);
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(new Error('Hosted Realtime subscription failed')); }
      });
    });
  }
  const requestArgs = { p_category: 'manpower', p_service: 'Electrician', p_kind: 'service',
    p_details: { address: 'Synthetic test address', requirement: 'Synthetic electrical inspection', city: 'Bhopal' }, p_key: randomUUID(), p_vendor: null };
  const request = result(await a.client.rpc('submit_request', requestArgs), 'Service request submission');
  requestId = request.id;
  const duplicate = result(await a.client.rpc('submit_request', requestArgs), 'Idempotent request retry');
  ensure(request.id === duplicate.id, 'Retry created a duplicate request.');
  ensure(result(await a.client.from('service_requests').select('id').eq('id', request.id), 'Read saved request').length === 1, 'Request not persisted.');
  ensure(result(await b.client.from('service_requests').select('id').eq('id', request.id), 'Outsider request query').length === 0, 'Cross-account request exposed.');
  pass('Service request persistence, retry idempotency and cross-account isolation');
  for (let attempt = 0; attempt < 100 && !ownerEvents; attempt++) await new Promise(done => setTimeout(done, 100));
  if (!ownerEvents) {
    checks.push({ name: 'Request invalidation did not arrive over hosted Realtime', status: 'FAIL' });
    console.error('FAIL: Request invalidation did not arrive over hosted Realtime.');
    process.exitCode = 1;
  }
  await new Promise(done => setTimeout(done, 500));
  ensure(outsiderEvents === 0, 'Private Realtime event reached an unrelated account.');
  if (ownerEvents > 0) pass('Actual hosted Realtime event delivery with cross-account denial');
  const ticket = result(await a.client.from('support_tickets').insert({ customer_id: a.id, category: 'Booking', description: 'Synthetic audit support request', booking_id: request.id }).select('id').single(), 'Support ticket creation');
  ticketId = ticket.id;
  ensure(result(await b.client.from('support_tickets').select('id').eq('id', ticket.id), 'Outsider ticket query').length === 0, 'Cross-account ticket exposed.');
  pass('Support ticket persistence and cross-account isolation');
  const reply = result(await a.client.from('support_ticket_replies').insert({ ticket_id: ticketId, author_id: a.id,
    body: 'Synthetic integration audit reply' }).select('id').single(), 'Support reply');
  ensure(result(await restored.from('support_ticket_replies').select('body').eq('id', reply.id).single(), 'Read saved reply').body === 'Synthetic integration audit reply', 'Support reply not saved.');
  ensure(result(await b.client.from('support_ticket_replies').select('id').eq('id', reply.id), 'Outsider reply query').length === 0, 'Support reply exposed.');
  pass('Support replies persist and remain private');
  uploadPath = `${a.id}/audit-${randomUUID()}.png`;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64');
  result(await a.client.storage.from('profile-media').upload(uploadPath, png, { contentType: 'image/png' }), 'Private Storage upload');
  const signed = result(await a.client.storage.from('profile-media').createSignedUrl(uploadPath, 60), 'Owner signed URL');
  ensure((await fetch(signed.signedUrl)).ok, 'Owner signed download failed.');
  ensure((await b.client.storage.from('profile-media').createSignedUrl(uploadPath, 60)).error, 'Outsider received signed URL.');
  pass('Actual private upload, owner signed download and outsider denial');
  if (process.argv.includes('--browser')) {
    const { runBrowserAudit } = require('./live-auth-browser-audit.cjs');
    const browserResult = await runBrowserAudit({ session: (await a.client.auth.getSession()).data.session, projectRef: REF });
    partnerUploadPath = browserResult.uploadPath;
    pass('Browser sign-in routing, live account restore, actual partner uploader and admin access denial');
  }
  result(await a.client.auth.signOut(), 'Logout');
  ensure(!(await a.client.auth.getSession()).data.session, 'Session survived logout.');
  pass('Logout clears the authenticated session');
}
main().catch(error => { checks.push({ name: error.message, status: 'FAIL' }); console.error(`FAIL: ${error.message}`); process.exitCode = 1; })
  .finally(async () => {
    let cleaned = true;
    for (const client of realtimeClients) await client.removeAllChannels();
    if (admin && uploadPath) { const removed = await admin.storage.from('profile-media').remove([uploadPath]); if (removed.error) cleaned = false; }
    // Also discover only this run's synthetic user's partner uploads if a browser assertion failed before returning the path.
    if (admin) for (const id of identities) {
      const files = await admin.storage.from('partner-media').list(`${id}/professional`);
      const paths = files.data?.map(file => `${id}/professional/${file.name}`) || [];
      if (paths.length) { const removed = await admin.storage.from('partner-media').remove(paths); if (removed.error) cleaned = false; }
    }
    if (admin && partnerUploadPath) { const removed = await admin.storage.from('partner-media').remove([partnerUploadPath]); if (removed.error) cleaned = false; }
    if (admin && ticketId) {
      const replies = await admin.from('support_ticket_replies').delete().eq('ticket_id', ticketId); if (replies.error) cleaned = false;
      const removed = await admin.from('support_tickets').delete().eq('id', ticketId); if (removed.error) cleaned = false;
    }
    if (admin && addressIds.length) { const removed = await admin.from('customer_addresses').delete().in('id', addressIds); if (removed.error) cleaned = false; }
    if (admin && requestId) { const removed = await admin.from('service_requests').delete().eq('id', requestId); if (removed.error) cleaned = false; }
    if (admin) for (const id of identities.reverse()) { const deleted = await admin.auth.admin.deleteUser(id); if (deleted.error) cleaned = false; }
    if (!cleaned) { console.error('Cleanup incomplete: inspect synthetic audit fixtures.'); process.exitCode = 1; }
    else if (identities.length) console.log('PASS: synthetic Auth users and uploaded fixture removed');
    fs.mkdirSync(path.join(__dirname, '../.tmp'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '../.tmp/hosted-functionality-result.json'), JSON.stringify({ projectRef: REF, checks, cleaned, remainingFixtureIds: cleaned ? [] : identities, testedAt: new Date().toISOString(), emailOrSmsSent: false }, null, 2));
  });
