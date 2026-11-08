/* Requires the local Vite dev server. Uses only isolated session fixtures. */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { mkdirSync, writeFileSync } = require('node:fs');
const pause = milliseconds => new Promise(resolvePause => setTimeout(resolvePause, milliseconds));
let browser, socket;

(async () => {
  assert.equal((await fetch('http://127.0.0.1:5173/')).status, 200, 'Start the local Vite server first');
  const { routeAccess } = await import('../src/auth/policy.js');
  const profile = resolve('.tmp', `partner-navigation-${Date.now()}`); mkdirSync(profile, { recursive: true });
  browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9365',`--user-data-dir=${profile}`,'about:blank'], { windowsHide:true, stdio:'ignore' });
  let tab;
  for (let attempt=0; attempt<40; attempt+=1) { try { tab=await(await fetch('http://127.0.0.1:9365/json/new?http://127.0.0.1:5173/',{method:'PUT'})).json(); break; } catch { await pause(250); } }
  assert.ok(tab, 'Edge started'); socket=new WebSocket(tab.webSocketDebuggerUrl); await new Promise(resolveOpen=>socket.addEventListener('open',resolveOpen,{once:true}));
  let id=0; const pending=new Map(), errors=[];
  socket.addEventListener('message',({data})=>{const message=JSON.parse(data);if(message.id){const request=pending.get(message.id);pending.delete(message.id);message.error?request.reject(message.error):request.resolve(message.result);}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolveSend,reject)=>{pending.set(++id,{resolve:resolveSend,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const waitFor=async expression=>{for(let attempt=0;attempt<50;attempt+=1){if(await evaluate(`Boolean(${expression})`))return;await pause(100);}throw new Error('Timed out: '+expression+'\n'+await evaluate('document.body.innerText'));};
  const click=async label=>{await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===${JSON.stringify(label)});if(!button)throw new Error('Missing ${label}');button.click();})()`);await pause(160);};
   const clickSelector=async selector=>{await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button)throw new Error('Missing '+${JSON.stringify(selector)});button.click();})()`);await pause(160);};
   const capture=async name=>{const image=await send('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(profile,`${name}.png`),Buffer.from(image.data,'base64'));};
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate',{url:'http://127.0.0.1:5173/scripts/partner-navigation-fixture.html'});await waitFor('window.renderRole');
  for(const role of ['professional','influencer','consultant']){
    const policyAccount={user:{id:`navigation-${role}`},profile:{id:`navigation-${role}`,full_name:'Pending Partner',account_status:'active'},roles:[role],applications:[{id:`application-${role}`,role,status:'submitted'}],assessments:{},staff:null,isAdmin:false};
    assert.equal(routeAccess(policyAccount,role),'allowed');
    for(const other of ['professional','influencer','consultant'].filter(item=>item!==role))assert.equal(routeAccess(policyAccount,other),'registration',role+' cannot open '+other+' directly');
    await evaluate(`window.renderRole(${JSON.stringify(role)})`);
    if(role==='influencer'){
      await waitFor(`document.querySelector('.influencer-terms-gate')&&document.body.textContent.includes('Read and accept version')`);
      assert.ok(await evaluate(`document.body.textContent.includes('Read and accept version')`),'Influencer legal gate remains required before opening the workspace');
      console.log('PASS influencer: legal acceptance gate remains in place');
      continue;
    }
    await waitFor(`document.querySelector('.partner-workspace.role-${role}')`);
    if(role==='professional'){
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(180);await capture('partner-header-phone-390');
      await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await pause(180);await capture('partner-header-desktop-1280');
      await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(120);
    }
    assert.ok(await evaluate(`document.body.textContent.includes('Pending review')`),role+' shows pending status inside its dashboard');
    assert.ok(await evaluate(`Boolean(document.querySelector('.partner-home-dashboard.pd-${role==='professional'?'service':role}-home'))`),role+' uses the shared partner Home layout');
    assert.equal(await evaluate(`document.querySelectorAll('.pro-metrics .pro-metric').length`),4,role+' shows the same four-metric overview');
    assert.ok(await evaluate(`Boolean(document.querySelector('.pro-profile-card')&&document.querySelector('.pro-jobs'))`),role+' shows profile and work sections in the shared layout');
    assert.equal(await evaluate(`document.querySelectorAll('.pd-topbar [aria-label="Switch workspace"],.dashboard-header .workspace-button').length`),0,role+' header omits the redundant workspace switch');
    assert.ok(await evaluate(`Boolean(document.querySelector('.pd-topbar .pd-icon-button'))`),role+' keeps notifications in the compact header');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pd-topbar .pd-icon-button')).borderTopWidth`),'0px',role+' notification control has no border');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pd-topbar .pd-icon-button')).backgroundColor`),'rgba(0, 0, 0, 0)',role+' notification control stays unfilled');
    const roleAccent=await evaluate(`getComputedStyle(document.querySelector('.pro-profile-avatar')).color`);
    const expectedAccent={professional:'rgb(13, 124, 102)',consultant:'rgb(154, 98, 0)'}[role];
    assert.equal(roleAccent,expectedAccent,role+' uses its distinct role color');
    assert.equal(await evaluate(`document.querySelectorAll('.bottom-nav button').length`),2,role+' pending workspace exposes only safe routes');
    for(const width of [360,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await pause(100);
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),role+' fits '+width+'px');
    }
    await click('Profile'); await waitFor(`document.querySelector('.partner-profile-page')`);
    await evaluate('history.back()'); await waitFor(`document.querySelector('.pd-dashboard')`);
    await click('Profile'); await waitFor(`document.querySelector('.partner-profile-page')`);
    const handled=await evaluate(`(()=>{const detail={handled:false};window.dispatchEvent(new CustomEvent('eazily-in-app-back',{detail}));return detail.handled;})()`);
    assert.equal(handled,true,role+' handles the native in-app back event'); await waitFor(`document.querySelector('.pd-dashboard')`);

    await evaluate(`document.documentElement.style.setProperty('--safe-area-inset-top','32px');document.documentElement.style.setProperty('--safe-area-inset-bottom','24px')`);await pause(100);
    assert.equal(await evaluate(`Math.round(document.querySelector('.phone-shell').getBoundingClientRect().top)`),0);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.phone-shell')).paddingTop`),'32px',role+' consumes Android top inset');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.bottom-nav')).paddingBottom`),'31px',role+' consumes Android gesture inset');

    console.log('PASS '+role+': browser Back, native-event Back, safe insets, 360/390/430, pending lock, and role isolation');
  }
  await evaluate('window.renderWorkspacePicker("influencer")');
  await waitFor(`document.querySelector('.partner-workspace-picker')`);
  await click('Customer home');
  assert.equal(await evaluate('window.selectedWorkspace'),'customer','Influencer picker can select the customer workspace');
  await click('Service Professional');
  assert.equal(await evaluate('window.selectedWorkspace'),'professional','Influencer picker can switch to the professional workspace');
  console.log('PASS workspace picker: customer and professional destinations are selectable from influencer context');
  const homeAccents={professional:'rgb(13, 124, 102)',influencer:'rgb(190, 46, 110)',consultant:'rgb(154, 98, 0)'};
  const homeWorkHeadings={professional:'Confirmed jobs',influencer:'Confirmed collaborations',consultant:'Upcoming appointments'};
  for(const role of ['professional','influencer','consultant']){
    await evaluate(`window.renderHomeLayout(${JSON.stringify(role)})`);
     await waitFor(`document.querySelector('.partner-home-dashboard.pd-${role==='professional'?'service':role}-home')`);
    assert.equal(await evaluate(`document.querySelectorAll('.pro-metrics .pro-metric').length`),4,role+' home has four shared metrics');
    assert.equal(await evaluate(`document.querySelector('.pro-jobs h2').textContent`),homeWorkHeadings[role],role+' uses role-specific work language');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.pro-profile-avatar')).color`),homeAccents[role],role+' home uses its own brand accent');
    assert.ok(await evaluate(`Boolean(document.querySelector('.pro-profile-card')&&document.querySelector('.pro-availability')&&document.querySelector('.pro-jobs'))`),role+' home retains the shared profile, status and work sections');
    for(const width of [320,360,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),role+' shared home fits '+width+'px');
    }
    console.log('PASS shared home layout: '+role+'');
  }
  assert.deepEqual(errors,[],'No browser exceptions');
  await send('Browser.close');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();});
