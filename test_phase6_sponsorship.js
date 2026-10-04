// Phase 6 Sponsorship Validation & Business Rule Verification Script
// Tests all criteria specified in Step 12

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
  console.log('--- STARTING PHASE 6 SPONSORSHIP VALIDATION & BUSINESS RULE TESTS ---');
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

  // 0. Login as admin/organizer to get auth token
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
    if (loginRes.status === 200 && loginRes.body?.data?.token) {
      adminToken = loginRes.body.data.token;
      console.log('🔑 Logged in successfully as admin.');
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

  // Base valid application payload template
  const validAppPayload = {
    event_title: 'Ethiopian AI Developers Summit 2027',
    event_type: 'Conference',
    category: 'Technology & AI',
    expected_date: '2027-05-15',
    location: 'Skylight Hotel, Addis Ababa',
    expected_attendees: 300,
    target_audience: 'Software engineers, AI researchers, and tech founders',
    funding_goal: 75000,
    currency: 'ETB',
    description: 'Premier national summit convening developers and innovators.',
    contact_name: 'Dawit Abebe',
    contact_phone: '+251911223344',
    contact_email: 'dawit@example.com',
    contact_telegram: '@dawit_ai',
    pitch_deck_url: 'https://example.com/pitch-deck.pdf',
    packages: [
      { name: 'Gold Partner', amount: 25000, perks: 'Keynote speaking, prime booth, 5 VIP passes' },
      { name: 'Silver Supporter', amount: 10000, perks: 'Logo on banner, 2 VIP passes' },
    ],
    socials: {
      LinkedIn: 'https://linkedin.com/company/ethiopian-ai',
      Website: 'https://ethiopian-ai.org',
    },
  };

  // --- 1. APPLICATION CREATION (POST /api/sponsorships/applications) ---

  // Test 1: Missing required fields (missing event_title) -> 400
  const t1 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    { ...validAppPayload, event_title: '' }
  );
  assert(
    t1.status === 400 && t1.body?.error === 'VALIDATION_ERROR',
    'Test 1: Missing event_title returns 400 VALIDATION_ERROR',
    t1.body
  );

  // Test 2: Invalid contact email -> 400
  const t2 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    { ...validAppPayload, contact_email: 'invalid-email-address' }
  );
  assert(
    t2.status === 400 && t2.body?.error === 'VALIDATION_ERROR',
    'Test 2: Invalid contact_email returns 400 VALIDATION_ERROR',
    t2.body
  );

  // Test 3: Invalid funding goal (<= 0) -> 400
  const t3 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    { ...validAppPayload, funding_goal: -100 }
  );
  assert(
    t3.status === 400 && t3.body?.error === 'VALIDATION_ERROR',
    'Test 3: Invalid negative funding_goal returns 400 VALIDATION_ERROR',
    t3.body
  );

  // Test 4: Invalid expected attendees (negative or non-integer) -> 400
  const t4 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    { ...validAppPayload, expected_attendees: -50 }
  );
  assert(
    t4.status === 400 && t4.body?.error === 'VALIDATION_ERROR',
    'Test 4: Invalid negative expected_attendees returns 400 VALIDATION_ERROR',
    t4.body
  );

  // Test 5: Invalid package structure (package amount <= 0 or missing name) -> 400
  const t5 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    {
      ...validAppPayload,
      packages: [{ name: '', amount: -10, perks: 'Nothing' }],
    }
  );
  assert(
    t5.status === 400 && t5.body?.error === 'VALIDATION_ERROR',
    'Test 5: Invalid package structure returns 400 VALIDATION_ERROR',
    t5.body
  );

  // Test 6: Invalid socials structure (social link not a string) -> 400
  const t6 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    {
      ...validAppPayload,
      socials: { LinkedIn: 12345 },
    }
  );
  assert(
    t6.status === 400 && t6.body?.error === 'VALIDATION_ERROR',
    'Test 6: Invalid socials structure returns 400 VALIDATION_ERROR',
    t6.body
  );

  // Test 7: Invalid pitch deck URL (not a valid URL) -> 400
  const t7 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    {
      ...validAppPayload,
      pitch_deck_url: 'not-a-url',
    }
  );
  assert(
    t7.status === 400 && t7.body?.error === 'VALIDATION_ERROR',
    'Test 7: Invalid pitch_deck_url returns 400 VALIDATION_ERROR',
    t7.body
  );

  // Test 8: Valid application creation -> 201 (reaches business logic & db)
  let createdAppId = '';
  const t8 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: authHeaders,
    },
    validAppPayload
  );
  if (t8.status === 201 && t8.body?.data?.id) {
    createdAppId = t8.body.data.id;
  }
  assert(
    t8.status === 201 && t8.body?.success === true && Boolean(createdAppId),
    'Test 8: Valid application creation returns 201 with created application ID',
    t8.body
  );

  // --- 2. APPLICATION ROUTES (GET & DELETE) ---

  // Test 9: Missing/invalid application ID on GET -> 400
  const t9 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/applications/%20',
    method: 'GET',
  });
  assert(
    t9.status === 400 && t9.body?.error === 'VALIDATION_ERROR',
    'Test 9: Invalid whitespace application ID on GET returns 400 VALIDATION_ERROR',
    t9.body
  );

  // Test 10: Valid application ID reaches existing logic
  const t10 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/sponsorships/applications/${createdAppId}`,
    method: 'GET',
  });
  assert(
    t10.status === 200 && t10.body?.data?.id === createdAppId,
    'Test 10: Valid application ID reaches existing logic and returns application details',
    t10.body
  );

  // Test 11: Missing/invalid application ID on DELETE -> 400
  const t11 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/applications/%20',
    method: 'DELETE',
    headers: authHeaders,
  });
  assert(
    t11.status === 400 && t11.body?.error === 'VALIDATION_ERROR',
    'Test 11: Invalid whitespace application ID on DELETE returns 400 VALIDATION_ERROR',
    t11.body
  );

  // --- 3. EXPLORE (GET /api/sponsorships/explore) ---

  // Test 12: Valid query parameters -> 200
  const t12 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/explore?search=Ethiopian&category=Technology%20%26%20AI&minBudget=1000&maxBudget=100000',
    method: 'GET',
  });
  assert(
    t12.status === 200 && Array.isArray(t12.body?.data),
    'Test 12: Valid explore query parameters returns 200',
    t12.body
  );

  // Test 13: Invalid negative minBudget -> 400
  const t13 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/explore?minBudget=-50',
    method: 'GET',
  });
  assert(
    t13.status === 400 && t13.body?.error === 'VALIDATION_ERROR',
    'Test 13: Negative minBudget returns 400 VALIDATION_ERROR',
    t13.body
  );

  // Test 14: Invalid negative maxBudget -> 400
  const t14 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/explore?maxBudget=-100',
    method: 'GET',
  });
  assert(
    t14.status === 400 && t14.body?.error === 'VALIDATION_ERROR',
    'Test 14: Negative maxBudget returns 400 VALIDATION_ERROR',
    t14.body
  );

  // Test 15: Invalid non-numeric budget -> 400
  const t15 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/explore?minBudget=not_a_number',
    method: 'GET',
  });
  assert(
    t15.status === 400 && t15.body?.error === 'VALIDATION_ERROR',
    'Test 15: Non-numeric minBudget returns 400 VALIDATION_ERROR',
    t15.body
  );

  // Test 16: Omitted optional parameters (empty query) -> 200
  const t16 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/explore',
    method: 'GET',
  });
  assert(
    t16.status === 200 && Array.isArray(t16.body?.data),
    'Test 16: Empty query parameters on explore returns 200',
    t16.body
  );

  // --- 4. DEALS (POST /api/sponsorships/deals) ---

  // Test 17: Missing applicationId -> 400
  const t17 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/deals',
      method: 'POST',
      headers: authHeaders,
    },
    { status: 'INTERESTED' }
  );
  assert(
    t17.status === 400 && t17.body?.error === 'VALIDATION_ERROR',
    'Test 17: Missing applicationId returns 400 VALIDATION_ERROR',
    t17.body
  );

  // Test 18: Invalid applicationId (whitespace) -> 400
  const t18 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/deals',
      method: 'POST',
      headers: authHeaders,
    },
    { applicationId: '   ', status: 'INTERESTED' }
  );
  assert(
    t18.status === 400 && t18.body?.error === 'VALIDATION_ERROR',
    'Test 18: Whitespace applicationId returns 400 VALIDATION_ERROR',
    t18.body
  );

  // Test 19: Invalid status -> 400
  const t19 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/deals',
      method: 'POST',
      headers: authHeaders,
    },
    { applicationId: createdAppId, status: 'ACCEPTED_OR_INVALID' }
  );
  assert(
    t19.status === 400 && t19.body?.error === 'VALIDATION_ERROR',
    'Test 19: Invalid status enum value returns 400 VALIDATION_ERROR',
    t19.body
  );

  // Test 20: Invalid pledged_amount (negative) -> 400
  const t20 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/deals',
      method: 'POST',
      headers: authHeaders,
    },
    { applicationId: createdAppId, status: 'INTERESTED', pledged_amount: -500 }
  );
  assert(
    t20.status === 400 && t20.body?.error === 'VALIDATION_ERROR',
    'Test 20: Negative pledged_amount returns 400 VALIDATION_ERROR',
    t20.body
  );

  // Test 21: Valid deal creation -> 200
  let createdDealId = '';
  const t21 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/deals',
      method: 'POST',
      headers: authHeaders,
    },
    {
      applicationId: createdAppId,
      status: 'INTERESTED',
      package_name: 'Gold Partner',
      pledged_amount: 25000,
      sponsor_notes: 'Excited to sponsor this event!',
    }
  );
  if (t21.status === 200 && t21.body?.data?.id) {
    createdDealId = t21.body.data.id;
  }
  assert(
    t21.status === 200 && t21.body?.data?.status === 'INTERESTED',
    'Test 21: Valid deal creation succeeds and returns deal data',
    t21.body
  );

  // --- 5. DEAL UPDATE (PATCH /api/sponsorships/deals/:id) ---

  // Test 22: Invalid deal ID (whitespace) -> 400
  const t22 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/deals/%20',
      method: 'PATCH',
      headers: authHeaders,
    },
    { status: 'DECLINED' }
  );
  assert(
    t22.status === 400 && t22.body?.error === 'VALIDATION_ERROR',
    'Test 22: Whitespace deal ID on PATCH returns 400 VALIDATION_ERROR',
    t22.body
  );

  // Test 23: Invalid status on update -> 400
  const t23 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/sponsorships/deals/${createdDealId}`,
      method: 'PATCH',
      headers: authHeaders,
    },
    { status: 'NOT_A_STATUS' }
  );
  assert(
    t23.status === 400 && t23.body?.error === 'VALIDATION_ERROR',
    'Test 23: Invalid status on PATCH deal returns 400 VALIDATION_ERROR',
    t23.body
  );

  // Test 24: Invalid sponsor_notes type (e.g. number) -> 400
  const t24 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/sponsorships/deals/${createdDealId}`,
      method: 'PATCH',
      headers: authHeaders,
    },
    { status: 'DECLINED', sponsor_notes: 12345 }
  );
  assert(
    t24.status === 400 && t24.body?.error === 'VALIDATION_ERROR',
    'Test 24: Invalid sponsor_notes type returns 400 VALIDATION_ERROR',
    t24.body
  );

  // Test 25: Valid deal update -> 200
  const t25 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/sponsorships/deals/${createdDealId}`,
      method: 'PATCH',
      headers: authHeaders,
    },
    { status: 'DECLINED', sponsor_notes: 'Budget reallocated for Q3' }
  );
  assert(
    t25.status === 200 && t25.body?.data?.status === 'DECLINED',
    'Test 25: Valid deal update succeeds and updates status to DECLINED',
    t25.body
  );

  // --- 6. SPONSOR MY DEALS (GET /api/sponsorships/sponsor/my-deals) ---

  // Test 26: Valid status query -> 200
  const t26 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/sponsor/my-deals?status=DECLINED',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t26.status === 200 && Array.isArray(t26.body?.data),
    'Test 26: Valid status query on my-deals returns 200 with deals list',
    t26.body
  );

  // Test 27: Invalid status query -> 400
  const t27 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/sponsor/my-deals?status=INVALID_STATUS',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t27.status === 400 && t27.body?.error === 'VALIDATION_ERROR',
    'Test 27: Invalid status query on my-deals returns 400 VALIDATION_ERROR',
    t27.body
  );

  // --- 7. AUTHORIZATION & BUSINESS BEHAVIOR ---

  // Test 28: Unauthenticated request to protected endpoint -> 401
  const t28 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/applications',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    validAppPayload
  );
  assert(
    t28.status === 401,
    'Test 28: Unauthenticated application creation returns 401 Unauthorized (auth preserved)',
    t28.body
  );

  // Test 29: Nonexistent application ID on detail lookup reaches business logic -> 404
  const t29 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sponsorships/applications/00000000-0000-0000-0000-000000000000',
    method: 'GET',
  });
  assert(
    t29.status === 404 && t29.body?.message?.includes('not found'),
    'Test 29: Nonexistent application ID reaches service and returns 404 (business rule preserved)',
    t29.body
  );

  // Test 30: Nonexistent deal ID on update reaches business logic -> 404
  const t30 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sponsorships/deals/00000000-0000-0000-0000-000000000000',
      method: 'PATCH',
      headers: authHeaders,
    },
    { status: 'INTERESTED' }
  );
  assert(
    t30.status === 404 && (t30.body?.message?.includes('not found') || t30.body?.message?.includes('unauthorized')),
    'Test 30: Nonexistent deal ID reaches service and returns 404 (business rule preserved)',
    t30.body
  );

  // Cleanup: delete the created test application
  if (createdAppId) {
    try {
      await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/sponsorships/applications/${createdAppId}`,
        method: 'DELETE',
        headers: authHeaders,
      });
      console.log('🧹 Cleaned up test application.');
    } catch {}
  }

  console.log(`\n========================================`);
  console.log(`PHASE 6 SPONSORSHIP TEST RESULTS: ${passed}/${total} PASSED`);
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
