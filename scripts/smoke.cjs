/* Run after npm run build. Uses the installed Edge browser, no external test service. */
const { createServer } = require('node:http');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('node:fs');
const { resolve, extname } = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const pause = ms => new Promise(r => setTimeout(r, ms));
const root = resolve(process.env.EAZILY_SMOKE_DIST || 'dist');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.match(html, /addEventListener\('load',start/, 'Splash animation starts after the page load event');
assert.match(html, /classList\.add\('is-ready'\)/, 'Splash reveal state explicitly starts its animation');
assert.match(html, /setTimeout\(start,5000\)/, 'Splash startup has a bounded fallback');
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/fixture') { res.setHeader('Content-Type', 'text/html'); res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>'); return; }
  if (pathname === '/fixture.js' || pathname === '/fixture.css') { res.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(readFileSync(resolve('.tmp', pathname.slice(1)))); return; }
  let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + '\\') || !existsSync(file) || !extname(file)) file = resolve(root, 'index.html');
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' })[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
let browser, socket;
(async () => {
  await build({ entryPoints: ['scripts/vendor-fixture.jsx'], bundle: true, outfile: '.tmp/fixture.js', jsx: 'automatic', format: 'esm', define: { 'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '""', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '""', 'import.meta.env.VITE_PARTNER_DEMO': '"false"', 'import.meta.env.VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP': '"false"', 'import.meta.env.VITE_AUTH_EMAIL_OTP_LENGTH': '"8"' } });
  await new Promise(r => server.listen(5199, '127.0.0.1', r));
  const browserProfile = `.tmp/browser-smoke-${Date.now()}`;
  mkdirSync(browserProfile, { recursive: true });
  browser = spawn(edgePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9337', `--user-data-dir=${resolve(browserProfile)}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let tab;
  for (let n = 0; n < 40; n++) {
    try { tab = await (await fetch('http://127.0.0.1:9337/json/new?http://127.0.0.1:5199', { method: 'PUT' })).json(); break; } catch { await pause(250); }
  }
  if (!tab) throw new Error('Edge did not start');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(), errors = [];
  socket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) { const p = pending.get(event.id); pending.delete(event.id); event.error ? p.reject(event.error) : p.resolve(event.result); }
    if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text + ': ' + event.params.exceptionDetails.exception?.description);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, label) => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw new Error(`Timed out waiting for ${label}`);
  };
  const click = async (label, selector = 'button') => { await evaluate(`(() => { const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!button) throw new Error('Missing button: ' + ${JSON.stringify(label)}); button.click(); })()`); await pause(200); };
  await send('Runtime.enable'); await send('Page.enable');
  for (const width of [360, 390, 430]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url: 'http://127.0.0.1:5199/' });
    await waitFor(`document.querySelector('.eazily-launch-logo')?.complete&&document.querySelector('.eazily-launch-logo').naturalWidth>0`, `decoded startup logo at ${width}px`);
    const launch = await evaluate(`(() => { const logo=document.querySelector('.eazily-launch-logo'); return {width:logo.offsetWidth,centerX:logo.offsetLeft+logo.offsetWidth/2,centerY:logo.offsetTop+logo.offsetHeight/2,viewportX:innerWidth/2,viewportY:innerHeight/2,overflow:document.documentElement.scrollWidth>innerWidth}; })()`);
    assert.ok(launch.width >= 140 && launch.width <= 156.5, `Startup logo remains restrained at ${width}px`);
    assert.ok(Math.abs(launch.centerX-launch.viewportX)<1 && Math.abs(launch.centerY-launch.viewportY)<1, `Startup logo is centered at ${width}px`);
    assert.equal(launch.overflow, false, `Startup splash has no overflow at ${width}px`);
    await waitFor(`!document.querySelector('.eazily-launch-splash')`, 'startup splash completion');
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await pause(1600);
  assert.ok(await evaluate(`document.querySelector('.phone-shell').getBoundingClientRect().width <= 1040`), 'Wide welcome screens use the documented centered desktop width');
  assert.ok(await evaluate(`document.querySelector('.welcome-screen').getBoundingClientRect().width <= document.querySelector('.phone-shell').getBoundingClientRect().width`), 'Welcome content stays within the centered desktop shell');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(250);
  await click('Find & Book Services', '.welcome-tabs button span');
  await waitFor(`document.querySelector('.home-v3')`, 'customer home');
  await click('Explore');
  await evaluate(`document.querySelector('.main-category-card').click()`); await pause(200);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.group-card b')].map(e=>e.textContent.trim())`), ['Home & Property', 'Vehicle', 'Personal & Daily', 'Electronics', 'Personal Care', 'Wedding & Occasion', 'Pet Care', 'Other']);
  assert.equal(await evaluate(`document.querySelectorAll('.catalog-side').length`),0,'Group selection has no duplicate sidebar');
  await click('Home & Property','.group-card b');
  const sidebarWidth = await evaluate(`document.querySelector('.catalog-side').getBoundingClientRect().width`);
  assert.ok(sidebarWidth >= 76 && sidebarWidth <= 88.5, 'Selected services retain a compact vertical sidebar');
  await click('Profile');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.account-shortcuts b')].map(e=>e.textContent.trim())`), ['My Bookings', 'Saved Vendors', 'Help & Support']);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.profile-list .choice>span')].map(e=>e.textContent.trim())`), ['Account & Profile', 'Security & Login', 'Location & Addresses', 'Notifications', 'Payments', 'Service Management', 'App Preferences', 'Legal', 'About Eazily']);
  writeFileSync('.tmp/account.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await click('App Preferences');
  assert.equal(await evaluate(`document.querySelectorAll('.sheet select').length`), 0, 'App Preferences has no language switcher');
  assert.equal(await evaluate(`document.documentElement.lang`), 'en', 'The document language is English');
  assert.equal(await evaluate(`document.querySelectorAll('img[src*="eazily-logo"], .splash-symbol').length`), 0);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'No mobile horizontal overflow');
  await evaluate(`localStorage.setItem('eazily-language','English'); localStorage.removeItem('eazily-welcome-completed'); location.href='/'`); await pause(1500);
  await click('Join as a Partner', '.welcome-tabs button span');
  await click('Service Professional', '.welcome-choice b');
  await waitFor(`document.querySelector('#auth-email')`, 'lazy-loaded authentication screen');
  assert.ok(await evaluate(`document.body.textContent.includes('Continue with Google') && document.querySelector('#auth-email') && [...document.querySelectorAll('button')].some(button=>button.textContent.includes('Send email code'))`), 'Google and email-code sign-in options are present without submitting credentials');
  assert.ok(await evaluate(`!document.body.textContent.includes('Use OTP 0000')`), 'Production build does not expose a local OTP bypass');
  assert.ok(await evaluate(`![...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Preview Service Partner Dashboard')`), 'Production build does not expose the local Service Partner preview');
  await evaluate(`localStorage.setItem('eazily-language','English'); location.href='/fixture'`);
  await pause(800);
  await waitFor(`[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Open Alpha')`, 'browser-only vendor fixture');
  await evaluate(`window.scrollTo(0,400)`);
  const scroll = await evaluate(`window.scrollY`);
  await click('Open Alpha');
  assert.ok(await evaluate(`document.querySelector('.vendor-sheet').textContent.includes('Fixture Alpha')`));
  await click('Open Beta');
  assert.equal(await evaluate(`document.querySelectorAll('.vendor-sheet').length`), 1, 'Switching vendor replaces the profile');
  assert.ok(await evaluate(`document.querySelector('.vendor-sheet').textContent.includes('Fixture Beta')`));
  await click('Review booking');
  assert.equal(await evaluate(`document.querySelector('.form-sheet h2').textContent.trim()`), 'Plumber', 'Vendor booking preserves service');
  await evaluate(`history.back()`); await pause(300);
  assert.equal(await evaluate(`document.querySelectorAll('[role=dialog]').length`), 1, 'Device back closes only the top sheet');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }); await pause(300);
  assert.equal(await evaluate(`document.querySelectorAll('[role=dialog]').length`), 0);
  assert.equal(await evaluate(`window.scrollY`), scroll, 'Profile close restores the listing scroll position');
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log('PASS: startup splash at 360/390/430 px, desktop welcome width, customer explore/categories/profile, partner sign-in options, fixture professional profiles, quote flow, device back, and scroll restoration.');
  await send('Browser.close');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { socket?.close(); browser?.kill(); server.close(); });
