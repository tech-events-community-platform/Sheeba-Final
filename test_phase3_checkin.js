// Phase 3 Check-In Validation Verification Script
// Tests all 21 checklist criteria specified in Step 11

const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PHASE 3 CHECK-IN VALIDATION TESTS ---');
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

  // 0. Login as admin to get token (admin is authorized for organizer/admin routes)
  let token = '';
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
    token = loginRes.body?.data?.token || loginRes.body?.token;
    if (!token) {
      console.warn('⚠️ Could not log in with admin@sheba.et, response was:', loginRes);
    } else {
      console.log('🔑 Logged in successfully as admin for testing check-in endpoints.');
    }
  } catch (e) {
    console.error('Login error:', e);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // 1. Ticket verification (GET /api/checkin/verify-ticket)
  // Missing token/code -> 400
  const t1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/checkin/verify-ticket',
    method: 'GET',
  });
  assert(t1.status === 400 && t1.body?.error === 'VALIDATION_ERROR', '1. Missing token/code -> 400 VALIDATION_ERROR', t1);

  // 2. Empty token/code -> 400
  const t2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/checkin/verify-ticket?token=&code=',
    method: 'GET',
  });
  assert(t2.status === 400 && t2.body?.error === 'VALIDATION_ERROR', '2. Empty token/code -> 400 VALIDATION_ERROR', t2);

  // 3. Valid token supplied -> existing controller behavior (e.g. 400/404/200 business result, NOT Zod 400 VALIDATION_ERROR)
  const t3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/checkin/verify-ticket?token=test-dummy-token',
    method: 'GET',
  });
  assert(t3.body?.error !== 'VALIDATION_ERROR', '3. Valid token format reaches controller', t3);

  // 4. Valid code supplied -> existing controller behavior (NOT Zod 400 VALIDATION_ERROR)
  const t4 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/checkin/verify-ticket?code=TKT-12345',
    method: 'GET',
  });
  assert(t4.body?.error !== 'VALIDATION_ERROR', '4. Valid code format reaches controller', t4);

  // 5. Search: Missing eventId -> 400
  const t5 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/search',
      method: 'POST',
      headers: authHeaders,
    },
    { query: 'liya' }
  );
  assert(t5.status === 400 && t5.body?.error === 'VALIDATION_ERROR', '5. Missing eventId -> 400', t5);

  // 6. Search: Invalid/empty eventId -> 400
  const t6 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/search',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: '   ', query: 'liya' }
  );
  assert(t6.status === 400 && t6.body?.error === 'VALIDATION_ERROR', '6. Invalid/empty eventId -> 400', t6);

  // 7. Search: Valid eventId/search -> reaches controller / existing behavior
  const t7 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/search',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', query: 'liya' }
  );
  assert(t7.body?.error !== 'VALIDATION_ERROR', '7. Valid eventId/search reaches business layer', t7);

  // 8. Lookup: Missing eventId -> 400
  const t8 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/lookup',
      method: 'POST',
      headers: authHeaders,
    },
    { query: 'test' }
  );
  assert(t8.status === 400 && t8.body?.error === 'VALIDATION_ERROR', '8. Lookup: Missing eventId -> 400', t8);

  // 9. Lookup: Missing required query -> 400
  const t9 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/lookup',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123' }
  );
  assert(t9.status === 400 && t9.body?.error === 'VALIDATION_ERROR', '9. Lookup: Missing required query -> 400', t9);

  // 10. Lookup: Valid lookup -> reaches controller
  const t10 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/lookup',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', query: 'some-attendee' }
  );
  assert(t10.body?.error !== 'VALIDATION_ERROR', '10. Valid lookup reaches business layer', t10);

  // 11. Mark attended: Missing eventId -> 400
  const t11 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/mark-attended',
      method: 'POST',
      headers: authHeaders,
    },
    { attendeeId: 'att-123' }
  );
  assert(t11.status === 400 && t11.body?.error === 'VALIDATION_ERROR', '11. Mark attended: Missing eventId -> 400', t11);

  // 12. Mark attended: Missing attendee ID -> 400
  const t12 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/mark-attended',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123' }
  );
  assert(t12.status === 400 && t12.body?.error === 'VALIDATION_ERROR', '12. Mark attended: Missing attendee ID -> 400', t12);

  // 13. Mark attended: Valid request structure -> reaches controller
  const t13 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/mark-attended',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', attendeeId: 'att-123', notes: 'Great participant' }
  );
  assert(t13.body?.error !== 'VALIDATION_ERROR', '13. Mark attended: Valid request reaches business layer', t13);

  // 14. Undo: Missing eventId -> 400
  const t14 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/undo',
      method: 'POST',
      headers: authHeaders,
    },
    { attendeeId: 'att-123' }
  );
  assert(t14.status === 400 && t14.body?.error === 'VALIDATION_ERROR', '14. Undo: Missing eventId -> 400', t14);

  // 15. Undo: Missing attendeeId -> 400
  const t15 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/undo',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123' }
  );
  assert(t15.status === 400 && t15.body?.error === 'VALIDATION_ERROR', '15. Undo: Missing attendeeId -> 400', t15);

  // 16. Undo: Valid request structure -> reaches controller
  const t16 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/undo',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', attendeeId: 'att-123', reason: 'Checked in by mistake' }
  );
  assert(t16.body?.error !== 'VALIDATION_ERROR', '16. Undo: Valid request reaches business layer', t16);

  // 17. Manual attendee: Missing name -> 400
  const t17 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/manual-attendee',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', email: 'guest@example.com' }
  );
  assert(t17.status === 400 && t17.body?.error === 'VALIDATION_ERROR', '17. Manual attendee: Missing name -> 400', t17);

  // 18. Manual attendee: Missing email -> 400
  const t18 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/manual-attendee',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', name: 'John Doe' }
  );
  assert(t18.status === 400 && t18.body?.error === 'VALIDATION_ERROR', '18. Manual attendee: Missing email -> 400', t18);

  // 19. Manual attendee: Invalid email -> 400
  const t19 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/manual-attendee',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', name: 'John Doe', email: 'not-an-email' }
  );
  assert(t19.status === 400 && t19.body?.error === 'VALIDATION_ERROR', '19. Manual attendee: Invalid email -> 400', t19);

  // 20. Manual attendee: Valid attendee -> reaches controller
  const t20 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/manual-attendee',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', name: 'Jane Doe', email: 'jane@example.com', phone: '+251911223344' }
  );
  assert(t20.body?.error !== 'VALIDATION_ERROR', '20. Manual attendee: Valid attendee reaches business layer', t20);

  // 21. Manual attendee: Optional phone omitted -> reaches controller
  const t21 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin/manual-attendee',
      method: 'POST',
      headers: authHeaders,
    },
    { eventId: 'evt-123', name: 'Jane Doe', email: 'jane@example.com' }
  );
  assert(t21.body?.error !== 'VALIDATION_ERROR', '21. Manual attendee: Optional phone omitted reaches business layer', t21);

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} / ${total} tests passed.`);
  console.log(`========================================`);
}

runTests().catch(console.error);
