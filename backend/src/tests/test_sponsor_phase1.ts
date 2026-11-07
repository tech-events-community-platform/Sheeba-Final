import assert from 'node:assert';
import { SponsorshipService } from '../services/sponsorship.service';
import { dealStatusEnum } from '../schemas/sponsorship.schema';
import sponsorshipRouter from '../routes/sponsorship.routes';

async function runSponsorPhase1Tests() {
  console.log('\n========================================================================');
  console.log('🏛️ SHEEBA SPONSOR ENGAGEMENT & DEAL PIPELINE (PHASE 1 TEST SUITE)');
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

  // 1. Zod Schema Enum Validation
  console.log('📦 1. Testing dealStatusEnum schema validation...');
  {
    const validStatuses = ['INTERESTED', 'DECLINED', 'DEAL_ACCEPTED', 'REJECTED', 'WITHDRAWN'];
    for (const status of validStatuses) {
      const parsed = dealStatusEnum.safeParse(status);
      assertTest(`dealStatusEnum accepts status: ${status}`, parsed.success);
    }

    const invalid = dealStatusEnum.safeParse('INVALID_STATUS');
    assertTest('dealStatusEnum rejects invalid status', !invalid.success);
  }

  // 2. Route Layer Verification
  console.log('\n🛡️ 2. Testing Route Layer Integration for Phase 1 endpoints...');
  {
    assertTest('sponsorshipRouter is defined', Boolean(sponsorshipRouter));

    // Inspect stack for mounted routes
    const routes = sponsorshipRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    const hasMySponsors = routes.some(
      (r: any) => r.path === '/organizer/my-sponsors' && r.methods.includes('get')
    );
    assertTest('GET /organizer/my-sponsors endpoint is mounted', hasMySponsors);

    const hasProfile = routes.some(
      (r: any) => r.path === '/sponsor-profile/:sponsorId' && r.methods.includes('get')
    );
    assertTest('GET /sponsor-profile/:sponsorId endpoint is mounted', hasProfile);

    const hasAcceptDeal = routes.some(
      (r: any) => r.path === '/deals/:id/accept' && r.methods.includes('patch')
    );
    assertTest('PATCH /deals/:id/accept endpoint is mounted', hasAcceptDeal);

    const hasRejectDeal = routes.some(
      (r: any) => r.path === '/deals/:id/reject' && r.methods.includes('patch')
    );
    assertTest('PATCH /deals/:id/reject endpoint is mounted', hasRejectDeal);

    const hasWithdrawDeal = routes.some(
      (r: any) => r.path === '/deals/:id/withdraw' && r.methods.includes('patch')
    );
    assertTest('PATCH /deals/:id/withdraw endpoint is mounted', hasWithdrawDeal);
  }

  // 3. Service Contract Verification
  console.log('\n⚙️ 3. Testing Service Contract & Methods Existence...');
  {
    assertTest(
      'SponsorshipService.getOrganizerMySponsors exists and is a function',
      typeof SponsorshipService.getOrganizerMySponsors === 'function'
    );
    assertTest(
      'SponsorshipService.getSponsorProfile exists and is a function',
      typeof SponsorshipService.getSponsorProfile === 'function'
    );
    assertTest(
      'SponsorshipService.acceptDeal exists and is a function',
      typeof SponsorshipService.acceptDeal === 'function'
    );
    assertTest(
      'SponsorshipService.rejectDeal exists and is a function',
      typeof SponsorshipService.rejectDeal === 'function'
    );
    assertTest(
      'SponsorshipService.withdrawDeal exists and is a function',
      typeof SponsorshipService.withdrawDeal === 'function'
    );
  }

  console.log('\n========================================================================');
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSponsorPhase1Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

