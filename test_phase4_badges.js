// Phase 4 Badges Validation & Business Rule Verification Script
// Tests all 20 criteria specified in Step 12 + Step 13 business rule checks

const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const payload = data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;
    const opts = { ...options, headers: { ...options.headers } };
    if (payload !== null) {
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (payload !== null) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PHASE 4 BADGES VALIDATION & BUSINESS RULE TESTS ---');
  let passed = 0;
  let total = 0;

  function assert(condition, name, details) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`, details);
    }
  }

  // 0. Login as admin to test badge operations
  let adminToken = '';
  try {
    const loginRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin@sheba.et', password: 'password123' }
    );
    adminToken = loginRes.body?.data?.token || loginRes.body?.token;
    if (adminToken) {
      console.log('🔑 Logged in successfully as admin.');
    }
  } catch (e) {
    console.error('Login error:', e);
  }

  const adminHeaders = {
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  };

  // 1. Get Badges: Invalid badge ID (whitespace only) -> 400 VALIDATION_ERROR
  const t1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/badges/%20%20',
    method: 'GET',
  });
  assert(t1.status === 400 && t1.body?.error === 'VALIDATION_ERROR', '1. Invalid badge ID (empty/whitespace) -> 400', t1);

  // 2. Get Badges: Invalid user ID (whitespace only) -> 400 VALIDATION_ERROR
  const t2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/badges/user/%20%20',
    method: 'GET',
  });
  assert(t2.status === 400 && t2.body?.error === 'VALIDATION_ERROR', '2. Invalid user ID (empty/whitespace) -> 400', t2);

  // 3. Get Badges: Invalid event ID (whitespace only) -> 400 VALIDATION_ERROR
  const t3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/badges/event/%20%20/attended',
    method: 'GET',
  });
  assert(t3.status === 400 && t3.body?.error === 'VALIDATION_ERROR', '3. Invalid event ID (empty/whitespace) -> 400', t3);

  // 4. Valid IDs reach existing business logic (non-empty ID returns 200 or 404 business error, NOT VALIDATION_ERROR)
  const t4 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/badges/event/evt-test-123/attended',
    method: 'GET',
  });
  assert(t4.body?.error !== 'VALIDATION_ERROR', '4. Valid event ID reaches business logic', t4);

  // 5. Single Award: Missing eventId -> 400
  const t5 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { attendeeId: 'user-123', badgeCode: 'participant' }
  );
  assert(t5.status === 400 && t5.body?.error === 'VALIDATION_ERROR', '5. Single Award: Missing eventId -> 400', t5);

  // 6. Single Award: Missing attendeeId -> 400
  const t6 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', badgeCode: 'participant' }
  );
  assert(t6.status === 400 && t6.body?.error === 'VALIDATION_ERROR', '6. Single Award: Missing attendeeId -> 400', t6);

  // 7. Single Award: Missing badgeCode -> 400
  const t7 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeId: 'user-123' }
  );
  assert(t7.status === 400 && t7.body?.error === 'VALIDATION_ERROR', '7. Single Award: Missing badgeCode -> 400', t7);

  // 8. Single Award: Invalid badgeCode -> 400
  const t8 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeId: 'user-123', badgeCode: 'gold-champion' }
  );
  assert(t8.status === 400 && t8.body?.error === 'VALIDATION_ERROR', '8. Single Award: Invalid badgeCode -> 400', t8);

  // 9. Single Award: Valid participant badge request structure reaches service (returns business response, not VALIDATION_ERROR)
  const t9 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeId: 'user-123', badgeCode: 'participant' }
  );
  assert(t9.body?.error !== 'VALIDATION_ERROR', '9. Single Award: Valid participant badge request reaches service', t9);

  // 10. Single Award: Valid winner badge request structure reaches service
  const t10 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeId: 'user-123', badgeCode: 'winner' }
  );
  assert(t10.body?.error !== 'VALIDATION_ERROR', '10. Single Award: Valid winner badge request reaches service', t10);

  // 11. Single Award: Valid speaker badge request structure reaches service
  const t11 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeId: 'user-123', badgeCode: 'speaker' }
  );
  assert(t11.body?.error !== 'VALIDATION_ERROR', '11. Single Award: Valid speaker badge request reaches service', t11);

  // 12. Bulk Award: Missing eventId -> 400
  const t12 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/bulk-award',
      method: 'POST',
      headers: adminHeaders,
    },
    { attendeeUserIds: ['u1', 'u2'], badgeCode: 'participant' }
  );
  assert(t12.status === 400 && t12.body?.error === 'VALIDATION_ERROR', '12. Bulk Award: Missing eventId -> 400', t12);

  // 13. Bulk Award: Empty attendee list -> 400
  const t13 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/bulk-award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeUserIds: [], badgeCode: 'participant' }
  );
  assert(t13.status === 400 && t13.body?.error === 'VALIDATION_ERROR', '13. Bulk Award: Empty attendee list -> 400', t13);

  // 14. Bulk Award: Invalid attendee ID item (empty string) -> 400
  const t14 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/bulk-award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeUserIds: ['valid-id', '   '], badgeCode: 'participant' }
  );
  assert(t14.status === 400 && t14.body?.error === 'VALIDATION_ERROR', '14. Bulk Award: Invalid attendee ID item -> 400', t14);

  // 15. Bulk Award: Missing badgeCode -> 400
  const t15 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/bulk-award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeUserIds: ['u1'] }
  );
  assert(t15.status === 400 && t15.body?.error === 'VALIDATION_ERROR', '15. Bulk Award: Missing badgeCode -> 400', t15);

  // 16. Bulk Award: Invalid badgeCode -> 400
  const t16 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/bulk-award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeUserIds: ['u1'], badgeCode: 'platinum' }
  );
  assert(t16.status === 400 && t16.body?.error === 'VALIDATION_ERROR', '16. Bulk Award: Invalid badgeCode -> 400', t16);

  // 17. Bulk Award: Valid bulk request reaches service
  const t17 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/bulk-award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: 'evt-123', attendeeUserIds: ['u1', 'u2'], badgeCode: 'participant' }
  );
  assert(t17.body?.error !== 'VALIDATION_ERROR', '17. Bulk Award: Valid bulk request reaches service', t17);

  // 18. Revoke: Missing/invalid badge ID (whitespace only) -> 400
  const t18 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/%20%20',
      method: 'DELETE',
      headers: adminHeaders,
    },
    { reason: 'Mistake' }
  );
  assert(t18.status === 400 && t18.body?.error === 'VALIDATION_ERROR', '18. Revoke: Missing/invalid badge ID -> 400', t18);

  // 19. Revoke: Invalid reason type (e.g. number instead of string) -> 400
  const t19 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/badge-123',
      method: 'DELETE',
      headers: adminHeaders,
    },
    { reason: 12345 }
  );
  assert(t19.status === 400 && t19.body?.error === 'VALIDATION_ERROR', '19. Revoke: Invalid reason type -> 400', t19);

  // 20. Revoke: Valid revoke request reaches service (business 404 for non-existent record, not VALIDATION_ERROR)
  const t20 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/00000000-0000-0000-0000-000000000099',
      method: 'DELETE',
      headers: adminHeaders,
    },
    { reason: 'Revoked by organizer' }
  );
  assert(t20.body?.error !== 'VALIDATION_ERROR' && t20.status === 404, '20. Revoke: Valid request reaches service (404 business record not found)', t20);

  // 21. Business Rule: Non-attendee cannot receive a badge (Step 13)
  // When an event exists, but user didn't attend -> service rejects with 400 'Attendee must hold verified "Attended" status'
  // When event does not exist -> service rejects with 404 'Event not found.'
  // Both verify service logic is active and NOT bypassed by Zod.
  const t21 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
      headers: adminHeaders,
    },
    { eventId: '00000000-0000-0000-0000-000000000000', attendeeId: '11111111-1111-1111-1111-111111111111', badgeCode: 'winner' }
  );
  assert(t21.status === 404 && t21.body?.message === 'Event not found.', '21. Business Rule: Service enforces event existence before awarding', t21);

  // 22. Business Rule: Unauthorized non-admin/unauthenticated user cannot award badges
  const t22 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/badges/award',
      method: 'POST',
    },
    { eventId: 'evt-123', attendeeId: 'user-123', badgeCode: 'participant' }
  );
  assert(t22.status === 401, '22. Business Rule: Authentication is required for badge award', t22);

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} / ${total} tests passed.`);
  console.log(`========================================`);
}

runTests().catch(console.error);
