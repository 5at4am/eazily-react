const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { mkdirSync, writeFileSync } = require('node:fs');
const pause = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('Starting Vite on port 5173...');
  const vite = spawn('cmd.exe', ['/c', 'npx', 'vite', '--port', '5173'], { stdio: 'pipe' });
  let viteReady = false;
  vite.stdout.on('data', d => {
    const text = d.toString();
    if (text.includes('5173') || text.includes('Local:')) viteReady = true;
  });

  for (let i = 0; i < 40; i++) {
    if (viteReady) break;
    try {
      const res = await fetch('http://127.0.0.1:5173/');
      if (res.status === 200) { viteReady = true; break; }
    } catch {}
    await pause(250);
  }
  console.log('Vite server ready:', viteReady);

  const profile = resolve('.tmp', `nav-verify-${Date.now()}`);
  mkdirSync(profile, { recursive: true });

  const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--remote-debugging-port=9377',
    `--user-data-dir=${profile}`,
    'about:blank'
  ], { windowsHide: true, stdio: 'ignore' });

  let tab;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      tab = await (await fetch('http://127.0.0.1:9377/json/new?http://127.0.0.1:5173/scripts/partner-navigation-fixture.html', { method: 'PUT' })).json();
      break;
    } catch {
      await pause(250);
    }
  }

  assert.ok(tab, 'Edge started');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open', r, { once: true }));

  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(msg.error) : p.resolve(msg.result);
    }
  });

  const send = (method, params = {}) => new Promise((resolveSend, reject) => {
    pending.set(++id, { resolve: resolveSend, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });

  // Wait for fixture ready
  for (let i = 0; i < 40; i++) {
    const ready = await send('Runtime.evaluate', { expression: `Boolean(window.renderRole)` });
    if (ready.result.value) break;
    await pause(200);
  }

  // Render role
  await send('Runtime.evaluate', { expression: `window.renderRole('professional')` });
  await pause(800);

  // Measure navbar elements
  const metrics = await send('Runtime.evaluate', {
    expression: `(()=>{
      const nav = document.querySelector('.bottom-nav');
      if (!nav) return null;
      const items = [...nav.querySelectorAll('.nav-item')].map(item => {
        const icon = item.querySelector('.nav-icon');
        const label = item.querySelector('.nav-label');
        const iconRect = icon ? icon.getBoundingClientRect() : null;
        const labelRect = label ? label.getBoundingClientRect() : null;
        const iconBg = icon ? getComputedStyle(icon).backgroundColor : null;
        return {
          text: label ? label.innerText : '',
          isPost: item.classList.contains('post-nav'),
          isActive: item.classList.contains('active'),
          iconHeight: iconRect ? Math.round(iconRect.height) : 0,
          iconTop: iconRect ? Math.round(iconRect.top) : 0,
          labelTop: labelRect ? Math.round(labelRect.top) : 0,
          labelHeight: labelRect ? Math.round(labelRect.height) : 0,
          iconBg
        };
      });
      return { navHeight: Math.round(nav.getBoundingClientRect().height), items };
    })()`,
    returnByValue: true
  });

  console.log('MEASURED NAVBAR METRICS:', JSON.stringify(metrics.result.value, null, 2));

  // Capture screenshot of navbar
  const clip = { x: 0, y: 840, width: 430, height: 92, scale: 2 };
  const screenshot = await send('Page.captureScreenshot', { clip });
  const out = 'C:/Users/aks10/.gemini/antigravity/brain/416d1457-2a62-4bc1-ba9e-803bc0ad29d5/scratch/verified_navbar.png';
  writeFileSync(out, Buffer.from(screenshot.data, 'base64'));
  console.log('Saved screenshot to:', out);

  socket.close();
  browser.kill();
  vite.kill();
  process.exit(0);
})().catch(e => { console.error(e); process.exitCode = 1; });
