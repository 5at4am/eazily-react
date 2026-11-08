const assert = require('node:assert/strict');
const { build } = require('esbuild');
const Module = require('node:module');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
global.localStorage = { getItem: () => 'English' };

async function component(file) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' }, jsx: 'automatic', define: { 'import.meta.env': '{}' } });
  const compiled = new Module(path.resolve(file), module);
  compiled.filename = path.resolve(file);
  compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  return compiled.exports.default;
}

(async () => {
  const Dashboard = await component('src/features/partners/PartnerDashboard.jsx');
  const OrderDetail = await component('src/features/partners/OrderDetail.jsx');
  const orders = [
    { id: 'lead-one', title: 'AC service', status: 'requested', role: 'professional' },
    { id: 'lead-two', title: 'Repair', status: 'requested', role: 'professional' },
    { id: 'accepted', title: 'Painting', status: 'accepted', role: 'professional' },
    { id: 'completed', title: 'Cleaning', status: 'completed', role: 'professional' },
    { id: 'cancelled', title: 'Electrical', status: 'cancelled', role: 'professional' },
  ];
  const html = renderToStaticMarkup(React.createElement(Dashboard, {
    role: 'professional', profile: { name: 'Test professional', services: ['AC Service'] }, approved: true,
    application: { status: 'approved' }, data: { orders, leads: [
      { order_id: 'lead-one', status: 'new' }, { order_id: 'lead-one', status: 'new' },
      { order_id: 'lead-two', status: 'lost' }, { order_id: 'cancelled', status: 'new' },
      { order_id: 'unknown', status: 'new' },
    ], earnings: [
      { amount: 2500, state: 'pending', created_at: new Date().toISOString() },
      { amount: 900, state: 'security_hold', created_at: new Date().toISOString() },
    ], posts: [], reviews: [] },
    online: false, busy: false, trial: null, setRoute() {}, setSheet() {}, act() {},
    setAvailability() {}, setOnline() {}, money: value => `INR ${value}`,
  }));
  assert.match(html, /<span class="pro-metric-label">Today&#x27;s earnings<\/span><strong>INR 2500<\/strong>/);
  assert.match(html, /<span class="pro-metric-label">Total earnings<\/span><strong>INR 2500<\/strong>/);
  assert.match(html, /<span class="pro-metric-label">Jobs completed<\/span><strong>1<\/strong>/);
  assert.match(html, /<span class="pro-metric-label">Customer rating<\/span><strong>—<\/strong>/);
  const requested = renderToStaticMarkup(React.createElement(OrderDetail, { order: orders[0], customer: true, notify() {} }));
  const accepted = renderToStaticMarkup(React.createElement(OrderDetail, { order: orders[2], customer: true, notify() {} }));
  assert.match(requested, /Requested · awaiting professional/);
  assert.doesNotMatch(requested, /Confirmed/);
  assert.match(accepted, /Confirmed/);
  console.log('PASS: requested/confirmed customer status and distinct genuine partner booking metrics.');
})().catch(error => { console.error(error); process.exitCode = 1; });
