const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const run = spawnSync(process.execPath, ['scripts/staging-preflight.cjs'], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
const output = run.stdout || '';
assert.equal(run.status, 1, 'preflight remains fail-closed without staging identity and remote approvals');
assert.match(output, /PASS: Canonical SQL inventory/, 'timestamped auth forward migration and test-only seeds are classified correctly');
assert.match(output, /BLOCKED: Migration execution path reconciled/, 'coexisting migration paths still block deployment');
assert.match(output, /BLOCKED: Explicit user confirmation/, 'deployment authorization remains required');
assert.doesNotMatch(output, /VITE_ENABLE_CONSULTANT_ASSESSMENT_TEST_SKIP/, 'preflight does not require an unused skip flag');
const report = JSON.parse(readFileSync('.tmp/staging-preflight.json', 'utf8'));
assert.equal(report.remoteContacted, false);
assert.equal(report.readyToDeploy, false);
console.log('PASS: preflight distinguishes repository inventory from remote deployment gates and remains offline/fail-closed.');
