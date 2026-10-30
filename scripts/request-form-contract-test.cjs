const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const requestSheet = readFileSync('src/features/requests/RequestSheet.jsx', 'utf8');
assert.match(requestSheet, /Document upload is not available in this form/);
assert.doesNotMatch(requestSheet, /type\s*=\s*["']file["']/, 'The request sheet must not show file pickers when there is no upload flow');
assert.match(requestSheet, /requestProfessionalBooking\(/, 'Selected professional bookings use the intake RPC adapter');
assert.match(requestSheet, /createServiceRequest\(/, 'General service requests use the guarded request RPC adapter');
assert.match(requestSheet, /submissionKey\.current/, 'Retries keep the same idempotency key');
console.log('PASS: booking forms do not imply unsupported document uploads and preserve the request RPC/idempotency path.');
