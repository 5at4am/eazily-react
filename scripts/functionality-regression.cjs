// Offline regression suites only. Never invokes the opt-in hosted fixture tests.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const suites = ['auth','database','staging','seller','legal-assessment','consultant-legal','consumer-legal',
  'service-registration','partner-registration-flow','service-posting','realtime','chat','automation',
  'staging-edge','catalog-service','professional-discovery','professional-discovery-database','customer-bookings'];
const results = [];
fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
for (const suite of suites) {
  if (process.argv.includes('--skip-browser') && suite === 'partner-registration-flow') {
    results.push({ suite, skipped: true, reason: 'Requires connected browser verification' });
    console.log(`SKIP: ${suite} (browser connection required)`);
    continue;
  }
  const file = `scripts/${suite}-test.cjs`;
  const run = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  const passed = run.status === 0;
  results.push({ suite, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${suite}`);
  fs.writeFileSync(path.join(root, `.tmp/regression-${suite}.log`), `${run.stdout || ''}\n${run.stderr || ''}`);
}
fs.writeFileSync(path.join(root, '.tmp/functionality-regression-result.json'), JSON.stringify(results, null, 2));
if (results.some(result => !result.skipped && !result.passed)) process.exitCode = 1;
