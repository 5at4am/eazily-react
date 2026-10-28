// Headless browser check; caller supplies only a disposable fixture session in memory.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const pause = ms => new Promise(done => setTimeout(done, ms));
exports.runBrowserAudit = async ({ session, projectRef }) => {
  let browser, socket;
  const profile = resolve('.tmp', `live-auth-browser-${Date.now()}`);
  mkdirSync(profile, { recursive: true });
  const errors = [];
  let uploadPath;
  try {
    assert.equal((await fetch('http://127.0.0.1:5173/')).status, 200, 'Local Vite server unavailable');
    browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
      '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9377', `--user-data-dir=${profile}`, 'about:blank',
    ], { windowsHide: true, stdio: 'ignore' });
    let tab;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { tab = await (await fetch('http://127.0.0.1:9377/json/new?http://127.0.0.1:5173/', { method: 'PUT' })).json(); break; }
      catch { await pause(100); }
    }
    assert.ok(tab, 'Headless browser did not start');
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(done => socket.addEventListener('open', done, { once: true }));
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (!request) return; clearTimeout(request.timer); message.error ? request.reject(new Error('Browser command failed')) : request.resolve(message.result); }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    });
    const send = (method, params = {}) => new Promise((done, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Browser command timed out')); }, 15000);
      pending.set(id, { resolve: done, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const data = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert.ok(!data.exceptionDetails, 'Browser evaluation failed'); return data.result.value;
    };
    const waitFor = async (expression, label) => {
      for (let attempt = 0; attempt < 150; attempt++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
      throw new Error(`Browser check timed out: ${label}`);
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/user/home' });
    await waitFor('document.querySelector(".bottom-nav")', 'customer browsing');
    await evaluate('window.dispatchEvent(new Event("eazily-sign-in"))');
    await waitFor('document.querySelector("#auth-contact") && document.body.innerText.includes("Phone sign-in is unavailable")', 'live email sign-in');
    assert.equal(await evaluate('document.querySelector("#auth-contact").type'), 'email');
    assert.equal(await evaluate('document.querySelector(".auth-google")'), null, 'Disabled Google provider must not be offered');
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/seller/service/dashboard' });
    await waitFor('document.querySelector("#auth-phone")', 'partner authentication gate');
    assert.equal(await evaluate('Boolean(document.querySelector(".demo-workspace"))'), false, 'Live partner route must not enter demo');
    // No token is written to reports or command arguments; it is only injected into this disposable browser.
    await evaluate(`localStorage.setItem(${JSON.stringify(`sb-${projectRef}-auth-token`)}, ${JSON.stringify(JSON.stringify(session))})`);
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/user/home' });
    await waitFor('document.querySelector(".bottom-nav")', 'authenticated customer home');
    await evaluate('document.querySelector(".bottom-nav button:last-child").click()');
    await waitFor('document.body.innerText.includes("Functionality Audit Updated")', 'real profile session restore');
    await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.includes("Account & Profile")).click()');
    await waitFor('document.querySelector(".profile-photo-editor")', 'profile edit form');
    await evaluate(`(() => { const input = document.querySelector('.profile-photo-editor').closest('form').querySelector('input:not([type=file])'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Functionality Browser Saved'); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Save changes").click()');
    await waitFor('document.body.innerText.includes("Changes saved")', 'profile save through the actual form');
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/user/home' });
    await waitFor('document.querySelector(".bottom-nav")', 'customer home after profile save');
    await evaluate('document.querySelector(".bottom-nav button:last-child").click()');
    await waitFor('document.body.innerText.includes("Functionality Browser Saved")', 'profile edit survived reload');
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/scripts/media-upload-fixture.html' });
    await waitFor('document.querySelector("input[type=file]")', 'partner upload component');
    const pngPath = resolve(profile, 'audit.png');
    writeFileSync(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64'));
    const dom = await send('DOM.getDocument');
    const input = await send('DOM.querySelector', { nodeId: dom.root.nodeId, selector: 'input[type=file]' });
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [pngPath] });
    await waitFor('document.querySelector(".upload-complete")', 'real partner upload completion');
    uploadPath = await evaluate('document.querySelector("#uploaded-path").textContent');
    assert.ok(uploadPath.startsWith(`${session.user.id}/professional/`), 'Upload path must belong to the authenticated fixture user');
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/admin' });
    await waitFor('document.body.innerText.includes("Your account does not have access")', 'customer cannot open admin');
    await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Sign out").click()');
    await waitFor('document.querySelector(".welcome-screen")', 'logout returns to welcome');
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(`sb-${projectRef}-auth-token`)})`), null, 'Logout must remove the SDK token');
    assert.equal(errors.length, 0, 'Browser runtime exceptions occurred');
    return { uploadPath };
  } finally {
    socket?.close();
    browser?.kill();
  }
};
