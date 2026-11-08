const { build } = require('esbuild');
const { createServer } = require('node:http');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const pause = ms => new Promise(done => setTimeout(done, ms));
let server, browser, socket;

(async () => {
  const folder = resolve('docs/professional-discovery/final');
  mkdirSync(folder, { recursive: true });
  const bundle = await build({
    entryPoints: ['scripts/professional-discovery-fixture.jsx'],
    bundle: true,
    write: false,
    outdir: '.tmp/professional-discovery-fixture',
    jsx: 'automatic',
    format: 'iife',
    loader: { '.jpg': 'dataurl', '.jpeg': 'dataurl', '.png': 'dataurl', '.svg': 'dataurl', '.webp': 'dataurl', '.woff2': 'dataurl' },
    external: ['/fonts/*'],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': '""',
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '""',
      'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
      'import.meta.env.VITE_AUTH_EMAIL_OTP_LENGTH': '"8"',
      'import.meta.env.VITE_ENABLE_CONSULTANT_ASSESSMENT_TEST_SKIP': '"false"',
      'import.meta.env.VITE_ENABLE_SERVICE_REGISTRATION_TEST_SKIP': '"false"',
      'import.meta.env.VITE_PARTNER_DEMO': '"true"',
      'import.meta.env.DEV': 'true',
    },
  });
  server = createServer((request, response) => {
    if (request.url.startsWith('/fixture.')) {
      const file = bundle.outputFiles.find(output => output.path.endsWith(request.url.endsWith('.css') ? '.css' : '.js'));
      response.setHeader('Content-Type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript');
      return response.end(file.contents);
    }
    if (request.url.startsWith('/assets/') || request.url.startsWith('/fonts/')) {
      try {
        return response.end(readFileSync(resolve('public', `.${new URL(request.url, 'http://localhost').pathname}`)));
      } catch {
        response.statusCode = 404;
        return response.end();
      }
    }
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(done => server.listen(5211, '127.0.0.1', done));
  browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9371', `--user-data-dir=${resolve('.tmp', `professional-discovery-edge-${Date.now()}`)}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let tab;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { tab = await (await fetch('http://127.0.0.1:9371/json/new?http://127.0.0.1:5211/', { method: 'PUT' })).json(); break; }
    catch { await pause(250); }
  }
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(done => socket.addEventListener('open', done, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    if (!event.id) return;
    const promise = pending.get(event.id);
    pending.delete(event.id);
    event.error ? promise.reject(event.error) : promise.resolve(event.result);
  });
  const send = (method, params = {}) => new Promise((done, reject) => { pending.set(++id, { resolve: done, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  const screenshot = async name => writeFileSync(resolve(folder, name), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  for (const width of [360, 390, 430]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url: 'http://127.0.0.1:5211/' });
    await pause(1100);
    const profile = await evaluate(`(()=>{
      const sheet=document.querySelector('.professional-profile-sheet');
      const cta=document.querySelector('.service-summary-book');
      const footer=document.querySelector('.professional-booking-footer');
      const footerButton=footer?.querySelector('button');
      const ctaRect=cta?.getBoundingClientRect();
      const footerRect=footerButton?.getBoundingClientRect();
      const hit=footerRect?document.elementFromPoint(footerRect.left+footerRect.width/2, footerRect.top+footerRect.height/2):null;
      return {
        name:document.body.textContent.includes('Rahul Sharma'),
        portfolio:document.querySelectorAll('.professional-portfolio-grid img').length,
        ctaText:cta?.textContent.trim(),
        ctaVisible:Boolean(ctaRect&&ctaRect.top>=0&&ctaRect.bottom<=innerHeight),
        footerText:footerButton?.textContent.trim(),
        footerHit:Boolean(hit&&(hit===footerButton||footerButton.contains(hit))),
        sheetOpen:Boolean(sheet),
        overflow:document.documentElement.scrollWidth<=innerWidth,
      };
    })()`);
    assert.ok(profile.sheetOpen && profile.name, `${width}px profile renders ${JSON.stringify(profile)}`);
    assert.equal(profile.portfolio, 4, `${width}px portfolio ${JSON.stringify(profile)}`);
    assert.equal(profile.ctaText, 'Book this service', `${width}px top booking action ${JSON.stringify(profile)}`);
    assert.ok(profile.ctaVisible, `${width}px top booking action is above the fold ${JSON.stringify(profile)}`);
    assert.equal(profile.footerText, 'Continue to booking', `${width}px footer booking action ${JSON.stringify(profile)}`);
    assert.ok(profile.footerHit, `${width}px footer booking action is not covered by navigation ${JSON.stringify(profile)}`);
    assert.ok(profile.overflow, `${width}px profile has no horizontal overflow ${JSON.stringify(profile)}`);
    await screenshot(`professional-profile-${width}.png`);

    await evaluate(`document.querySelector('.service-summary-book').click()`);
    await pause(150);
    assert.equal(await evaluate(`document.querySelector('#fixture-state').textContent`), 'BOOKED', `${width}px top booking action opens booking`);
    await evaluate(`document.querySelector('.professional-booking-footer button').click()`);
    await pause(150);
    assert.equal(await evaluate(`document.querySelector('#fixture-state').textContent`), 'BOOKED', `${width}px footer booking action opens booking`);

    await evaluate(`document.querySelector('.professional-portfolio-grid').scrollIntoView({block:'center'})`);
    await pause(180);
    const portfolio = await evaluate(`(()=>{const grid=document.querySelector('.professional-portfolio-grid'),style=getComputedStyle(grid);return {count:grid.querySelectorAll('button').length,display:style.display,overflowX:style.overflowX,pageOverflow:document.documentElement.scrollWidth<=innerWidth}})()`);
    assert.equal(portfolio.count, 4, `${width}px portfolio carousel ${JSON.stringify(portfolio)}`);
    assert.equal(portfolio.display, 'flex', `${width}px portfolio carousel layout ${JSON.stringify(portfolio)}`);
    assert.ok(['auto', 'scroll'].includes(portfolio.overflowX), `${width}px portfolio carousel scrolls horizontally ${JSON.stringify(portfolio)}`);
    assert.ok(portfolio.pageOverflow, `${width}px portfolio carousel has no page overflow ${JSON.stringify(portfolio)}`);
    await screenshot(`professional-portfolio-${width}.png`);
    await evaluate(`document.querySelector('.professional-portfolio-grid button').click()`);
    await pause(300);
    assert.ok(await evaluate(`Boolean(document.querySelector('.portfolio-viewer-sheet img'))`), `${width}px full-screen portfolio viewer opens`);
    await evaluate('history.back()');
    await pause(300);
    assert.equal(await evaluate(`Boolean(document.querySelector('.portfolio-viewer-sheet'))`), false, `${width}px Back closes image viewer first`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.professional-profile-sheet'))`), true, `${width}px profile remains after viewer Back`);
    await evaluate('history.back()');
    await pause(300);
    assert.equal(await evaluate(`Boolean(document.querySelector('.professional-profile-sheet'))`), false, `${width}px second Back returns to the service page`);
    console.log(`PASS professional profile booking actions, portfolio viewer and Back at ${width}px`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { if (socket) socket.close(); if (browser) browser.kill(); if (server) server.close(); });
