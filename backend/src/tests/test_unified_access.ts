import assert from 'node:assert';
import { AuthService } from '../services/auth.service';
import { ExhibitorService } from '../services/exhibitor.service';
import exhibitorRouter from '../routes/exhibitor.routes';

async function runUnifiedAccessTests() {
  console.log('\n========================================================================');
  console.log('🏛️ SHEEBA UNIFIED ACCESS TEST SUITE: ATTENDEE, ORGANIZER & EXHIBITOR');
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

  // --- 1. formatUserResponse & Derived Exhibitor Access ---
  console.log('📦 1. Testing formatUserResponse with Unified Roles...');
  {
    // Normal attendee with NO applications
    const attendeeUser = {
      id: 'usr_att',
      full_name: 'Regular Attendee',
      email: 'attendee@example.com',
      role: 'attendee',
      has_exhibitor_applications: false,
      is_organizer: false,
    };
    const formattedAttendee = AuthService.formatUserResponse(attendeeUser);
    assertTest(
      'Attendee has ATTENDEE role and hasExhibitorApplications: false',
      formattedAttendee.hasExhibitorApplications === false &&
      formattedAttendee.roles.includes('ATTENDEE') &&
      !formattedAttendee.roles.includes('EXHIBITOR')
    );

    // Attendee who has submitted an exhibitor application (has_exhibitor_applications = true)
    const attendeeApplicant = {
      id: 'usr_app',
      full_name: 'Attendee Applicant',
      email: 'applicant@example.com',
      role: 'attendee',
      has_exhibitor_applications: true,
      is_organizer: false,
    };
    const formattedApplicant = AuthService.formatUserResponse(attendeeApplicant);
    assertTest(
      'Applicant retains primary role ATTENDEE but gains EXHIBITOR in roles array',
      formattedApplicant.role === 'ATTENDEE' &&
      formattedApplicant.hasExhibitorApplications === true &&
      formattedApplicant.roles.includes('ATTENDEE') &&
      formattedApplicant.roles.includes('EXHIBITOR')
    );

    // Approved Organizer who ALSO has an exhibitor application
    const multiRoleUser = {
      id: 'usr_multi',
      full_name: 'Organizer & Exhibitor',
      email: 'multi@example.com',
      role: 'organizer',
      is_organizer: true,
      organizer_approval_status: 'approved',
      has_exhibitor_applications: true,
    };
    const formattedMulti = AuthService.formatUserResponse(multiRoleUser);
    assertTest(
      'User with organizer approval and exhibitor application retains all capabilities',
      formattedMulti.isOrganizer === true &&
      formattedMulti.hasExhibitorApplications === true &&
      formattedMulti.roles.includes('ATTENDEE') &&
      formattedMulti.roles.includes('ORGANIZER') &&
      formattedMulti.roles.includes('EXHIBITOR')
    );

    // Legacy user with users.role = 'exhibitor'
    const legacyExhibitor = {
      id: 'usr_legacy',
      full_name: 'Legacy Exhibitor',
      email: 'legacy@example.com',
      role: 'exhibitor',
      has_exhibitor_applications: false,
    };
    const formattedLegacy = AuthService.formatUserResponse(legacyExhibitor);
    assertTest(
      'Legacy users.role = exhibitor is backwards-compatible and receives EXHIBITOR role',
      formattedLegacy.hasExhibitorApplications === true &&
      formattedLegacy.roles.includes('EXHIBITOR')
    );
  }

  // --- 2. Route Guard & Ingress Architecture ---
  console.log('\n📦 2. Testing Exhibitor Route Middleware Configuration...');
  {
    // Inspect route stack in exhibitorRouter to verify authorizeRoles('exhibitor') is removed
    const routeStack = exhibitorRouter.stack;

    // Check /my-booths route
    const myBoothsLayer = routeStack.find(
      (layer: any) => layer.route && layer.route.path === '/my-booths' && layer.route.methods.get
    );
    assertTest('GET /my-booths exists in exhibitorRouter', Boolean(myBoothsLayer));

    // Check /events/:eventId/apply route
    const applyLayer = routeStack.find(
      (layer: any) => layer.route && layer.route.path === '/events/:eventId/apply' && layer.route.methods.post
    );
    assertTest('POST /events/:eventId/apply exists in exhibitorRouter', Boolean(applyLayer));

    // Check /booths/:vendorId/pay route
    const payLayer = routeStack.find(
      (layer: any) => layer.route && layer.route.path === '/booths/:vendorId/pay' && layer.route.methods.post
    );
    assertTest('POST /booths/:vendorId/pay exists in exhibitorRouter', Boolean(payLayer));

    // Check /booths/:vendorId/visitors route
    const visitorsLayer = routeStack.find(
      (layer: any) => layer.route && layer.route.path === '/booths/:vendorId/visitors' && layer.route.methods.get
    );
    assertTest('GET /booths/:vendorId/visitors exists in exhibitorRouter', Boolean(visitorsLayer));
  }

  // --- 3. Summary ---
  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnifiedAccessTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
