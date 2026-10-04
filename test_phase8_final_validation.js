// Phase 8 Final Validation & Business Rule Verification Script
// Tests all remaining endpoints: Search, Tickets, Admin

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
  console.log('--- STARTING PHASE 8 FINAL VALIDATION & BUSINESS RULE TESTS ---');
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
  let adminUserId = '';
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
    if (loginRes.status === 200 && loginRes.body?.data?.token) {
      adminToken = loginRes.body.data.token;
      adminUserId = loginRes.body.data.user?.id || '';
      console.log(`🔑 Logged in successfully as admin (User ID: ${adminUserId}).`);
    } else {
      console.error('Failed to log in as admin:', loginRes.body);
    }
  } catch (err) {
    console.error('Error logging in:', err.message);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // Register an attendee for role authorization tests
  let attendeeToken = '';
  const testAttendeeEmail = `phase8_attendee_${Date.now()}@example.com`;
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
        email: testAttendeeEmail,
        password: 'password123',
        full_name: 'Phase 8 Attendee',
        role: 'ATTENDEE',
      }
    );
    if (regRes.status === 201 && regRes.body?.data?.token) {
      attendeeToken = regRes.body.data.token;
      console.log('Registered attendee successfully for authorization tests.');
    }
  } catch (err) {
    console.error('Error registering test attendee:', err.message);
  }

  const attendeeHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${attendeeToken}`,
  };

  // ==========================================
  // SECTION 1: SEARCH QUERY VALIDATION
  // ==========================================

  // Test 1: Search query with overlong 'q' (>100 chars) -> 400 VALIDATION_ERROR
  const longQuery = 'a'.repeat(101);
  const t1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/search?q=${longQuery}`,
    method: 'GET',
  });
  assert(
    t1.status === 400 && t1.body?.error === 'VALIDATION_ERROR',
    'Test 1: Search with q > 100 characters returns 400 VALIDATION_ERROR',
    t1.body
  );

  // Test 2: Search query with overlong 'query' (>100 chars) -> 400 VALIDATION_ERROR
  const t2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/search?query=${longQuery}`,
    method: 'GET',
  });
  assert(
    t2.status === 400 && t2.body?.error === 'VALIDATION_ERROR',
    'Test 2: Search with query > 100 characters returns 400 VALIDATION_ERROR',
    t2.body
  );

  // Test 3: Search with valid 'q' parameter returns 200 with results shape
  const t3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/search?q=addis',
    method: 'GET',
  });
  assert(
    t3.status === 200 && Array.isArray(t3.body?.data?.attendees) && Array.isArray(t3.body?.data?.events),
    'Test 3: Search with valid q returns 200 with attendees and events arrays',
    t3.body
  );

  // Test 4: Search with valid 'query' parameter returns 200 with results shape
  const t4 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/search?query=tech',
    method: 'GET',
  });
  assert(
    t4.status === 200 && Array.isArray(t4.body?.data?.attendees) && Array.isArray(t4.body?.data?.events),
    'Test 4: Search with valid query parameter returns 200',
    t4.body
  );

  // Test 5: Search with no query parameters returns 200 empty results
  const t5 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/search',
    method: 'GET',
  });
  assert(
    t5.status === 200 && t5.body?.data?.attendees?.length === 0,
    'Test 5: Empty search returns 200 with empty attendees array',
    t5.body
  );

  // ==========================================
  // SECTION 2: TICKET ENDPOINT VALIDATION
  // ==========================================

  // Test 6: GET /api/tickets (my tickets) returns 200
  const t6 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t6.status === 200 && Array.isArray(t6.body?.data),
    'Test 6: GET /api/tickets returns 200 with array of tickets',
    t6.body
  );

  // Test 7: GET /api/tickets/:eventId with whitespace eventId -> 400 VALIDATION_ERROR
  const t7 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/%20%20',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t7.status === 400 && t7.body?.error === 'VALIDATION_ERROR',
    'Test 7: Whitespace eventId on GET /api/tickets/:eventId returns 400 VALIDATION_ERROR',
    t7.body
  );

  // Test 8: GET /api/tickets/:eventId with valid UUID reaches business logic (returns 404 when ticket not found)
  const t8 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/530172bc-0bfb-4d0d-98a8-5770cbeaa84d',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t8.status === 200 || t8.status === 404,
    'Test 8: Valid eventId reaches business logic on GET /api/tickets/:eventId (200 or 404)',
    t8.body
  );

  // Test 9: GET /api/tickets/id/:id with whitespace ticket ID -> 400 VALIDATION_ERROR
  const t9 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/id/%20%20',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t9.status === 400 && t9.body?.error === 'VALIDATION_ERROR',
    'Test 9: Whitespace ticket ID on GET /api/tickets/id/:id returns 400 VALIDATION_ERROR',
    t9.body
  );

  // Test 10: GET /api/tickets/id/:id with non-existent ID reaches business logic -> 404
  const t10 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets/id/11111111-1111-1111-1111-111111111111',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t10.status === 404 && t10.body?.message === 'Ticket not found.',
    'Test 10: Nonexistent ticket ID reaches service and returns 404 (business rule preserved)',
    t10.body
  );

  // Test 11: Unauthenticated GET /api/tickets returns 401 (auth preserved)
  const t11 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/tickets',
    method: 'GET',
  });
  assert(
    t11.status === 401,
    'Test 11: Unauthenticated GET /api/tickets returns 401 Unauthorized',
    t11.body
  );

  // ==========================================
  // SECTION 3: ADMIN ENDPOINT VALIDATION
  // ==========================================

  // Test 12: GET /api/admin/dashboard returns 200
  const t12 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/dashboard',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t12.status === 200 && typeof t12.body?.data?.totalEvents === 'number',
    'Test 12: GET /api/admin/dashboard returns 200 with dashboard metrics',
    t12.body
  );

  // Test 13: GET /api/admin/users returns 200
  const t13 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t13.status === 200 && Array.isArray(t13.body?.data?.attendees),
    'Test 13: GET /api/admin/users returns 200 with platform users',
    t13.body
  );

  // Test 14: GET /api/admin/payments returns 200
  const t14 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/payments',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t14.status === 200 && Array.isArray(t14.body?.data),
    'Test 14: GET /api/admin/payments returns 200 with payments array',
    t14.body
  );

  // Test 15: PATCH approve organizer with whitespace ID -> 400 VALIDATION_ERROR
  const t15 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/%20%20/approve',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t15.status === 400 && t15.body?.error === 'VALIDATION_ERROR',
    'Test 15: Whitespace ID on PATCH approve organizer returns 400 VALIDATION_ERROR',
    t15.body
  );

  // Test 16: PATCH approve organizer with nonexistent UUID reaches service -> 404
  const t16 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/11111111-1111-1111-1111-111111111111/approve',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t16.status === 404 && t16.body?.message === 'Organizer account not found.',
    'Test 16: Nonexistent ID on PATCH approve organizer returns 404',
    t16.body
  );

  // Test 17: PATCH reject organizer with whitespace ID -> 400 VALIDATION_ERROR
  const t17 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/%20%20/reject',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t17.status === 400 && t17.body?.error === 'VALIDATION_ERROR',
    'Test 17: Whitespace ID on PATCH reject organizer returns 400 VALIDATION_ERROR',
    t17.body
  );

  // Test 18: PATCH reject organizer with nonexistent UUID reaches service -> 404
  const t18 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/11111111-1111-1111-1111-111111111111/reject',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t18.status === 404 && t18.body?.message === 'Organizer account not found.',
    'Test 18: Nonexistent ID on PATCH reject organizer returns 404',
    t18.body
  );

  // Test 19: PATCH approve sponsor with whitespace ID -> 400 VALIDATION_ERROR
  const t19 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/%20%20/approve-sponsor',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t19.status === 400 && t19.body?.error === 'VALIDATION_ERROR',
    'Test 19: Whitespace ID on PATCH approve sponsor returns 400 VALIDATION_ERROR',
    t19.body
  );

  // Test 20: PATCH approve sponsor with nonexistent UUID reaches service -> 404
  const t20 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/11111111-1111-1111-1111-111111111111/approve-sponsor',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t20.status === 404 && t20.body?.message === 'Sponsor account not found.',
    'Test 20: Nonexistent ID on PATCH approve sponsor returns 404',
    t20.body
  );

  // Test 21: PATCH reject sponsor with whitespace ID -> 400 VALIDATION_ERROR
  const t21 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/%20%20/reject-sponsor',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t21.status === 400 && t21.body?.error === 'VALIDATION_ERROR',
    'Test 21: Whitespace ID on PATCH reject sponsor returns 400 VALIDATION_ERROR',
    t21.body
  );

  // Test 22: PATCH reject sponsor with nonexistent UUID reaches service -> 404
  const t22 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/11111111-1111-1111-1111-111111111111/reject-sponsor',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t22.status === 404 && t22.body?.message === 'Sponsor account not found.',
    'Test 22: Nonexistent ID on PATCH reject sponsor returns 404',
    t22.body
  );

  // Test 23: PATCH toggle user status with whitespace ID -> 400 VALIDATION_ERROR
  const t23 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/%20%20/status',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t23.status === 400 && t23.body?.error === 'VALIDATION_ERROR',
    'Test 23: Whitespace ID on PATCH toggle user status returns 400 VALIDATION_ERROR',
    t23.body
  );

  // Test 24: PATCH toggle user status with nonexistent UUID reaches service -> 404
  const t24 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/users/11111111-1111-1111-1111-111111111111/status',
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(
    t24.status === 404 && t24.body?.message === 'User not found.',
    'Test 24: Nonexistent ID on PATCH toggle user status returns 404',
    t24.body
  );

  // ==========================================
  // SECTION 4: AUTHORIZATION & SYSTEM TESTS
  // ==========================================

  // Test 25: Non-admin accessing admin dashboard returns 403 Forbidden
  const t25 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/dashboard',
    method: 'GET',
    headers: attendeeHeaders,
  });
  assert(
    t25.status === 403,
    'Test 25: Non-admin role accessing /api/admin/dashboard returns 403 Forbidden (authorization preserved)',
    t25.body
  );

  // Test 26: Unauthenticated request to /api/admin/dashboard returns 401
  const t26 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/dashboard',
    method: 'GET',
  });
  assert(
    t26.status === 401,
    'Test 26: Unauthenticated request to /api/admin/dashboard returns 401 Unauthorized (auth preserved)',
    t26.body
  );

  // Test 27: System health check returns 200
  const t27 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  });
  assert(
    t27.status === 200 && t27.body?.status === 'OK',
    'Test 27: System health check returns 200 OK',
    t27.body
  );

  console.log('\n========================================');
  console.log(`PHASE 8 FINAL VALIDATION RESULTS: ${passed}/${total} PASSED`);
  console.log('========================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
