/* Focused browser check of the Service Partner final-step policy states.
   No Supabase, network, upload or submission: the fixture replaces only the
   legal-document query and the two registration write calls. */
const { build } = require('esbuild');
const { createServer } = require('node:http');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const pause = ms => new Promise(done => setTimeout(done, ms));
const fixture = resolve('scripts/service-partner-legal-fixture.jsx');
let server, browser, socket;

(async () => {
  const folder = resolve('.tmp', `service-partner-legal-${Date.now()}`);
  mkdirSync(folder, { recursive: true });
  const bundle = await build({
    entryPoints: [fixture], bundle: true, write: false, outdir: resolve(folder, 'out'), jsx: 'automatic', format: 'iife',
    loader: { '.png': 'empty', '.webp': 'empty', '.svg': 'empty', '.jpg': 'empty' },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': '"https://fixture.invalid"',
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '"sb_publishable_fixture"',
      'import.meta.env.VITE_PARTNER_DEMO': '"false"',
      'import.meta.env.DEV': 'false',
      'import.meta.env.VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP': '"false"',
    },
    plugins: [{ name: 'service-legal-fakes', setup(context) {
      context.onResolve({ filter: /services\/partners\.js$/ }, args => /ServicePartnerOnboarding\.jsx$/.test(args.importer) ? { path: fixture } : undefined);
    } }],
  });
  server = createServer((request, response) => {
    if (request.url.startsWith('/fixture.')) {
      const css = request.url.endsWith('.css');
      const file = bundle.outputFiles.find(output => output.path.endsWith(css ? '.css' : '.js'));
      response.setHeader('Content-Type', css ? 'text/css' : 'text/javascript');
      return response.end(file ? file.contents : '');
    }
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(done => server.listen(5215, '127.0.0.1', done));
  browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9375', `--user-data-dir=${resolve(folder, 'browser')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let tab;
  for (let attempt = 0; attempt < 40 && !tab; attempt += 1) {
    try { tab = await (await fetch('http://127.0.0.1:9375/json/new?about:blank', { method: 'PUT' })).json(); } catch { await pause(250); }
  }
  assert.ok(tab, 'Edge started');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(done => socket.addEventListener('open', done, { once: true }));
  let id = 0;
  const pending = new Map(), errors = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(message.error) : request.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((done, reject) => { pending.set(++id, { resolve: done, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const waitFor = async (expression, message) => {
    for (let attempt = 0; attempt < 60; attempt += 1) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error(message);
  };
  const clickText = async label => {
    await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===${JSON.stringify(label)}&&!item.disabled);if(!button)throw new Error('Missing enabled button: '+${JSON.stringify(label)});button.click();})()`);
    await pause(180);
  };
  const clickSelector = async selector => {
    await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button)throw new Error('Missing control: '+${JSON.stringify(selector)});button.click();})()`);
    await pause(180);
  };
  const sheet = () => evaluate(`document.querySelector('.service-legal-sheet')?.textContent || ''`);
  const shot = async name => writeFileSync(resolve(folder, name), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));

  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:5215/' });
  await waitFor(`Boolean(document.querySelector('.service-legal-links'))`, 'Final step did not render');
  await waitFor(`document.body.textContent.includes('Policies not published:')`, 'Missing policies were not surfaced');
  assert.equal(await evaluate('window.__legalCalls'), 1, 'Published policies were queried once');
  assert.equal(await evaluate(`document.querySelector('.service-legal-links button').disabled`), false, 'Missing policy link is still clickable');
  assert.ok(await evaluate(`document.querySelector('.service-legal-links').textContent.includes('Service Partner Terms & Conditions') && document.querySelector('.service-legal-links').textContent.includes('Service Partner Privacy Policy')`), 'Both policy names are shown');
  await shot('missing-policies.png');

  await clickText('Service Partner Terms & Conditions');
  await waitFor(`Boolean(document.querySelector('.service-legal-sheet'))`, 'Missing-policy status sheet did not open');
  assert.match(await sheet(), /This policy is not published yet/);
  await clickSelector('.service-legal-sheet .legal-close-button');

  const checkbox = `(()=>{const label=[...document.querySelectorAll('.consent')].find(item=>item.textContent.includes('I agree to Eazily'));return label?.querySelector('input[type=checkbox]')})()`;
  assert.equal(await evaluate(`(()=>{const input=${checkbox};return !input||input.checked!==false})()`), false, 'Acceptance starts unchecked');
  assert.equal(await evaluate(`(()=>{const input=${checkbox};return !input||input.getAttribute('aria-disabled')!=='true'})()`), false, 'Acceptance is marked unavailable while policies are missing');
  await evaluate(`(()=>{const input=${checkbox};if(!input)throw new Error('Missing acceptance checkbox');input.click();})()`);
  await pause(180);
  await waitFor(`Boolean(document.querySelector('.service-legal-sheet'))`, 'Blocked acceptance did not explain itself');
  assert.match(await sheet(), /Service Partner Terms & Conditions/);
  assert.equal(await evaluate(`(()=>{const input=${checkbox};return input.checked})()`), false, 'Blocked acceptance cannot become checked');
  await shot('blocked-acceptance.png');
  await clickSelector('.service-legal-sheet .legal-close-button');

  await clickText('Complete registration');
  await pause(250);
  assert.ok(await evaluate(`(window.__toasts || []).some(message => message.includes('Published Service Partner policies are required'))`), 'Submission did not explain the missing policies');
  assert.equal(await evaluate(`(()=>{const input=${checkbox};return input.getAttribute('aria-invalid')})()`), 'true', 'The blocked acceptance is exposed as invalid');
  assert.ok(await evaluate(`document.body.textContent.includes('Published Service Partner policies are required before submission.')`), 'The final-step error is visible');

  await evaluate(`window.__legalRows = [
    { document_key: 'eazily-service-partner-terms', version: 'test-only-fixture', title: 'TEST ONLY - Service Partner Terms & Conditions', content: 'EAZILY - Service Partner Terms\\n1. Test terms content', effective_at: '2026-10-23T00:00:00Z', published: true },
    { document_key: 'eazily-service-partner-privacy-policy', version: 'test-only-fixture', title: 'TEST ONLY - Service Partner Privacy Policy', content: 'EAZILY - Service Partner Privacy Policy\\n1. Test privacy content', effective_at: '2026-10-23T00:00:00Z', published: true },
  ]`);
  await evaluate(`(()=>{const input=${checkbox};if(!input)throw new Error('Missing acceptance checkbox');input.click();})()`);
  await pause(180);
  await waitFor(`document.body.textContent.includes('Check again')`, 'Retry control was not offered');
  await clickText('Check again');
  await waitFor(`document.body.textContent.includes('Test terms content')`, 'Retry did not load the published policy');
  assert.equal(await evaluate('window.__legalCalls'), 2, 'Retry re-queried the published policies');
  assert.ok(await evaluate(`document.body.textContent.includes('Test-only policy.')`), 'The test-only document is clearly labelled inside the policy sheet');
  await clickSelector('.service-legal-sheet .legal-close-button');

  assert.ok(await evaluate(`document.querySelector('.service-legal-links').textContent.includes('Test-only policies are active.')`), 'The final step warns that test policies are active');
  assert.equal(await evaluate(`(()=>{const input=${checkbox};return input.getAttribute('aria-disabled')})()`), null, 'Acceptance becomes available after publication');
  await evaluate(`(()=>{const input=${checkbox};if(!input)throw new Error('Missing acceptance checkbox');input.click();})()`);
  await pause(180);
  assert.equal(await evaluate(`(()=>{const input=${checkbox};return input.checked})()`), true, 'Acceptance can be checked after publication');
  await clickText('Service Partner Privacy Policy');
  await waitFor(`Boolean(document.querySelector('.service-legal-sheet'))`, 'Published policy did not open');
  assert.match(await sheet(), /Test privacy content/);
  await shot('published-policy.png');
  await clickSelector('.service-legal-sheet .legal-close-button');

  assert.deepEqual(errors, [], 'No uncaught runtime errors');
  console.log(`PASS: missing policies are named, remain clickable and explain the block; acceptance cannot be checked until both policies are published; retry loads real policy content and enables acceptance. Screenshots: ${folder}`);
  await send('Browser.close');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { socket?.close(); browser?.kill(); server?.close(); });
