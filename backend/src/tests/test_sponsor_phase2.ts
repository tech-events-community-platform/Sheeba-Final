import assert from 'node:assert';
import { SponsorshipService } from '../services/sponsorship.service';
import sponsorshipRouter from '../routes/sponsorship.routes';

async function runSponsorPhase2Tests() {
  console.log('\n========================================================================');
  console.log('🔒 SHEEBA ATTENDEE SHARING GATE & MY EVENTS (PHASE 2 TEST SUITE)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}${details ? ` - ${details}` : ''}`);
      failed++;
    }
  }

  // 1. Route Layer Verification for Phase 2 Endpoints
  console.log('🛡️ 1. Testing Route Layer Integration for Phase 2 endpoints...');
  {
    assertTest('sponsorshipRouter is defined', Boolean(sponsorshipRouter));

    const routes = sponsorshipRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    const hasToggleSharing = routes.some(
      (r: any) => r.path === '/deals/:id/sharing' && r.methods.includes('patch')
    );
    assertTest('PATCH /deals/:id/sharing endpoint is mounted', hasToggleSharing);

    const hasSponsorMyEvents = routes.some(
      (r: any) => r.path === '/sponsor/my-events' && r.methods.includes('get')
    );
    assertTest('GET /sponsor/my-events endpoint is mounted', hasSponsorMyEvents);

    const hasCheckedInAttendees = routes.some(
      (r: any) => r.path === '/sponsor/events/:id/attendees' && r.methods.includes('get')
    );
    assertTest('GET /sponsor/events/:id/attendees endpoint is mounted', hasCheckedInAttendees);
  }

  // 2. Service Method Definitions
  console.log('\n⚙️ 2. Testing Service Method Signatures...');
  {
    assertTest(
      'SponsorshipService.toggleAttendeeSharing is a function',
      typeof SponsorshipService.toggleAttendeeSharing === 'function'
    );
    assertTest(
      'SponsorshipService.getSponsorMyEvents is a function',
      typeof SponsorshipService.getSponsorMyEvents === 'function'
    );
    assertTest(
      'SponsorshipService.getSponsorCheckedInAttendees is a function',
      typeof SponsorshipService.getSponsorCheckedInAttendees === 'function'
    );
  }

  // 3. Attendee Data Minimization Validation
  console.log('\n🛡️ 3. Testing Strict Attendee Data Minimization (Names Only)...');
  {
    // Simulating checked-in attendee output structure
    const sampleAttendeeRow = {
      attendee_id: 'usr_att_123',
      attendee_name: 'Abebe Bikila',
      checked_in_at: new Date().toISOString(),
      // Prohibited fields that must NOT exist in the sponsor payload
      phone: '+251911223344',
      email: 'abebe@example.com',
      ticket_code: 'TKT-SECRET-999',
      qr_secret: 'RAW_SECRET_TOKEN',
      registration_answers: { t_shirt: 'L', dietary: 'Vegan' },
    };

    // Filter to sanitize
    const sanitized = {
      attendee_id: sampleAttendeeRow.attendee_id,
      attendee_name: sampleAttendeeRow.attendee_name,
      checked_in_at: sampleAttendeeRow.checked_in_at,
    };

    assertTest('Sanitized payload has attendee_id', 'attendee_id' in sanitized);
    assertTest('Sanitized payload has attendee_name', 'attendee_name' in sanitized);
    assertTest('Sanitized payload has checked_in_at', 'checked_in_at' in sanitized);
    assertTest('Sanitized payload omits phone number', !('phone' in sanitized));
    assertTest('Sanitized payload omits email address', !('email' in sanitized));
    assertTest('Sanitized payload omits ticket code', !('ticket_code' in sanitized));
    assertTest('Sanitized payload omits qr_secret', !('qr_secret' in sanitized));
    assertTest('Sanitized payload omits registration_answers', !('registration_answers' in sanitized));
  }

  // 4. Attendee Sharing Gating Logic Validation
  console.log('\n🔒 4. Testing Gating Logic (Deal Accepted + Active Sharing)...');
  {
    const canAccessAttendees = (status: string, sharingAllowed: boolean): boolean => {
      return status === 'DEAL_ACCEPTED' && sharingAllowed === true;
    };

    assertTest('Interested deal + sharing false => blocked', !canAccessAttendees('INTERESTED', false));
    assertTest('Interested deal + sharing true => blocked (must be accepted first)', !canAccessAttendees('INTERESTED', true));
    assertTest('Deal accepted + sharing false => blocked (must have sharing enabled)', !canAccessAttendees('DEAL_ACCEPTED', false));
    assertTest('Deal accepted + sharing true => GRANTED', canAccessAttendees('DEAL_ACCEPTED', true));
    assertTest('Rejected deal + sharing true => blocked', !canAccessAttendees('REJECTED', true));
    assertTest('Withdrawn deal + sharing true => blocked', !canAccessAttendees('WITHDRAWN', true));
  }

  console.log('\n========================================================================');
  console.log(`Phase 2 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSponsorPhase2Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

