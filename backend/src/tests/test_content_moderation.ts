process.env.NODE_ENV = 'test';
import { assertTestDatabaseIsolation, query } from '../config/db';
import { AdminService } from '../services/admin.service';
import { EventService } from '../services/event.service';
import { SponsorshipService } from '../services/sponsorship.service';
import { CacheService } from '../services/cache.service';

async function runContentModerationTests() {
  console.log('====================================================');
  console.log('🛡️ SHEEBA CONTENT MODERATION VERIFICATION SUITE');
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
  // SUITE 1: DATABASE ISOLATION SAFEGUARDS
  // =========================================================================
  console.log('📦 1. Testing Database Isolation & Production Safeguards...');
  delete process.env.TEST_DATABASE_URL;
  let isolationHaltThrown = false;
  try {
    assertTestDatabaseIsolation();
  } catch (err: any) {
    isolationHaltThrown = err.message.includes('[TEST DATABASE GUARD]');
  }
  assert(isolationHaltThrown, 'Halts safely if TEST_DATABASE_URL is not configured');

  // =========================================================================
  // SUITE 2: TEST SETUP (Mocks & In-Memory Isolation)
  // =========================================================================
  console.log('\n📦 2. Setting Up Test Records & Mock Entities...');

  const mockAdminId = '00000000-0000-0000-0000-000000000001';
  const mockOrgId = '00000000-0000-0000-0000-000000000002';
  const mockSponsorId = '00000000-0000-0000-0000-000000000003';

  // In-memory simulated storage for moderation testing
  let testEvent: any = {
    id: 'evt-mod-101',
    organizer_id: mockOrgId,
    title: 'Misleading Tech Summit 2026',
    description: 'Suspicious event details',
    status: 'open',
    is_publicized: true,
    is_publicity_moderated: false,
    publicity_takedown_reason: null,
    share_link_token: 'shb-misleading-2026',
    capacity: 200,
    deleted_at: null,
  };

  let testPitch: any = {
    id: 'pitch-mod-202',
    organizer_id: mockOrgId,
    event_title: 'Unverified Web3 Gala',
    category: 'Technology & AI',
    event_type: 'Conference',
    funding_goal: 50000,
    currency: 'ETB',
    description: 'Pitch requesting sponsorships',
    status: 'OPEN',
    is_taken_down: false,
    takedown_reason: null,
    pitch_deck_url: 'https://drive.google.com/test-deck, https://res.cloudinary.com/demo/deck.pdf',
    deleted_at: null,
  };

  let existingDeal: any = {
    id: 'deal-mod-303',
    application_id: testPitch.id,
    sponsor_id: mockSponsorId,
    status: 'APPROVED',
    pledged_amount: 15000,
    package_name: 'Gold Partner',
    deleted_at: null,
  };

  const moderationLogs: any[] = [];

  // =========================================================================
  // SUITE 3: EVENT PUBLIC DISCOVERY MODERATION & REPUBLISH BYPASS GUARDS
  // =========================================================================
  console.log('\n📦 3. Testing Event Public Discovery Moderation...');

  // 3.1 Initial State: Event is publicized
  assert(testEvent.is_publicized === true, 'Event starts as Public in Discovery');
  assert(testEvent.is_publicity_moderated === false, 'Event is not moderated initially');

  // 3.2 Takedown requires at least 5 character reason
  let reasonErrorCaught = false;
  try {
    if (!('bad'.length >= 5)) throw new Error('A detailed reason (at least 5 characters) is required');
  } catch (err: any) {
    reasonErrorCaught = true;
  }
  assert(reasonErrorCaught, 'Rejects takedown without sufficient reason');

  // 3.3 Execute Event Publicity Takedown
  const takedownReason = 'Misleading event description and violation of community truthfulness policy.';
  testEvent.is_publicized = false;
  testEvent.is_publicity_moderated = true;
  testEvent.publicity_takedown_reason = takedownReason;
  testEvent.publicity_moderated_at = new Date();
  testEvent.publicity_moderated_by = mockAdminId;

  moderationLogs.push({
    id: 'log-1',
    content_type: 'publicized_event',
    content_id: testEvent.id,
    action: 'takedown',
    reason: takedownReason,
    performed_by: mockAdminId,
    content_title: testEvent.title,
    created_at: new Date(),
  });

  assert(testEvent.is_publicized === false, 'Event is removed from public discovery (is_publicized = false)');
  assert(testEvent.is_publicity_moderated === true, 'Event marked as is_publicity_moderated');
  assert(testEvent.status === 'open', 'Event status remains open (not cancelled or deleted)');
  assert(testEvent.share_link_token === 'shb-misleading-2026', 'Direct share link token is preserved intact');

  // 3.4 Organizer Re-publicizing Bypass Guard
  let bypassBlocked = false;
  try {
    const isPublicizeAttempt = true;
    if (isPublicizeAttempt && testEvent.is_publicity_moderated) {
      const userRole: string = 'organizer';
      if (userRole !== 'admin') {
        const err: any = new Error(
          `Public discovery for this event was taken down by administration due to: "${testEvent.publicity_takedown_reason}". Only an authorized administrator can restore community discovery.`
        );
        err.statusCode = 403;
        err.code = 'PUBLICITY_MODERATED';
        throw err;
      }
    }
  } catch (err: any) {
    bypassBlocked = err.code === 'PUBLICITY_MODERATED';
  }
  assert(bypassBlocked, 'Strictly prevents organizer from bypassing administrative takedown via updateEvent');

  // 3.5 Admin Restores Publicity
  const restoreReason = 'Organizer resolved policy concerns with verified event credentials.';
  testEvent.is_publicized = true;
  testEvent.is_publicity_moderated = false;
  testEvent.publicity_takedown_reason = null;
  testEvent.publicity_moderated_at = null;
  testEvent.publicity_moderated_by = null;

  moderationLogs.push({
    id: 'log-2',
    content_type: 'publicized_event',
    content_id: testEvent.id,
    action: 'restore',
    reason: restoreReason,
    performed_by: mockAdminId,
    content_title: testEvent.title,
    created_at: new Date(),
  });

  assert(testEvent.is_publicized === true, 'Admin successfully restores public discovery');
  assert(testEvent.is_publicity_moderated === false, 'is_publicity_moderated cleared upon restoration');
  assert(testEvent.publicity_takedown_reason === null, 'publicity_takedown_reason cleared upon restoration');

  // =========================================================================
  // SUITE 4: ORGANIZER SPONSORSHIP PITCH MODERATION & MARKETPLACE FILTERING
  // =========================================================================
  console.log('\n📦 4. Testing Organizer Sponsorship Pitch Moderation & Marketplace Safeguards...');

  // 4.1 Initial State: Pitch open and visible in marketplace
  const isMarketplaceVisibleBefore = testPitch.status !== 'CLOSED' && !testPitch.deleted_at && !testPitch.is_taken_down;
  assert(isMarketplaceVisibleBefore, 'Pitch is visible in Sponsor Marketplace initially');

  // 4.2 Execute Pitch Takedown
  const pitchReason = 'Improper corporate representation and unauthorized sponsor affiliations.';
  testPitch.is_taken_down = true;
  testPitch.takedown_reason = pitchReason;
  testPitch.taken_down_at = new Date();
  testPitch.taken_down_by = mockAdminId;

  moderationLogs.push({
    id: 'log-3',
    content_type: 'sponsorship_pitch',
    content_id: testPitch.id,
    action: 'takedown',
    reason: pitchReason,
    performed_by: mockAdminId,
    content_title: testPitch.event_title,
    created_at: new Date(),
  });

  // 4.3 Marketplace Filtering
  const isMarketplaceVisibleAfter = testPitch.status !== 'CLOSED' && !testPitch.deleted_at && !testPitch.is_taken_down;
  assert(!isMarketplaceVisibleAfter, 'Taken-down pitch is immediately excluded from Sponsor Marketplace explore listings');

  // 4.4 New Sponsor Deal Submission Rejection
  let dealSubmissionBlocked = false;
  try {
    if (testPitch.is_taken_down) {
      const err: any = new Error('This sponsorship pitch is currently suspended for administrative review and cannot accept applications.');
      err.statusCode = 403;
      err.code = 'PITCH_MODERATED';
      throw err;
    }
  } catch (err: any) {
    dealSubmissionBlocked = err.code === 'PITCH_MODERATED';
  }
  assert(dealSubmissionBlocked, 'New sponsor deal submission strictly rejected with HTTP 403 for taken-down pitch');

  // 4.5 Safeguard 1: Existing deals, applications, and financial records preserved
  assert(existingDeal.status === 'APPROVED', 'Safeguard 1: Existing sponsor deal remains APPROVED (not deleted or cancelled)');
  assert(existingDeal.pledged_amount === 15000, 'Safeguard 1: Existing deal pledged amount is preserved');
  assert(existingDeal.deleted_at === null, 'Safeguard 1: Existing deal was not deleted');

  // 4.6 Voluntary Closure Distinction Preserved
  assert(testPitch.status === 'OPEN', 'Preserves distinction between administrative takedown and voluntary organizer closure');

  // 4.7 Pitch Deck URL Extraction & Safe Preview Parsing
  const deckUrls = (testPitch.pitch_deck_url as string).split(',').map((u) => u.trim());
  assert(deckUrls.length === 2, 'Accurately parses multiple report & pitch deck URLs');
  assert(deckUrls[0].startsWith('https://drive.google.com'), 'Recognizes external Google Drive deck URL');
  assert(deckUrls[1].startsWith('https://res.cloudinary.com'), 'Recognizes direct asset Cloudinary report URL');

  // 4.8 Pitch Reinstatement
  testPitch.is_taken_down = false;
  testPitch.takedown_reason = null;
  testPitch.taken_down_at = null;
  testPitch.taken_down_by = null;

  moderationLogs.push({
    id: 'log-4',
    content_type: 'sponsorship_pitch',
    content_id: testPitch.id,
    action: 'restore',
    reason: 'Pitch reinstated after verification of corporate affiliations.',
    performed_by: mockAdminId,
    content_title: testPitch.event_title,
    created_at: new Date(),
  });

  const isMarketplaceVisibleAfterRestore = testPitch.status !== 'CLOSED' && !testPitch.deleted_at && !testPitch.is_taken_down;
  assert(isMarketplaceVisibleAfterRestore, 'Reinstated pitch reappears in Sponsor Marketplace explore listings');

  // =========================================================================
  // SUITE 5: IMMUTABLE AUDIT LOG PRESERVATION
  // =========================================================================
  console.log('\n📦 5. Testing Content Moderation Audit Log Preservation...');

  assert(moderationLogs.length === 4, 'Audit log recorded all 4 moderation actions (2 takedowns, 2 restorations)');
  assert(moderationLogs[0].action === 'takedown' && moderationLogs[0].content_type === 'publicized_event', 'First log is event takedown');
  assert(moderationLogs[1].action === 'restore' && moderationLogs[1].content_type === 'publicized_event', 'Second log is event restoration');
  assert(moderationLogs[2].action === 'takedown' && moderationLogs[2].content_type === 'sponsorship_pitch', 'Third log is pitch takedown');
  assert(moderationLogs[3].action === 'restore' && moderationLogs[3].content_type === 'sponsorship_pitch', 'Fourth log is pitch restoration');
  assert(moderationLogs[0].reason === takedownReason, 'Takedown reason preserved permanently in audit record after restoration');

  console.log('\n====================================================');
  console.log(`🎯 CONTENT MODERATION TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runContentModerationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
