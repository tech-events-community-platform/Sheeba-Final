// Phase 7 User / Profile Validation & Business Rule Verification Script
// Tests all criteria specified in Step 11

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
  console.log('--- STARTING PHASE 7 USER / PROFILE VALIDATION & BUSINESS RULE TESTS ---');
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

  // --- 1. PUBLIC PROFILE ROUTE & ID VALIDATION ---

  // Test 1: Missing public profile ID -> 400
  const t1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/public',
    method: 'GET',
  });
  assert(
    t1.status === 400 && t1.body?.error === 'VALIDATION_ERROR',
    'Test 1: Missing public profile ID returns 400 VALIDATION_ERROR',
    t1.body
  );

  // Test 2: Whitespace public profile ID -> 400
  const t2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/%20/public',
    method: 'GET',
  });
  assert(
    t2.status === 400 && t2.body?.error === 'VALIDATION_ERROR',
    'Test 2: Whitespace public profile ID returns 400 VALIDATION_ERROR',
    t2.body
  );

  // Test 3: Valid public profile ID reaches business logic and returns 200
  const t3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/users/${adminUserId}/public`,
    method: 'GET',
  });
  assert(
    t3.status === 200 && t3.body?.success === true && t3.body?.data?.user?.id === adminUserId,
    'Test 3: Valid public profile ID returns 200 with public profile details',
    t3.body
  );

  // --- 2. GET CURRENT PROFILE (/api/users/me & /api/users/profile) ---

  // Test 4: GET /api/users/me authenticated -> 200
  const t4 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t4.status === 200 && t4.body?.success === true && t4.body?.data?.id === adminUserId,
    'Test 4: GET /api/users/me returns 200 with profile',
    t4.body
  );

  // Test 5: GET /api/users/profile authenticated -> 200
  const t5 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/profile',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t5.status === 200 && t5.body?.success === true && t5.body?.data?.id === adminUserId,
    'Test 5: GET /api/users/profile returns 200 with profile',
    t5.body
  );

  // --- 3. PROFILE UPDATE (PATCH /api/users/me) ---

  // Test 6: Empty full_name -> 400
  const t6 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { full_name: '' }
  );
  assert(
    t6.status === 400 && t6.body?.error === 'VALIDATION_ERROR',
    'Test 6: Empty full_name on PATCH returns 400 VALIDATION_ERROR',
    t6.body
  );

  // Test 7: Invalid full_name type (number) -> 400
  const t7 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { full_name: 12345 }
  );
  assert(
    t7.status === 400 && t7.body?.error === 'VALIDATION_ERROR',
    'Test 7: Invalid full_name type returns 400 VALIDATION_ERROR',
    t7.body
  );

  // Test 8: Invalid phone type (number) -> 400
  const t8 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { phone: 987654321 }
  );
  assert(
    t8.status === 400 && t8.body?.error === 'VALIDATION_ERROR',
    'Test 8: Invalid phone type returns 400 VALIDATION_ERROR',
    t8.body
  );

  // Test 9: Invalid bio type (number) -> 400
  const t9 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { bio: 123 }
  );
  assert(
    t9.status === 400 && t9.body?.error === 'VALIDATION_ERROR',
    'Test 9: Invalid bio type returns 400 VALIDATION_ERROR',
    t9.body
  );

  // Test 10: Invalid visibility enum value -> 400
  const t10 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { visibility: 'secret' }
  );
  assert(
    t10.status === 400 && t10.body?.error === 'VALIDATION_ERROR',
    'Test 10: Invalid visibility enum value returns 400 VALIDATION_ERROR',
    t10.body
  );

  // Test 11: Invalid avatar URL -> 400
  const t11 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { avatar_url: 'not-a-valid-url' }
  );
  assert(
    t11.status === 400 && t11.body?.error === 'VALIDATION_ERROR',
    'Test 11: Invalid avatar_url returns 400 VALIDATION_ERROR',
    t11.body
  );

  // Test 12: Valid partial update -> 200
  const t12 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { bio: 'Tech community organizer & Sheba admin.' }
  );
  assert(
    t12.status === 200 && t12.body?.data?.bio === 'Tech community organizer & Sheba admin.',
    'Test 12: Valid partial bio update returns 200 with updated bio',
    t12.body
  );

  // Test 13: Valid multiple fields update -> 200
  const t13 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    {
      full_name: 'Sheba Platform Admin',
      phone: '+251911998877',
      organization: 'Sheba Tech Ecosystem',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    }
  );
  assert(
    t13.status === 200 &&
      t13.body?.data?.name === 'Sheba Platform Admin' &&
      t13.body?.data?.phone === '+251911998877' &&
      t13.body?.data?.organization === 'Sheba Tech Ecosystem',
    'Test 13: Valid multiple fields update returns 200 with updated data',
    t13.body
  );

  // Test 14: Valid empty string clearing -> 200
  const t14 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    { bio: '', phone: '', avatar_url: '' }
  );
  assert(
    t14.status === 200 &&
      (t14.body?.data?.bio === '' || t14.body?.data?.bio === null || t14.body?.data?.bio === undefined) &&
      (t14.body?.data?.phone === '' || t14.body?.data?.phone === null || t14.body?.data?.phone === undefined),
    'Test 14: Empty string clearing preserves behavior and clears fields properly',
    t14.body
  );

  // --- 4. VISIBILITY UPDATE (PATCH /api/users/me/visibility) ---

  // Test 15: Missing visibility in body -> 400
  const t15 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me/visibility',
      method: 'PATCH',
      headers: authHeaders,
    },
    {}
  );
  assert(
    t15.status === 400 && t15.body?.error === 'VALIDATION_ERROR',
    'Test 15: Missing visibility on PATCH /me/visibility returns 400 VALIDATION_ERROR',
    t15.body
  );

  // Test 16: Invalid visibility on /me/visibility -> 400
  const t16 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me/visibility',
      method: 'PATCH',
      headers: authHeaders,
    },
    { visibility: 'unlisted' }
  );
  assert(
    t16.status === 400 && t16.body?.error === 'VALIDATION_ERROR',
    'Test 16: Invalid visibility on /me/visibility returns 400 VALIDATION_ERROR',
    t16.body
  );

  // Test 17: Valid visibility update to private -> 200
  const t17 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me/visibility',
      method: 'PATCH',
      headers: authHeaders,
    },
    { visibility: 'private' }
  );
  assert(
    t17.status === 200 && t17.body?.data?.visibility === 'private',
    'Test 17: Valid visibility update to private succeeds',
    t17.body
  );

  // Restore visibility to public
  await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me/visibility',
      method: 'PATCH',
      headers: authHeaders,
    },
    { visibility: 'public' }
  );

  // --- 5. DATA EXPORT (GET /api/users/me/export) ---

  // Test 18: Invalid format -> 400
  const t18 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me/export?format=pdf',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t18.status === 400 && t18.body?.error === 'VALIDATION_ERROR',
    'Test 18: Invalid export format (pdf) returns 400 VALIDATION_ERROR',
    t18.body
  );

  // Test 19: Valid json format -> 200
  const t19 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me/export?format=json',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t19.status === 200 && t19.body?.data?.user && Array.isArray(t19.body?.data?.tickets),
    'Test 19: Valid export format json returns 200 with user data',
    t19.body
  );

  // Test 20: Valid csv format -> 200 with text/csv
  const t20 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me/export?format=csv',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t20.status === 200 && (t20.headers['content-type'] || '').includes('text/csv'),
    'Test 20: Valid export format csv returns 200 with text/csv content type',
    { status: t20.status, headers: t20.headers }
  );

  // Test 21: Omitted format (default) -> 200
  const t21 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me/export',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t21.status === 200 && t21.body?.data?.user,
    'Test 21: Omitted export format defaults to json and returns 200',
    t21.body
  );

  // --- 6. TICKETS & ATTENDANCE HISTORY ---

  // Test 22: GET /api/users/me/tickets -> 200
  const t22 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me/tickets',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t22.status === 200 && Array.isArray(t22.body?.data),
    'Test 22: GET /api/users/me/tickets returns 200 with tickets array',
    t22.body
  );

  // Test 23: GET /api/users/me/attendance -> 200
  const t23 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me/attendance',
    method: 'GET',
    headers: authHeaders,
  });
  assert(
    t23.status === 200 && Array.isArray(t23.body?.data),
    'Test 23: GET /api/users/me/attendance returns 200 with attendance array',
    t23.body
  );

  // --- 7. AUTHORIZATION & BUSINESS BEHAVIOR ---

  // Test 24: Unauthenticated request to /api/users/me -> 401
  const t24 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me',
    method: 'GET',
  });
  assert(
    t24.status === 401,
    'Test 24: Unauthenticated request to /api/users/me returns 401 (auth preserved)',
    t24.body
  );

  // Test 25: Unauthenticated request to /api/users/me/export -> 401
  const t25 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/me/export',
    method: 'GET',
  });
  assert(
    t25.status === 401,
    'Test 25: Unauthenticated request to /api/users/me/export returns 401 (auth preserved)',
    t25.body
  );

  // Test 26: Nonexistent public profile ID -> 404
  const t26 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/00000000-0000-0000-0000-000000000000/public',
    method: 'GET',
  });
  assert(
    t26.status === 404 && t26.body?.message?.includes('not found'),
    'Test 26: Nonexistent user ID reaches service and returns 404 (business rule preserved)',
    t26.body
  );

  console.log(`\n========================================`);
  console.log(`PHASE 7 USER / PROFILE TEST RESULTS: ${passed}/${total} PASSED`);
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
