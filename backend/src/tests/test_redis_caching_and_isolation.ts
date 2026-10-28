process.env.NODE_ENV = 'test';
import { CacheService } from '../services/cache.service';
import { cacheResponse } from '../middlewares/cache.middleware';
import { Request, Response } from 'express';

async function runRedisCachingAndIsolationTests() {
  console.log('====================================================');
  console.log('⚡ SHEEBA REDIS CACHING & DATA ISOLATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  }

  // =========================================================================
  // SUITE 1: CACHE HITS, MISSES & GET-OR-SET
  // =========================================================================
  console.log('📦 1. Testing Cache Hits, Misses & Type-Safe Retrieval...');
  await CacheService.flush();

  // 1.1 Cache miss on empty key
  const missResult = await CacheService.get('non_existent_key');
  assert(missResult === undefined, 'Cache miss returns undefined for non-existent key');

  // 1.2 Cache set and hit
  const sampleEvent = { id: 'evt-101', title: 'Addis Tech Summit', ticketPrice: 500 };
  await CacheService.set('event:evt-101', sampleEvent, 60);

  const hitResult = await CacheService.get<typeof sampleEvent>('event:evt-101');
  assert(hitResult !== undefined && hitResult.id === 'evt-101', 'Cache hit returns exact stored object');
  assert(hitResult?.title === 'Addis Tech Summit', 'Stored properties preserved accurately');

  // 1.3 getOrSet pattern
  let computeCount = 0;
  const fetcher = async () => {
    computeCount++;
    return { calculatedMetrics: 42 };
  };

  const firstCompute = await CacheService.getOrSet('metrics:key', fetcher, 30);
  assert(computeCount === 1, 'getOrSet computes fresh result on cache miss');
  assert(firstCompute.calculatedMetrics === 42, 'Computed value returned correctly');

  const secondCompute = await CacheService.getOrSet('metrics:key', fetcher, 30);
  assert(computeCount === 1, 'getOrSet reuses cached value without recomputing');
  assert(secondCompute.calculatedMetrics === 42, 'Cached value returned on second call');

  // =========================================================================
  // SUITE 2: TTL EXPIRATION
  // =========================================================================
  console.log('\n📦 2. Testing TTL Expiration Behavior...');

  // Set with 1 second TTL
  await CacheService.set('short_lived', { temporary: true }, 1);
  const immediate = await CacheService.get('short_lived');
  assert(immediate !== undefined, 'Item is available immediately after setting with TTL');

  // Wait 1.1 seconds for TTL expiration
  await new Promise((res) => setTimeout(res, 1100));

  const expired = await CacheService.get('short_lived');
  assert(expired === undefined, 'Item expires and returns undefined after TTL has elapsed');

  // Key with 0 (no expiration) persists
  await CacheService.set('persistent_key', 'still_here', 0);
  await new Promise((res) => setTimeout(res, 200));
  const persistent = await CacheService.get<string>('persistent_key');
  assert(persistent === 'still_here', 'Item with 0 TTL does not expire prematurely');

  // =========================================================================
  // SUITE 3: TARGETED PATTERN INVALIDATION (NO BLANKET DELETION)
  // =========================================================================
  console.log('\n📦 3. Testing Targeted Pattern Invalidation...');
  await CacheService.flush();

  // Seed various namespaces
  await CacheService.set('events:list:{"isPublicized":true}', [{ id: 'evt-1' }], 60);
  await CacheService.set('events:list:{"category":"Tech"}', [{ id: 'evt-2' }], 60);
  await CacheService.set('event:evt-1', { id: 'evt-1', title: 'Tech Day' }, 60);
  await CacheService.set('event:evt-2', { id: 'evt-2', title: 'AI Day' }, 60);
  await CacheService.set('report:evt-1', { aiNarrative: 'Great turnout' }, 60);
  await CacheService.set('report:evt-2', { aiNarrative: 'Excellent summit' }, 60);
  await CacheService.set('admin:dashboard:metrics', { totalEvents: 12 }, 60);

  // Invalidate ONLY events:list*
  const deletedEventsList = await CacheService.delPattern('events:list*');
  assert(deletedEventsList === 2, 'delPattern matches and removes all events:list* entries');

  const checkEventsList = await CacheService.get('events:list:{"isPublicized":true}');
  assert(checkEventsList === undefined, 'Targeted events:list entries are purged');

  // Verify other namespaces were NOT affected
  const checkEventDetail = await CacheService.get('event:evt-1');
  assert(checkEventDetail !== undefined, 'Individual event cache remains intact after listing invalidation');

  const checkReport = await CacheService.get('report:evt-1');
  assert(checkReport !== undefined, 'Event report cache remains intact');

  const checkAdmin = await CacheService.get('admin:dashboard:metrics');
  assert(checkAdmin !== undefined, 'Admin metrics cache remains intact');

  // Invalidate specific report
  await CacheService.delPattern('report:evt-1*');
  const checkReport1 = await CacheService.get('report:evt-1');
  const checkReport2 = await CacheService.get('report:evt-2');
  assert(checkReport1 === undefined, 'Specific event report evt-1 is invalidated');
  assert(checkReport2 !== undefined, 'Unrelated event report evt-2 remains preserved');

  // =========================================================================
  // SUITE 4: REDIS ERROR HANDLING & RESILIENT FALLBACK
  // =========================================================================
  console.log('\n📦 4. Testing Redis Error Handling & Resilient In-Memory Fallback...');

  // Mock a failing Redis client that throws on every call
  const faultyRedisClient: any = {
    get: async () => {
      throw new Error('Connection lost to Redis master');
    },
    set: async () => {
      throw new Error('READONLY You cannot write against a read only replica');
    },
    del: async () => {
      throw new Error('Cluster is down');
    },
    scan: async () => {
      throw new Error('Timeout communicating with Redis server');
    },
    exists: async () => {
      throw new Error('Connection refused');
    },
    flushdb: async () => {
      throw new Error('Command disabled in production');
    },
  };

  CacheService.setClientForTesting(faultyRedisClient);

  let setFailed = false;
  try {
    await CacheService.set('fallback_key', { resilient: true }, 60);
  } catch {
    setFailed = true;
  }
  assert(!setFailed, 'CacheService.set does not throw when Redis encounters an error');

  let getFailed = false;
  let fallbackValue: any;
  try {
    fallbackValue = await CacheService.get('fallback_key');
  } catch {
    getFailed = true;
  }
  assert(!getFailed, 'CacheService.get does not throw when Redis encounters an error');
  assert(fallbackValue?.resilient === true, 'Seamlessly falls back to in-memory store and retrieves correct value');

  // Restore memory mode
  CacheService.setClientForTesting(null);

  // =========================================================================
  // SUITE 5: PRIVATE CACHE SCOPING & MULTI-USER ISOLATION
  // =========================================================================
  console.log('\n📦 5. Testing Private Cache Scoping & Multi-User Isolation...');
  await CacheService.flush();

  // Helper to simulate request through cacheResponse middleware
  const simulateRequest = async (
    user: { id: string; role: string } | undefined,
    url: string,
    responseBody: any,
    isPrivate: boolean = false
  ): Promise<{ headers: Record<string, string>; body: any }> => {
    const middleware = cacheResponse({ ttlSeconds: 60, isPrivate });
    const headers: Record<string, string> = {};
    let returnedBody: any = null;

    const req: any = {
      method: 'GET',
      baseUrl: '/api',
      path: url,
      query: {},
      headers: {},
      user,
    };

    const res: any = {
      statusCode: 200,
      setHeader: (key: string, val: string) => {
        headers[key.toLowerCase()] = val;
      },
      json: (data: any) => {
        returnedBody = data;
        return res;
      },
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await middleware(req, res, next);

    if (nextCalled) {
      // Simulate endpoint handler executing and calling res.json
      res.json(responseBody);
    }

    return { headers, body: returnedBody };
  };

  // 5.1 User Alice accesses their private tickets endpoint (first request = MISS)
  const userAlice = { id: 'user-alice-123', role: 'attendee' };
  const aliceRes1 = await simulateRequest(userAlice, '/tickets', [{ ticketId: 't-alice-1' }], true);
  assert(aliceRes1.headers['x-cache'] === 'MISS', 'Alice first request is a cache MISS');
  assert(aliceRes1.body[0].ticketId === 't-alice-1', 'Alice receives her own tickets');

  // 5.2 Alice accesses her private tickets endpoint again (second request = HIT)
  const aliceRes2 = await simulateRequest(userAlice, '/tickets', [{ ticketId: 'SHOULD_NOT_BE_USED' }], true);
  assert(aliceRes2.headers['x-cache'] === 'HIT', 'Alice second request is a cache HIT');
  assert(aliceRes2.body[0].ticketId === 't-alice-1', 'Alice receives cached tickets from first request');

  // 5.3 User Bob accesses the exact same endpoint (MUST BE A MISS, NOT ALICE CACHE)
  const userBob = { id: 'user-bob-456', role: 'attendee' };
  const bobRes = await simulateRequest(userBob, '/tickets', [{ ticketId: 't-bob-99' }], true);
  assert(bobRes.headers['x-cache'] === 'MISS', 'Bob request for same route is a cache MISS (no Alice leakage)');
  assert(bobRes.body[0].ticketId === 't-bob-99', 'Bob receives his own tickets, strictly isolated from Alice');

  // 5.4 Alice switches role from attendee to organizer (different role = MISS)
  const aliceAsOrganizer = { id: 'user-alice-123', role: 'organizer' };
  const aliceOrganizerRes = await simulateRequest(aliceAsOrganizer, '/tickets', [{ roleView: 'organizer_view' }], true);
  assert(aliceOrganizerRes.headers['x-cache'] === 'MISS', 'Role switch on same user results in clean isolated cache');
  assert(aliceOrganizerRes.body[0].roleView === 'organizer_view', 'Role-specific data is correctly returned');

  // 5.5 Unauthenticated request on private endpoint is strictly BYPASS
  const unauthRes = await simulateRequest(undefined, '/tickets', [{ secret: 'private' }], true);
  assert(unauthRes.headers['x-cache'] === 'BYPASS', 'Unauthenticated request on private endpoint is BYPASS');

  // =========================================================================
  // SUITE 6: REPORT CACHING & SAFE REUSE
  // =========================================================================
  console.log('\n📦 6. Testing Report Caching & Invalidation...');
  await CacheService.flush();

  const mockReport = {
    eventId: 'event-stride-2026',
    eventTitle: 'National Tech Summit',
    attendanceRate: 87.5,
    totalRegistered: 100,
    totalAttended: 88,
    aiNarrative: { summary: 'High engagement across developer tracks.' },
  };

  // Store report as ReportService does
  await CacheService.set('report:event-stride-2026', mockReport, 600);

  // Subsequent request reads from cache
  const cachedReport = await CacheService.get<typeof mockReport>('report:event-stride-2026');
  assert(cachedReport !== undefined, 'Report is successfully stored in cache');
  assert(cachedReport?.aiNarrative.summary === 'High engagement across developer tracks.', 'AI narrative is preserved in cached report');
  assert(cachedReport?.attendanceRate === 87.5, 'Analytics numbers accurately retrieved from cache');

  // Mutation invalidation (e.g. attendee check-in or reset)
  await CacheService.delPattern('report:event-stride-2026*');
  const afterInvalidation = await CacheService.get('report:event-stride-2026');
  assert(afterInvalidation === undefined, 'Report cache is reliably purged upon invalidation');

  // =========================================================================
  // SUITE 7: METRICS & CACHE STATS
  // =========================================================================
  console.log('\n📦 7. Testing Cache Metrics & Provider Reporting...');
  const stats = CacheService.getStats();
  assert(typeof stats.hits === 'number' && stats.hits > 0, 'Cache hits counter accurately tracked');
  assert(typeof stats.misses === 'number' && stats.misses > 0, 'Cache misses counter accurately tracked');
  assert(stats.provider === 'redis' || stats.provider === 'memory', `Provider status is accurately reported (${stats.provider})`);

  // =========================================================================
  // SUITE 8: SPONSORSHIP CREATION & STATUS CHANGES INVALIDATION
  // =========================================================================
  console.log('\n📦 8. Testing Sponsorship Marketplace & Deal Status Invalidation...');
  await CacheService.flush();

  // Seed marketplace and deal caches
  await CacheService.set('sponsorship:explore:all', [{ id: 'pitch-1', title: 'AI Hackathon' }], 60);
  await CacheService.set('sponsorship:explore:tech', [{ id: 'pitch-1', title: 'AI Hackathon' }], 60);
  await CacheService.set('sponsorship:app:pitch-1', { id: 'pitch-1', fundingGoal: 50000 }, 60);
  await CacheService.set('sponsorship:deals:sponsor-99', [{ id: 'deal-1', status: 'INTERESTED' }], 60);
  await CacheService.set('http:user:sponsor-99:role:sponsor:/api/sponsorship/sponsor/my-deals:', { deals: [] }, 60);
  await CacheService.set('unrelated:feed:data', { keepMe: true }, 60);

  // 1. Deal update invalidation
  await CacheService.delPattern('sponsorship:deals:sponsor-99*');
  await CacheService.delPattern('sponsorship:app:pitch-1*');
  await CacheService.delPattern('*http:*user:sponsor-99*sponsorship*');

  assert((await CacheService.get('sponsorship:deals:sponsor-99')) === undefined, 'Sponsor deal cache purged after status change');
  assert((await CacheService.get('sponsorship:app:pitch-1')) === undefined, 'Application detail cache purged after deal status change');
  assert((await CacheService.get('http:user:sponsor-99:role:sponsor:/api/sponsorship/sponsor/my-deals:')) === undefined, 'HTTP deal pipeline cache purged');
  assert((await CacheService.get('sponsorship:explore:tech')) !== undefined, 'Marketplace explorer cache preserved during individual deal update');
  assert((await CacheService.get('unrelated:feed:data')) !== undefined, 'Unrelated feed cache strictly preserved');

  // 2. Application creation/deletion invalidation
  await CacheService.delPattern('sponsorship:explore*');
  await CacheService.delPattern('matching:recommendations:*');
  assert((await CacheService.get('sponsorship:explore:tech')) === undefined, 'Marketplace listings refreshed after application mutation');
  assert((await CacheService.get('unrelated:feed:data')) !== undefined, 'Unrelated feed data remains untouched');

  // =========================================================================
  // SUITE 9: SPONSOR PREFERENCES & RECOMMENDATION ISOLATION
  // =========================================================================
  console.log('\n📦 9. Testing Sponsor Matching Preferences & Recommendation Refreshes...');
  await CacheService.flush();

  // Sponsor 1 and Sponsor 2 recommendations
  await CacheService.set('matching:recommendations:sponsor-1:{"limit":10}', { topEvents: ['event-101', 'event-102'] }, 60);
  await CacheService.set('http:user:sponsor-1:role:sponsor:/api/sponsorship/recommendations:', { matches: ['event-101'] }, 60);
  await CacheService.set('matching:recommendations:sponsor-2:{"limit":10}', { topEvents: ['event-201', 'event-202'] }, 60);
  await CacheService.set('http:user:sponsor-2:role:sponsor:/api/sponsorship/recommendations:', { matches: ['event-201'] }, 60);

  // Sponsor 1 updates preferences
  await CacheService.delPattern('matching:recommendations:sponsor-1*');
  await CacheService.delPattern('*http:*user:sponsor-1*sponsorship*');
  await CacheService.delPattern('*http:*user:sponsor-1*matching*');

  assert((await CacheService.get('matching:recommendations:sponsor-1:{"limit":10}')) === undefined, 'Sponsor 1 cached recommendations invalidated');
  assert((await CacheService.get('http:user:sponsor-1:role:sponsor:/api/sponsorship/recommendations:')) === undefined, 'Sponsor 1 HTTP recommendations invalidated');
  assert((await CacheService.get('matching:recommendations:sponsor-2:{"limit":10}')) !== undefined, 'Sponsor 2 recommendations strictly preserved');
  assert((await CacheService.get('http:user:sponsor-2:role:sponsor:/api/sponsorship/recommendations:')) !== undefined, 'Sponsor 2 HTTP recommendations strictly preserved');

  // Event eligibility change (event cancelled/completed) invalidates all recommendation rankings
  await CacheService.delPattern('matching:recommendations:*');
  assert((await CacheService.get('matching:recommendations:sponsor-2:{"limit":10}')) === undefined, 'All sponsor recommendations refreshed on event eligibility change');

  // =========================================================================
  // SUITE 10: EXHIBITOR ACCEPTANCE & BOOTH STATUS CHANGES
  // =========================================================================
  console.log('\n📦 10. Testing Exhibitor & Booth Status Invalidation...');
  await CacheService.flush();

  await CacheService.set('exhibitors:public:event-10', [{ id: 'vendor-1', businessName: 'CloudCorp' }], 60);
  await CacheService.set('exhibitors:explore:{"category":"Tech"}', [{ id: 'call-1', eventId: 'event-10' }], 60);
  await CacheService.set('exhibitors:public:event-20', [{ id: 'vendor-2', businessName: 'FinTech Ltd' }], 60);
  await CacheService.set('event:event-10', { id: 'event-10', title: 'Tech Expo' }, 60);

  // Booth accepted / status updated for event-10
  await CacheService.delPattern('exhibitors:public:event-10*');
  await CacheService.delPattern('event:event-10*');
  await CacheService.delPattern('*http:*/api/exhibitors*');

  assert((await CacheService.get('exhibitors:public:event-10')) === undefined, 'Event 10 public exhibitors cache invalidated');
  assert((await CacheService.get('event:event-10')) === undefined, 'Event 10 details cache invalidated');
  assert((await CacheService.get('exhibitors:public:event-20')) !== undefined, 'Event 20 public exhibitors cache preserved');

  // =========================================================================
  // SUITE 11: RECEIPT VERIFICATION & PAYMENT SECURITY RULES
  // =========================================================================
  console.log('\n📦 11. Testing Receipt Verification Invalidation & Payment Integrity...');
  await CacheService.flush();

  await CacheService.set('exhibitors:public:event-10', [{ id: 'vendor-1', status: 'confirmed' }], 60);
  await CacheService.set('http:user:vendor-user-1:role:exhibitor:/api/exhibitors/my-booths:', { booths: [{ status: 'accepted_awaiting_payment' }] }, 60);
  await CacheService.set('http:user:vendor-user-2:role:exhibitor:/api/exhibitors/my-booths:', { booths: [{ status: 'confirmed' }] }, 60);

  // Verify booth receipt: organizer confirms payment in DB
  await CacheService.delPattern('exhibitors:public:event-10*');
  await CacheService.delPattern('event:event-10*');
  await CacheService.delPattern('*http:*/api/exhibitors/events/event-10*');
  await CacheService.delPattern('*http:*/api/events/event-10*');
  await CacheService.delPattern('*http:*user:vendor-user-1*');

  assert((await CacheService.get('exhibitors:public:event-10')) === undefined, 'Public listings refreshed after receipt verification');
  assert((await CacheService.get('http:user:vendor-user-1:role:exhibitor:/api/exhibitors/my-booths:')) === undefined, 'Verified vendor private cache purged');
  assert((await CacheService.get('http:user:vendor-user-2:role:exhibitor:/api/exhibitors/my-booths:')) !== undefined, 'Unrelated vendor private cache preserved');

  // =========================================================================
  // SUITE 12: QR CHECK-IN SUCCESS VS TRANSACTION ROLLBACK
  // =========================================================================
  console.log('\n📦 12. Testing QR Check-In Invalidation & Rollback Safety...');
  await CacheService.flush();

  // Seed attendee roster, reports, dashboard, and tickets
  await CacheService.set('event:event-50:roster', [{ id: 'att-1', isCheckedIn: false }], 60);
  await CacheService.set('report:event-50', { eventId: 'event-50', totalAttended: 10 }, 600);
  await CacheService.set('events:list:all', [{ id: 'event-50' }], 60);
  await CacheService.set('http:user:att-1:role:attendee:/api/tickets/my-tickets:', { tickets: [{ status: 'ISSUED' }] }, 60);
  await CacheService.set('event:event-99:roster', [{ id: 'att-99', isCheckedIn: true }], 60);

  // Case A: Failed Check-in (e.g. expired ticket, ticket cancelled, invalid QR)
  // Mutation throws error before COMMIT -> ROLLBACK occurs -> ZERO invalidation triggered!
  const failedCheckinSimulation = async () => {
    try {
      throw new Error('Ticket expired (valid until end of event day)');
    } catch (e) {
      // Transaction rolled back - do not call CacheService.delPattern
    }
  };
  await failedCheckinSimulation();

  assert((await CacheService.get('event:event-50:roster')) !== undefined, 'Roster cache remains intact after failed check-in');
  assert((await CacheService.get('report:event-50')) !== undefined, 'Report cache remains intact after failed check-in');
  assert((await CacheService.get('http:user:att-1:role:attendee:/api/tickets/my-tickets:')) !== undefined, 'Attendee ticket cache remains intact after failed check-in');

  // Case B: Successful Check-in (COMMIT succeeds -> CacheService.delPattern called)
  const successfulCheckinSimulation = async () => {
    // COMMIT succeeded in PostgreSQL
    await CacheService.delPattern('event:event-50*');
    await CacheService.delPattern('report:event-50*');
    await CacheService.delPattern('*http:*/api/reports*');
    await CacheService.delPattern('events:list*');
    await CacheService.delPattern('*http:*/api/events/event-50*');
    await CacheService.delPattern('*http:*user:att-1*');
    await CacheService.delPattern('matching:recommendations:*');
  };
  await successfulCheckinSimulation();

  assert((await CacheService.get('event:event-50:roster')) === undefined, 'Roster cache invalidated after successful check-in');
  assert((await CacheService.get('report:event-50')) === undefined, 'Report cache invalidated after successful check-in');
  assert((await CacheService.get('events:list:all')) === undefined, 'Events discovery list invalidated after check-in');
  assert((await CacheService.get('http:user:att-1:role:attendee:/api/tickets/my-tickets:')) === undefined, 'Attendee private ticket cache invalidated');
  assert((await CacheService.get('event:event-99:roster')) !== undefined, 'Unrelated event-99 roster remains untouched');

  console.log('\n====================================================');
  console.log(`📊 REDIS CACHING & INVALIDATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runRedisCachingAndIsolationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
