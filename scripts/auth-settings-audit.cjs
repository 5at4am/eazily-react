// Read-only public Auth settings. Never sends OTPs or prints API keys.
const fs = require('node:fs');
const path = require('node:path');
const env = { ...process.env };
for (const file of ['.env', '.env.local']) {
  const target = path.join(__dirname, '..', file);
  if (!fs.existsSync(target)) continue;
  for (const line of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}
(async () => {
  const url = new URL(env.VITE_SUPABASE_URL);
  const linked = fs.readFileSync(path.join(__dirname, '../supabase/.temp/project-ref'), 'utf8').trim();
  if (url.protocol !== 'https:' || url.hostname !== `${linked}.supabase.co`) throw new Error('Frontend URL does not match the linked project.');
  const response = await fetch(new URL('/auth/v1/settings', url), {
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Auth settings request returned HTTP ${response.status}.`);
  const settings = await response.json();
  console.log(JSON.stringify({ projectRef: linked, authReachable: true,
    signupDisabled: settings.disable_signup, emailEnabled: settings.external?.email,
    phoneEnabled: settings.external?.phone, googleEnabled: settings.external?.google,
    emailAutoconfirm: settings.mailer_autoconfirm, phoneAutoconfirm: settings.sms_autoconfirm }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
