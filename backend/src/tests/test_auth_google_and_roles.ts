import { googleAuthSchema } from '../schemas/auth.schema';
import { authorizeRoles } from '../middlewares/role.middleware';
import { query } from '../config/db';
import { signAuthToken } from '../utils/jwt.util';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { AuthRequest } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, detail || '');
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 SHEBA - TARGETED AUTH & ORGANIZER AUTHORIZATION TESTS');
  console.log('====================================================\n');

  // --- SUITE 1: googleAuthSchema Validation & Mode Handling ---
  console.log('📦 1. Testing googleAuthSchema mode standardization & validation...');

  // 1.1 Mode 'register'
  const registerResult = googleAuthSchema.safeParse({
    credential: 'mock-google-token-123',
    role: 'ATTENDEE',
    mode: 'register',
  });
  assert(registerResult.success && registerResult.data.mode === 'register', 'googleAuthSchema accepts mode: "register"');

  // 1.2 Mode 'login'
  const loginResult = googleAuthSchema.safeParse({
    credential: 'mock-google-token-123',
    role: 'ORGANIZER',
    mode: 'login',
  });
  assert(loginResult.success && loginResult.data.mode === 'login', 'googleAuthSchema accepts mode: "login"');

  // 1.3 Mode 'signup' (normalized to 'register')
  const signupResult = googleAuthSchema.safeParse({
    credential: 'mock-google-token-123',
    mode: 'signup',
  });
  assert(signupResult.success && signupResult.data.mode === 'register', 'googleAuthSchema maps mode: "signup" -> "register"');

  // 1.4 Default mode
  const defaultModeResult = googleAuthSchema.safeParse({
    credential: 'mock-google-token-123',
  });
  assert(defaultModeResult.success && defaultModeResult.data.mode === 'login', 'googleAuthSchema defaults omitted mode to "login"');

  // 1.5 Invalid mode
  const invalidModeResult = googleAuthSchema.safeParse({
    credential: 'mock-google-token-123',
    mode: 'invalid_mode',
  });
  assert(!invalidModeResult.success, 'googleAuthSchema rejects invalid modes with validation error');

  // 1.6 Role preprocessing (case-insensitive)
  const lowercaseRoleResult = googleAuthSchema.safeParse({
    credential: 'mock-google-token-123',
    role: 'attendee',
    mode: 'register',
  });
  assert(lowercaseRoleResult.success && lowercaseRoleResult.data.role === 'ATTENDEE', 'googleAuthSchema normalizes role to uppercase');

  // --- SUITE 2: Organizer Authorization & Live DB Fallback ---
  console.log('\n📦 2. Testing role.middleware.ts Organizer Authorization...');

  // Setup mock request and response helpers
  const createMockReqRes = (user?: any) => {
    const req: Partial<AuthRequest> = { user };
    let responseStatus = 200;
    let responseBody: any = null;
    let nextCalled = false;

    const res: any = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (body: any) => {
        responseBody = body;
        return res;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    return { req: req as AuthRequest, res, getStatus: () => responseStatus, getBody: () => responseBody, isNextCalled: () => nextCalled };
  };

  // 2.1 Unauthenticated request returns 401
  const unauthTest = createMockReqRes(undefined);
  const orgMiddleware = authorizeRoles('organizer', 'admin');
  await orgMiddleware(unauthTest.req, unauthTest.res, () => {});
  assert(unauthTest.getStatus() === 401, 'Unauthenticated request receives 401 Unauthorized');

  // 2.2 Token with role: 'organizer' passes directly
  const orgTokenTest = createMockReqRes({ userId: 'mock-org-id', role: 'organizer', email: 'org@sheeba.et' });
  let orgPassed = false;
  await orgMiddleware(orgTokenTest.req, orgTokenTest.res, () => { orgPassed = true; });
  assert(orgPassed, 'User token with role: "organizer" passes directly without DB query');

  // 2.3 Token with role: 'admin' passes directly
  const adminTokenTest = createMockReqRes({ userId: 'mock-admin-id', role: 'admin', email: 'admin@sheeba.et' });
  let adminPassed = false;
  await orgMiddleware(adminTokenTest.req, adminTokenTest.res, () => { adminPassed = true; });
  assert(adminPassed, 'User token with role: "admin" passes directly');

  // 2.4 User with role: 'attendee' and NOT an approved organizer in DB -> returns 403
  // Create temporary test attendee in DB
  const testAttendeeEmail = `test_attendee_${Date.now()}@test.sheeba.et`;
  const insertAttendee = await query(
    `INSERT INTO users (email, password_hash, full_name, role, is_organizer, organizer_approval_status, approval_status)
     VALUES ($1, 'hash', 'Test Attendee', 'attendee', false, 'none', 'approved')
     RETURNING id`,
    [testAttendeeEmail]
  );
  const attendeeId = insertAttendee.rows[0].id;

  const attendeeTokenTest = createMockReqRes({ userId: attendeeId, role: 'attendee', email: testAttendeeEmail });
  await orgMiddleware(attendeeTokenTest.req, attendeeTokenTest.res, () => {});
  assert(attendeeTokenTest.getStatus() === 403, 'Attendee without organizer approval receives 403 Forbidden');

  // 2.5 User with role: 'attendee' in token BUT approved organizer in DB -> passes through and upgrades req.user.role
  const testApprovedOrgEmail = `test_approved_org_${Date.now()}@test.sheeba.et`;
  const insertApprovedOrg = await query(
    `INSERT INTO users (email, password_hash, full_name, role, is_organizer, organizer_approval_status, approval_status)
     VALUES ($1, 'hash', 'Approved Org User', 'attendee', true, 'approved', 'approved')
     RETURNING id`,
    [testApprovedOrgEmail]
  );
  const approvedOrgId = insertApprovedOrg.rows[0].id;

  const approvedOrgTokenTest = createMockReqRes({ userId: approvedOrgId, role: 'attendee', email: testApprovedOrgEmail });
  let approvedOrgPassed = false;
  await orgMiddleware(approvedOrgTokenTest.req, approvedOrgTokenTest.res, () => { approvedOrgPassed = true; });
  assert(approvedOrgPassed && approvedOrgTokenTest.req.user?.role === 'organizer', 'Attendee token for approved organizer verified via live DB and allowed');

  // 2.6 User with role: 'attendee' and pending organizer status in DB -> receives 403
  const testPendingOrgEmail = `test_pending_org_${Date.now()}@test.sheeba.et`;
  const insertPendingOrg = await query(
    `INSERT INTO users (email, password_hash, full_name, role, is_organizer, organizer_approval_status, approval_status)
     VALUES ($1, 'hash', 'Pending Org User', 'attendee', true, 'pending', 'approved')
     RETURNING id`,
    [testPendingOrgEmail]
  );
  const pendingOrgId = insertPendingOrg.rows[0].id;

  const pendingOrgTokenTest = createMockReqRes({ userId: pendingOrgId, role: 'attendee', email: testPendingOrgEmail });
  await orgMiddleware(pendingOrgTokenTest.req, pendingOrgTokenTest.res, () => {});
  assert(pendingOrgTokenTest.getStatus() === 403, 'Pending organizer applicant is NOT granted organizer access (403)');

  // --- SUITE 3: Admin Approval Updates Role in DB ---
  console.log('\n📦 3. Testing AdminService.approveOrganizer updates role in DB...');
  await AdminService.approveOrganizer(pendingOrgId);
  const checkUpdatedUser = await query('SELECT role, organizer_approval_status, is_organizer FROM users WHERE id = $1', [pendingOrgId]);
  const updatedUserRow = checkUpdatedUser.rows[0];
  assert(
    updatedUserRow.role === 'organizer' &&
    updatedUserRow.organizer_approval_status === 'approved' &&
    updatedUserRow.is_organizer === true,
    'AdminService.approveOrganizer sets role: "organizer" and approval_status: "approved" in DB'
  );

  // Clean up test rows
  await query('DELETE FROM users WHERE id IN ($1, $2, $3)', [attendeeId, approvedOrgId, pendingOrgId]);

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
