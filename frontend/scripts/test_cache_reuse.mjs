/**
 * Frontend Cache & Navigation Data Reuse Verification Test
 */

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
    failed++;
  }
}

// Mock localStorage and window for Node environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

globalThis.window = {
  location: {
    hostname: 'localhost',
    protocol: 'http:',
  },
};

// Track mock fetch calls
let fetchCalls = [];
let mockFetchDelay = 10;
let mockResponseData = { data: [{ id: 'evt-1', title: 'Tech Meetup' }] };

globalThis.fetch = async (url, options = {}) => {
  const record = { url, options, timestamp: Date.now() };
  fetchCalls.push(record);

  if (mockFetchDelay > 0) {
    await new Promise((r) => setTimeout(r, mockFetchDelay));
  }

  return {
    ok: true,
    status: 200,
    headers: {
      get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => mockResponseData,
  };
};

async function runTests() {
  console.log('====================================================');
  console.log('⚡ SHEEBA FRONTEND CACHE & DATA REUSE TEST SUITE');
  console.log('====================================================\n');

  // Import api module dynamically
  const {
    requestApi,
    clearApiCache,
    setAuthToken,
    removeAuthToken,
    getDefaultTtlForEndpoint,
    getClientApiCacheStats,
  } = await import('../src/services/api.ts');

  // =========================================================================
  // TEST 1: Default TTL Freshness Periods
  // =========================================================================
  console.log('📦 1. Testing Default Freshness TTL Configurations...');
  assert(getDefaultTtlForEndpoint('/events') === 60, 'Public events discovery default TTL is 60s');
  assert(getDefaultTtlForEndpoint('/events/share/token123') === 60, 'Share token event detail default TTL is 60s');
  assert(getDefaultTtlForEndpoint('/exhibitors/public') === 60, 'Public exhibitors default TTL is 60s');
  assert(getDefaultTtlForEndpoint('/sponsorships/explore') === 60, 'Public sponsor marketplace default TTL is 60s');
  assert(getDefaultTtlForEndpoint('/events/evt-1/roster') === 25, 'Organizer event roster default TTL is 25s');
  assert(getDefaultTtlForEndpoint('/admin/dashboard') === 30, 'Admin dashboard default TTL is 30s');
  assert(getDefaultTtlForEndpoint('/tickets') === 30, 'Attendee tickets default TTL is 30s');
  assert(getDefaultTtlForEndpoint('/reports/events/evt-1') === 120, 'Heavy AI reports default TTL is 120s (2 mins)');

  // =========================================================================
  // TEST 2: Data Reuse on Page Navigation (Cache Hits vs Misses)
  // =========================================================================
  console.log('\n📦 2. Testing API Data Reuse Across Navigation...');
  clearApiCache();
  fetchCalls = [];

  // Step 1: User navigates to Landing Page (first visit = Network Fetch)
  const firstVisit = await requestApi('/events?isPublicized=true');
  assert(fetchCalls.length === 1, 'First navigation visit triggers 1 network fetch');
  assert(firstVisit.data[0].id === 'evt-1', 'Correct event data returned');

  // Step 2: User navigates away to another page and returns (Second visit = Cache Reuse!)
  const secondVisit = await requestApi('/events?isPublicized=true');
  assert(fetchCalls.length === 1, 'Navigating back reuses valid cached data without duplicate network fetch');
  assert(secondVisit.data[0].id === 'evt-1', 'Instant cached response matches original data');

  // =========================================================================
  // TEST 3: Concurrent Request Deduplication
  // =========================================================================
  console.log('\n📦 3. Testing Concurrent Request Deduplication...');
  clearApiCache();
  fetchCalls = [];
  mockFetchDelay = 50; // Give in-flight promise time to be shared

  // Two sibling components mount simultaneously requesting the same endpoint
  const [compA, compB] = await Promise.all([
    requestApi('/events/evt-detail'),
    requestApi('/events/evt-detail'),
  ]);

  assert(fetchCalls.length === 1, 'Concurrent requests to identical endpoint produce only 1 network fetch');
  assert(compA.data[0].id === 'evt-1' && compB.data[0].id === 'evt-1', 'Both components receive data cleanly');

  mockFetchDelay = 5;

  // =========================================================================
  // TEST 4: TTL Expiration and Refresh
  // =========================================================================
  console.log('\n📦 4. Testing TTL Expiration and Refresh...');
  clearApiCache();
  fetchCalls = [];

  // Fetch with short TTL (1 second)
  await requestApi('/events/temporary', { ttlSeconds: 1 });
  assert(fetchCalls.length === 1, 'Initial request executes fetch');

  // Immediate second call should be cached
  await requestApi('/events/temporary', { ttlSeconds: 1 });
  assert(fetchCalls.length === 1, 'Call before expiration is served from cache');

  // Wait 1.1s for TTL expiry
  await new Promise((r) => setTimeout(r, 1100));

  // Call after expiration should execute a new fetch
  await requestApi('/events/temporary', { ttlSeconds: 1 });
  assert(fetchCalls.length === 2, 'Expired cache entry triggers a fresh network refresh');

  // =========================================================================
  // TEST 5: Entity-Based Targeted Invalidation
  // =========================================================================
  console.log('\n📦 5. Testing Entity-Based Mutation Invalidation...');
  clearApiCache();
  fetchCalls = [];

  // Seed cache with events, tickets, and admin data
  await requestApi('/events');
  await requestApi('/tickets');
  await requestApi('/admin/dashboard');

  let stats = getClientApiCacheStats();
  assert(stats.size === 3, 'All 3 entities are stored in client cache');

  // Execute a mutation on an event (e.g. POST /events/evt-1/register)
  await requestApi('/events/evt-1/register', {
    method: 'POST',
    body: JSON.stringify({ ticketTier: 'general' }),
  });

  stats = getClientApiCacheStats();
  const hasEvents = stats.keys.some((k) => k.includes('/events'));
  const hasTickets = stats.keys.some((k) => k.includes('/tickets'));
  const hasAdmin = stats.keys.some((k) => k.includes('/admin'));

  assert(!hasEvents, 'Events cache is invalidated after event mutation');
  assert(hasTickets, 'Tickets cache remains preserved (not wiped)');
  assert(hasAdmin, 'Admin cache remains preserved (not wiped)');

  // =========================================================================
  // TEST 6: Account and Role Switching Isolation
  // =========================================================================
  console.log('\n📦 6. Testing Account and Role Switching Isolation...');
  clearApiCache();

  // User Alice logs in
  setAuthToken('token-alice-123');
  await requestApi('/tickets');

  stats = getClientApiCacheStats();
  assert(stats.keys.some((k) => k.includes('token-alice-123')), 'Cache key is strictly scoped to Alice token');

  // User Alice logs out
  removeAuthToken();
  stats = getClientApiCacheStats();
  assert(stats.size === 0, 'Client cache is fully emptied on logout (no lingering private data)');

  // User Bob logs in
  setAuthToken('token-bob-456');
  await requestApi('/tickets');
  stats = getClientApiCacheStats();
  assert(stats.keys.some((k) => k.includes('token-bob-456')), 'Bob tickets are cached under Bob token');
  assert(!stats.keys.some((k) => k.includes('token-alice-123')), 'Alice data is nowhere in cache');

  console.log('\n====================================================');
  console.log(`📊 FRONTEND CACHE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
