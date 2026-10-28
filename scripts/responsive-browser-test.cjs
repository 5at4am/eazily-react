/* Responsive checks use the local Vite app and an isolated Edge profile. Start npm run dev first. */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { mkdirSync, writeFileSync } = require('node:fs');
const pause = ms => new Promise(r => setTimeout(r, ms));
const widths = [320, 375, 430, 640, 768, 1024, 1280, 1440, 1920];
let browser, socket;

(async () => {
  assert.equal((await fetch('http://127.0.0.1:5173/')).status, 200, 'Start the local Vite server before this check');
  const profile = resolve('.tmp', `responsive-browser-${Date.now()}`);
  mkdirSync(profile, { recursive: true });
  browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9461',
    `--user-data-dir=${profile}`, 'about:blank'
  ], { windowsHide: true, stdio: 'ignore' });

  let tab;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { tab = await (await fetch('http://127.0.0.1:9461/json/new?http://127.0.0.1:5173/', { method: 'PUT' })).json(); break; }
    catch { await pause(250); }
  }
  assert.ok(tab, 'Edge started');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(resolveOpen => socket.addEventListener('open', resolveOpen, { once: true }));

  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error ? request.reject(message.error) : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolveSend, reject) => {
    pending.set(++id, { resolve: resolveSend, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const capture = async name => {
    const image = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(profile, `${name}.png`), Buffer.from(image.data, 'base64'));
  };
  const waitFor = async (expression, description) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw new Error(`Timed out waiting for ${description}`);
  };
  const viewport = async (width, height = 900, shellCap = 1200) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await pause(260);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `No horizontal page overflow at ${width}px`);
    const frame = await evaluate(`(()=>{const r=document.querySelector('.phone-shell').getBoundingClientRect();return {width:r.width,left:r.left,right:r.right,scrollWidth:document.querySelector('.phone-shell').scrollWidth,clientWidth:document.querySelector('.phone-shell').clientWidth}})()`);
    const expectedWidth = Math.min(await evaluate('document.documentElement.clientWidth'), shellCap);
    assert.ok(Math.abs(frame.width - expectedWidth) < 2, `App shell adapts at ${width}px: ${JSON.stringify({ ...frame, expectedWidth })}`);
    assert.ok(frame.scrollWidth <= frame.clientWidth + 1, `App shell content fits at ${width}px`);
    return frame;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await waitFor("document.querySelector('.welcome-entry')", 'welcome page');
  for (const width of widths) {
    const welcomeCap = width < 600 ? 430 : width < 900 ? 600 : 1040;
    await viewport(width, width >= 1024 ? 1000 : 844, welcomeCap);
    if ([320, 1024].includes(width)) await capture(`welcome-${width}`);
    console.log(`PASS welcome shell ${width}px`);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 170, y: 160 });
  await evaluate(`(()=>{const button=[...document.querySelectorAll('.welcome-tabs button')].find(item=>item.textContent.includes('Find & Book Services'));if(!button)throw new Error('Customer entry action missing');button.click()})()`);
  await waitFor("document.querySelector('.user-app-root .marketplace-home')", 'customer home');
  for (const width of widths) {
    await viewport(width, width >= 1024 ? 1000 : 844);
    assert.ok(await evaluate(`[...document.querySelectorAll('.user-app-root > main')].every(page=>page.scrollWidth<=page.clientWidth+1)`), `Customer page fits at ${width}px`);
    const navigation = await evaluate(`(()=>{const app=document.querySelector('.phone-shell'),nav=document.querySelector('.bottom-nav.customer-nav');if(!nav)return null;const a=app.getBoundingClientRect(),n=nav.getBoundingClientRect(),s=getComputedStyle(nav);return {left:n.left,right:n.right,width:n.width,appLeft:a.left,appRight:a.right,innerWidth,cssLeft:s.left,position:s.position,transform:s.transform,safeRight:getComputedStyle(document.documentElement).getPropertyValue('--eazily-safe-right')}})()`);
    assert.ok(navigation && navigation.left >= navigation.appLeft - 1 && navigation.right <= navigation.appRight + 1, `Customer navigation stays inside the app shell at ${width}px: ${JSON.stringify(navigation)}`);
    if ([375, 1280].includes(width)) await capture(`customer-home-${width}`);
    console.log(`PASS customer home ${width}px`);
  }
  for (const [width, height] of [[844,390],[812,375]]) {
    await viewport(width, height);
    assert.ok(await evaluate(`!!document.querySelector('.marketplace-home')`), 'Customer home stays mounted in landscape');
    console.log(`PASS customer home landscape ${width}x${height}`);
  }
  await evaluate(`(()=>{const button=[...document.querySelectorAll('.bottom-nav.customer-nav button')].find(item=>item.textContent.includes('Explore'));if(!button)throw new Error('Explore navigation missing');button.click()})()`);
  await waitFor("document.querySelector('.catalog-screen .main-category-grid')", 'service categories');
  for (const width of widths) {
    await viewport(width, width >= 1024 ? 1000 : 844);
    assert.ok(await evaluate(`[...document.querySelectorAll('.main-category-card,.group-card,.service-option')].every(card=>card.scrollWidth<=card.clientWidth+1)`), `Category cards fit at ${width}px`);
    if ([320, 768, 1920].includes(width)) await capture(`customer-categories-${width}`);
    console.log(`PASS service categories ${width}px`);
  }
  for (const [width, height] of [[844,390],[812,375]]) {
    await viewport(width, height);
    assert.ok(await evaluate(`!!document.querySelector('.catalog-screen .main-category-grid')`), 'Service categories stay mounted in landscape');
    console.log(`PASS service categories landscape ${width}x${height}`);
  }

  await send('Page.navigate', { url: 'http://127.0.0.1:5173/scripts/partner-navigation-fixture.html' });
  await waitFor('window.renderRole', 'partner fixture');
  await evaluate('window.renderRole("professional")');
  await waitFor("document.querySelector('.partner-workspace.role-professional')", 'partner workspace');
  for (const width of widths) {
    await viewport(width, width >= 1024 ? 1000 : 844);
    assert.ok(await evaluate(`document.querySelectorAll('.partner-screen').length === 1`), 'Partner app remains mounted');
    assert.ok(await evaluate(`[...document.querySelectorAll('.partner-screen,.seller-content')].every(region=>region.scrollWidth<=region.clientWidth+1)`), `Partner content stays within its layout at ${width}px`);
    const navigation = await evaluate(`(()=>{const app=document.querySelector('.phone-shell').getBoundingClientRect(),nav=document.querySelector('.partner-screen .bottom-nav');if(!nav)return null;const r=nav.getBoundingClientRect();return {left:r.left,right:r.right,appLeft:app.left,appRight:app.right}})()`);
    assert.ok(navigation && navigation.left >= navigation.appLeft - 1 && navigation.right <= navigation.appRight + 1, `Partner navigation stays inside the app shell at ${width}px`);
    if ([430, 1024].includes(width)) await capture(`partner-${width}`);
    console.log(`PASS partner workspace ${width}px`);
  }
  for (const [width, height] of [[844,390],[812,375]]) {
    await viewport(width, height);
    assert.ok(await evaluate(`!!document.querySelector('.partner-workspace.role-professional')`), 'Partner workspace stays mounted in landscape');
    console.log(`PASS partner workspace landscape ${width}x${height}`);
  }

  await send('Page.navigate', { url: 'http://127.0.0.1:5173/scripts/admin-responsive-fixture.html' });
  await waitFor("document.querySelector('.admin-screen')", 'staff console');
  for (const width of widths) {
    await viewport(width, width >= 1024 ? 1000 : 844, width >= 700 ? 5000 : 1200);
    const navState = await evaluate(`(()=>{const screen=document.querySelector('.admin-screen'),sidebar=document.querySelector('.admin-sidebar'),s=getComputedStyle(screen),n=sidebar.getBoundingClientRect();return {display:s.display,columns:s.gridTemplateColumns,sidebarWidth:n.width,navScroll:sidebar.scrollWidth,navClient:sidebar.clientWidth}})()`);
    if (width >= 700) {
      assert.equal(navState.display, 'grid', `Staff console restores its desktop shell at ${width}px`);
      assert.ok(navState.sidebarWidth >= (width <= 900 ? 220 : 248), `Staff navigation remains labelled at ${width}px`);
    } else {
      assert.equal(navState.display, 'block', `Staff navigation collapses to the compact mobile pattern at ${width}px`);
      assert.ok(navState.navClient > 0, `Staff navigation is available at ${width}px`);
      assert.ok(await evaluate(`[...document.querySelectorAll('.admin-sidebar > button')].every(button=>getComputedStyle(button.querySelector('span')||button).display!=='none')`), `Staff mobile navigation labels remain visible at ${width}px`);
    }
    if ([640, 1440].includes(width)) await capture(`staff-${width}`);
    console.log(`PASS staff console ${width}px`);
  }

  for (const [width, height] of [[844, 390], [812, 375]]) {
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
    await waitFor("document.querySelector('.welcome-entry')", 'welcome screen in landscape');
    await viewport(width, height, width < 900 ? 600 : 1040);
    console.log(`PASS landscape shell ${width}x${height}`);
  }

  assert.deepEqual(errors, [], 'No browser exceptions');
  await send('Browser.close');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { socket?.close(); browser?.kill(); });
