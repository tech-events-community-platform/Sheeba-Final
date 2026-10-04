// Phase 5 Reports Validation & Business Rule Verification Script
// Tests all 18 criteria from Step 13 + Step 14 business rule checks

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
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
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
  console.log('--- STARTING PHASE 5 REPORTS VALIDATION & BUSINESS RULE TESTS ---');
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

  // 0. Login as admin to get auth token
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
    if (loginRes.status === 200 && loginRes.body.data && loginRes.body.data.token) {
      adminToken = loginRes.body.data.token;
      console.log('Logged in as admin successfully.');
    } else {
      console.error('Failed to log in as admin:', loginRes.body);
    }
  } catch (err) {
    console.error('Error logging in:', err.message);
  }

  // 0b. Register or login as attendee to test role authorization
  let attendeeToken = '';
  try {
    const regRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: `attendee_p5_${Date.now()}@sheba.et`,
        password: 'password123',
        full_name: 'Attendee P5',
        role: 'attendee',
      }
    );
    if (regRes.status === 201 && regRes.body?.data?.token) {
      attendeeToken = regRes.body.data.token;
      console.log('Registered attendee successfully for role test.');
    }
  } catch (err) {
    console.warn('Attendee registration error:', err.message);
  }

  // Fetch an existing event to test with using admin token
  let testEventId = '';
  try {
    const eventsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/events',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    if (eventsRes.status === 200 && Array.isArray(eventsRes.body.data) && eventsRes.body.data.length > 0) {
      testEventId = eventsRes.body.data[0].id;
      console.log(`Using existing event for report tests: ${testEventId}`);
    }
  } catch (err) {
    console.warn('Could not fetch events:', err.message);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // --- GET REPORT ---

  // 1. Missing event ID -> 400
  const t1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/events',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t1.status === 400 && (t1.body.error === 'VALIDATION_ERROR' || t1.body.message.includes('required')),
    'Test 1: GET report missing event ID returns 400 VALIDATION_ERROR',
    t1.body
  );

  // 2. Invalid/empty event ID -> 400
  const t2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/events/%20',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t2.status === 400 && (t2.body.error === 'VALIDATION_ERROR' || t2.body.message.includes('required')),
    'Test 2: GET report empty/whitespace event ID returns 400 VALIDATION_ERROR',
    t2.body
  );

  // 3. Valid event ID -> existing business logic (reaches service, returns 200)
  const t3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/events/${testEventId}`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t3.status === 200 && t3.body.success === true && t3.body.data && t3.body.data.eventId === testEventId,
    'Test 3: GET report with valid event ID reaches existing business logic and returns 200',
    t3.body
  );

  // 4. refresh=true -> accepted
  const t4 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/events/${testEventId}?refresh=true`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t4.status === 200 && t4.body.success === true,
    'Test 4: GET report with refresh=true accepted',
    t4.body
  );

  // 5. refresh=false -> accepted
  const t5 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/events/${testEventId}?refresh=false`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t5.status === 200 && t5.body.success === true,
    'Test 5: GET report with refresh=false accepted',
    t5.body
  );

  // 6. Invalid refresh value -> 400
  const t6 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/events/${testEventId}?refresh=invalid_value`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t6.status === 400 && t6.body.error === 'VALIDATION_ERROR',
    'Test 6: GET report with invalid refresh value returns 400 VALIDATION_ERROR',
    t6.body
  );

  // --- EXPORT ---

  // 7. Missing/invalid event ID -> 400
  const t7 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/events/export',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t7.status === 400 && (t7.body.error === 'VALIDATION_ERROR' || t7.body.message.includes('required')),
    'Test 7: GET export with missing event ID returns 400 VALIDATION_ERROR',
    t7.body
  );

  // 8. Valid event ID reaches existing export logic
  const t8 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/events/${testEventId}/export`,
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t8.status === 200 && (t8.headers['content-type'] || '').includes('text/csv'),
    'Test 8: GET export with valid event ID reaches existing export logic and returns CSV',
    { status: t8.status, headers: t8.headers }
  );

  // --- UPDATE ---

  // 9. Missing event ID -> 400
  const t9 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports/events',
      method: 'PUT',
      headers: authHeaders,
    },
    { customNotes: 'test notes' }
  );
  assert(
    t9.status === 400 && (t9.body.error === 'VALIDATION_ERROR' || t9.body.message.includes('required')),
    'Test 9: PUT update missing event ID returns 400 VALIDATION_ERROR',
    t9.body
  );

  // 10. Empty body -> behavior matches current API contract (accepted as partial update)
  const t10 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'PUT',
      headers: authHeaders,
    },
    {}
  );
  assert(
    t10.status === 200 && t10.body.success === true,
    'Test 10: PUT update with empty body accepted (valid partial update contract)',
    t10.body
  );

  // 11. Invalid aiNarrative type -> 400
  const t11 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'PUT',
      headers: authHeaders,
    },
    { aiNarrative: 'invalid_should_be_object' }
  );
  assert(
    t11.status === 400 && t11.body.error === 'VALIDATION_ERROR',
    'Test 11: PUT update with invalid aiNarrative type returns 400 VALIDATION_ERROR',
    t11.body
  );

  // 12. Invalid narrative field type -> 400
  const t12 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'PUT',
      headers: authHeaders,
    },
    {
      aiNarrative: {
        executiveSummary: 12345,
      },
    }
  );
  assert(
    t12.status === 400 && t12.body.error === 'VALIDATION_ERROR',
    'Test 12: PUT update with invalid narrative field type returns 400 VALIDATION_ERROR',
    t12.body
  );

  // 13. Invalid customNotes type -> 400
  const t13 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'PUT',
      headers: authHeaders,
    },
    { customNotes: 98765 }
  );
  assert(
    t13.status === 400 && t13.body.error === 'VALIDATION_ERROR',
    'Test 13: PUT update with invalid customNotes type returns 400 VALIDATION_ERROR',
    t13.body
  );

  // 14. Valid partial update -> existing behavior (updates only customNotes)
  const t14 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'PUT',
      headers: authHeaders,
    },
    { customNotes: 'Phase 5 verified notes update' }
  );
  assert(
    t14.status === 200 && t14.body.data && t14.body.data.customNotes === 'Phase 5 verified notes update',
    'Test 14: PUT valid partial update preserves existing behavior',
    t14.body
  );

  // 15. Valid multiple-field update -> existing behavior
  const t15 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'PUT',
      headers: authHeaders,
    },
    {
      aiNarrative: {
        executiveSummary: 'Updated Executive Summary for Phase 5',
        partnerImpactSummary: 'Updated Partner Impact Summary',
      },
      customNotes: 'Updated multi-field custom notes',
    }
  );
  assert(
    t15.status === 200 &&
      t15.body.data &&
      t15.body.data.aiNarrative &&
      t15.body.data.aiNarrative.executiveSummary === 'Updated Executive Summary for Phase 5',
    'Test 15: PUT valid multiple-field update updates narrative and notes correctly',
    t15.body
  );

  // 16. Empty string fields -> preserve current behavior (allows clearing notes)
  const t16 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'PUT',
      headers: authHeaders,
    },
    { customNotes: '' }
  );
  assert(
    t16.status === 200 && t16.body.data && (t16.body.data.customNotes === '' || t16.body.data.customNotes === null),
    'Test 16: PUT with empty string fields preserved (clears customNotes properly)',
    t16.body
  );

  // --- RESET ---

  // 17. Missing/invalid event ID -> 400
  const t17 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/events/reset',
    method: 'POST',
    headers: authHeaders,
  });
  assert(
    t17.status === 400 && (t17.body.error === 'VALIDATION_ERROR' || t17.body.message.includes('required')),
    'Test 17: POST reset with missing event ID returns 400 VALIDATION_ERROR',
    t17.body
  );

  // 18. Valid event ID reaches existing reset logic
  const t18 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/events/${testEventId}/reset`,
    method: 'POST',
    headers: authHeaders,
  });
  assert(
    t18.status === 200 && t18.body.success === true,
    'Test 18: POST reset with valid event ID reaches existing reset logic and succeeds',
    t18.body
  );

  // --- BUSINESS RULE PRESERVATION ---

  // 19. Unauthorized user without token -> 401
  const t19 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/events/${testEventId}`,
    method: 'GET',
  });
  assert(
    t19.status === 401,
    'Test 19: Unauthenticated request to report endpoint returns 401 (not validation error)',
    t19.body
  );

  // 20. Attendee user role -> 403 Forbidden
  if (attendeeToken) {
    const t20 = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports/events/${testEventId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`,
      },
    });
    assert(
      t20.status === 403,
      'Test 20: Attendee role accessing organizer report returns 403 Forbidden (authorization preserved)',
      t20.body
    );
  } else {
    console.log('Skipping test 20 (no attendee token available)');
  }

  // 21. Nonexistent event -> 404
  const t21 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/events/00000000-0000-0000-0000-000000000000',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t21.status === 404,
    'Test 21: Nonexistent event ID reaches service and returns 404 Event not found (business rule preserved)',
    t21.body
  );

  console.log(`\n========================================`);
  console.log(`PHASE 5 REPORTS TEST RESULTS: ${passed}/${total} PASSED`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
