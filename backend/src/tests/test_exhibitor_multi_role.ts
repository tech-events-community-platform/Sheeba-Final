import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { AuthService } from '../services/auth.service';
import { verifyAuthToken } from '../utils/jwt.util';
import { addExhibitorRoleSchema } from '../schemas/auth.schema';

async function runExhibitorMultiRoleTests() {
  console.log('================================================================');
  console.log('🎯  SHEEBA MULTI-ROLE & EXHIBITOR AUTH VERIFICATION SUITE');
  console.log('================================================================\n');

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

  const suffix = Math.random().toString(36).substring(2, 8);
  const testPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testPassword, salt);

  // Test accounts
  const attendeeOnlyEmail = `att_${suffix}@test.sheeba.io`;
  const organizerOnlyEmail = `org_${suffix}@test.sheeba.io`;
  const newExhibitorEmail = `new_exh_${suffix}@test.sheeba.io`;
  const googleOAuthEmail = `google_${suffix}@test.sheeba.io`;

  try {
    // -------------------------------------------------------------------------
    // Setup initial records for test scenarios
    // -------------------------------------------------------------------------
    // 1. Pure attendee
    const attRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status, is_organizer, is_exhibitor, visibility, member_since)
       VALUES (LOWER($1), $2, 'Attendee Test', 'attendee', TRUE, 'approved', FALSE, FALSE, 'public', 'November 2026')
       RETURNING id, email, role, is_exhibitor, is_organizer`,
      [attendeeOnlyEmail, passwordHash]
    );
    const attendeeUser = attRes.rows[0];

    // 2. Approved organizer with specific community organization name
    const orgRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status, is_organizer, organizer_approval_status, is_exhibitor, organization, visibility, member_since)
       VALUES (LOWER($1), $2, 'Organizer Test', 'organizer', TRUE, 'approved', TRUE, 'approved', FALSE, 'GDG Addis Community', 'public', 'November 2026')
       RETURNING id, email, role, is_exhibitor, is_organizer, organization`,
      [organizerOnlyEmail, passwordHash]
    );
    const organizerUser = orgRes.rows[0];

    // 3. Google OAuth user (has google_id, password_hash is NULL)
    const googleRes = await query(
      `INSERT INTO users (email, password_hash, google_id, full_name, role, is_active, approval_status, is_organizer, is_exhibitor, visibility, member_since)
       VALUES (LOWER($1), NULL, $2, 'Google OAuth User', 'attendee', TRUE, 'approved', FALSE, FALSE, 'public', 'November 2026')
       RETURNING id, email, role, google_id, password_hash, is_exhibitor`,
      [googleOAuthEmail, `gid_${suffix}`]
    );
    const googleUser = googleRes.rows[0];

    console.log('\n--- Scenario 1: New user registers as Exhibitor (OTP & Profile activation) ---');
    // Simulate registerUser with role='EXHIBITOR'
    const regRes = await AuthService.registerUser({
      email: newExhibitorEmail,
      password: testPassword,
      full_name: 'New Exhibitor Rep',
      organization: 'Tech Corp Ethiopia',
      phone: '+251911000111',
      role: 'exhibitor',
      ...({ industry_category: 'Tech & Software' } as any),
    });

    assert(regRes.requireOtp === true, '1.1 Exhibitor registration initiates OTP verification');

    // Retrieve the OTP from otp_verifications
    const otpRes = await query(
      'SELECT otp_code, metadata FROM otp_verifications WHERE LOWER(email) = LOWER($1)',
      [newExhibitorEmail]
    );
    assert(otpRes.rowCount === 1, '1.2 OTP record inserted for exhibitor registration');
    const otpRecord = otpRes.rows[0];
    const meta = typeof otpRecord.metadata === 'string' ? JSON.parse(otpRecord.metadata) : otpRecord.metadata;
    assert(meta.is_exhibitor_registration === true, '1.3 OTP metadata captures is_exhibitor_registration flag');
    assert(meta.industry_category === 'Tech & Software', '1.4 OTP metadata captures industry_category');

    // Verify registration OTP
    const verifyRes = await AuthService.verifyRegistrationOtp({
      email: newExhibitorEmail,
      otp: otpRecord.otp_code,
    });
    assert(Boolean(verifyRes.user && verifyRes.token), '1.5 verifyRegistrationOtp succeeds and returns user + token');

    // Verify database record
    const createdExh = await query(
      'SELECT id, role, is_exhibitor, company_name, industry_category FROM users WHERE LOWER(email) = LOWER($1)',
      [newExhibitorEmail]
    );
    assert(createdExh.rows[0]?.is_exhibitor === true, '1.6 New exhibitor account has is_exhibitor = TRUE');
    assert(createdExh.rows[0]?.industry_category === 'Tech & Software', '1.7 New exhibitor account stores industry_category');

    console.log('\n--- Scenario 2: Existing Attendee adds Exhibitor Role ---');
    const addRoleRes = await AuthService.addExhibitorRole(attendeeUser.id, {
      companyName: 'Attendee Innovations PLC',
      industryCategory: 'Fintech & Banking',
      companyPhone: '+251922334455',
      companyWebsite: 'https://innovations.et',
      password: testPassword,
    });

    assert(addRoleRes.user.isExhibitor === true, '2.1 addExhibitorRole returns user with isExhibitor = true');
    assert(addRoleRes.user.roles.includes('EXHIBITOR'), '2.2 User roles array includes EXHIBITOR');
    assert(addRoleRes.user.roles.includes('ATTENDEE'), '2.3 User roles array preserves ATTENDEE');

    // Verify DB
    const checkAttDb = await query(
      'SELECT id, role, is_exhibitor, is_organizer, company_name, industry_category FROM users WHERE id = $1',
      [attendeeUser.id]
    );
    assert(checkAttDb.rows[0]?.role === 'attendee', '2.4 Primary role remains attendee');
    assert(checkAttDb.rows[0]?.is_exhibitor === true, '2.5 Database row is_exhibitor updated to TRUE');
    assert(checkAttDb.rows[0]?.company_name === 'Attendee Innovations PLC', '2.6 Company name stored on users record');

    console.log('\n--- Scenario 3: Existing Organizer adds Exhibitor Role ---');
    const orgAddExh = await AuthService.addExhibitorRole(organizerUser.id, {
      companyName: 'Community Sponsor LLC',
      industryCategory: 'Education & Training',
      password: testPassword,
    });

    assert(orgAddExh.user.isOrganizer === true, '3.1 Preserves isOrganizer flag');
    assert(orgAddExh.user.isExhibitor === true, '3.2 Activates isExhibitor flag');
    assert(orgAddExh.user.roles.includes('ORGANIZER'), '3.3 Roles array retains ORGANIZER');
    assert(orgAddExh.user.roles.includes('EXHIBITOR'), '3.4 Roles array gains EXHIBITOR');
    assert(orgAddExh.user.roles.includes('ATTENDEE'), '3.5 Roles array retains ATTENDEE');

    console.log('\n--- Scenario 4 & 5: Exhibitor Login Gate Enforcement ---');
    // Create an attendee without exhibitor role
    const pureAttEmail = `pure_att_${suffix}@test.sheeba.io`;
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status, is_organizer, is_exhibitor, visibility, member_since)
       VALUES (LOWER($1), $2, 'Pure Attendee', 'attendee', TRUE, 'approved', FALSE, FALSE, 'public', 'November 2026')`,
      [pureAttEmail, passwordHash]
    );

    let deniedError: any = null;
    try {
      await AuthService.loginUser({
        email: pureAttEmail,
        password: testPassword,
        role: 'exhibitor',
      });
    } catch (err: any) {
      deniedError = err;
    }

    assert(deniedError !== null, '5.1 Login as exhibitor denied for user lacking exhibitor role');
    assert(deniedError?.statusCode === 403, '5.2 Denial returns HTTP 403');
    assert(deniedError?.code === 'EXHIBITOR_ROLE_NOT_ACTIVATED', '5.3 Denial returns EXHIBITOR_ROLE_NOT_ACTIVATED error code');
    assert(
      deniedError?.message === 'Your account is not currently registered as an exhibitor. Please complete exhibitor registration to access the Exhibitor Workspace.',
      '5.4 Denial returns exact required formal user message'
    );

    console.log('\n--- Scenario 6: Registered Exhibitor Login ---');
    const exhLoginRes = await AuthService.loginUser({
      email: attendeeUser.email,
      password: testPassword,
      role: 'exhibitor',
    });

    assert(Boolean(exhLoginRes.token), '6.1 Exhibitor login succeeds with JWT');
    const decodedExh = verifyAuthToken(exhLoginRes.token);
    assert(decodedExh.role === 'exhibitor', '6.2 JWT session role is set to exhibitor');

    console.log('\n--- Scenario 7, 8, 9: Role Switching with Password Security ---');
    // 7. Attempt switch to role not possessed (e.g. pure attendee tries to switch to EXHIBITOR)
    const pureAttUser = (await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [pureAttEmail])).rows[0];
    let unauthorizedSwitchErr: any = null;
    try {
      await AuthService.switchRole(pureAttUser.id, {
        targetRole: 'EXHIBITOR',
        password: testPassword,
      });
    } catch (err: any) {
      unauthorizedSwitchErr = err;
    }
    assert(unauthorizedSwitchErr?.statusCode === 403, '7.1 Switching to unauthorized role is rejected with 403');

    // 8. Role switch with CORRECT password (attendee with exhibitor role switches to EXHIBITOR)
    const validSwitchRes = await AuthService.switchRole(attendeeUser.id, {
      targetRole: 'EXHIBITOR',
      password: testPassword,
    });
    assert(Boolean(validSwitchRes.token), '8.1 Role switch returns new JWT');
    const validSwitchJwt = verifyAuthToken(validSwitchRes.token);
    assert(validSwitchJwt.role === 'exhibitor', '8.2 New JWT has role: exhibitor');

    // Switch back to ATTENDEE
    const backToAttendee = await AuthService.switchRole(attendeeUser.id, {
      targetRole: 'ATTENDEE',
      password: testPassword,
    });
    const backJwt = verifyAuthToken(backToAttendee.token);
    assert(backJwt.role === 'attendee', '8.3 Switched back to ATTENDEE workspace with role: attendee');

    // 9. Role switch with WRONG password
    let wrongPassErr: any = null;
    try {
      await AuthService.switchRole(attendeeUser.id, {
        targetRole: 'EXHIBITOR',
        password: 'WrongPassword123!',
      });
    } catch (err: any) {
      wrongPassErr = err;
    }
    assert(wrongPassErr?.statusCode === 401, '9.1 Wrong password on role switch rejected with 401');

    console.log('\n--- Scenario 10: Existing Attendee / Organizer Auth Intact ---');
    // Attendee login without specified role
    const defaultAttLogin = await AuthService.loginUser({
      email: pureAttEmail,
      password: testPassword,
    });
    assert(verifyAuthToken(defaultAttLogin.token).role === 'attendee', '10.1 Pure attendee logs in with default role attendee');

    // Organizer login
    const orgLogin = await AuthService.loginUser({
      email: organizerOnlyEmail,
      password: testPassword,
      role: 'organizer',
    });
    assert(verifyAuthToken(orgLogin.token).role === 'organizer', '10.2 Organizer logs in with role organizer');

    console.log('\n--- Scenario 11: Duplicate Registration Handling ---');
    let dupRegErr: any = null;
    try {
      await AuthService.registerUser({
        email: attendeeOnlyEmail,
        password: 'AnotherPassword!',
        full_name: 'Duplicate Attempt',
        role: 'exhibitor',
      });
    } catch (err: any) {
      dupRegErr = err;
    }
    assert(dupRegErr?.statusCode === 409, '11.1 Duplicate email registration returns 409');
    assert(dupRegErr?.code === 'EXHIBITOR_EMAIL_EXISTS', '11.2 Returns EXHIBITOR_EMAIL_EXISTS code to guide user to add-role flow');

    console.log('\n--- Scenario 12: Decoupled Booth Applications ---');
    // An exhibitor role does not automatically mean approved booth applications
    const currentUser = await AuthService.getCurrentUser(attendeeUser.id);
    assert(currentUser.isExhibitor === true, '12.1 Account has exhibitor capability active');
    assert(currentUser.hasExhibitorApplications === false, '12.2 Event vendor applications remain strictly decoupled and pending until applied');

    console.log('\n--- Scenario 13: SEC-01 & SEC-02 Remediation Verification ---');

    // SEC-01: Zod schema accepts payload with omitted password
    const schemaValidation = addExhibitorRoleSchema.safeParse({
      companyName: 'Cloud AI Labs',
      industryCategory: 'AI & Robotics',
    });
    assert(schemaValidation.success === true, '13.1 addExhibitorRoleSchema accepts payload with omitted password');

    // SEC-01: Google OAuth user without password adds Exhibitor role successfully
    const googleAddRes = await AuthService.addExhibitorRole(googleUser.id, {
      companyName: 'Cloud AI Labs',
      industryCategory: 'AI & Robotics',
    } as any);
    assert(googleAddRes.user.isExhibitor === true, '13.2 Google OAuth user without password activates Exhibitor role');

    // SEC-01: User WITH password MUST provide correct password
    let noPasswordAttErr: any = null;
    try {
      await AuthService.addExhibitorRole(pureAttUser.id, {
        companyName: 'Passworded Company',
        industryCategory: 'Fintech & Banking',
      } as any);
    } catch (err: any) {
      noPasswordAttErr = err;
    }
    assert(noPasswordAttErr?.statusCode === 401, '13.3 User with password must provide password to add role (401)');

    // SEC-02: Organization name preservation for organizer
    const checkOrgDb = await query(
      'SELECT organization, company_name FROM users WHERE id = $1',
      [organizerUser.id]
    );
    assert(
      checkOrgDb.rows[0]?.organization === 'GDG Addis Community',
      '13.4 Existing organizer organization name is preserved and NOT overwritten'
    );
    assert(
      checkOrgDb.rows[0]?.company_name === 'Community Sponsor LLC',
      '13.5 Exhibitor company_name is stored correctly in company_name column'
    );

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    // Cleanup test accounts
    await query("DELETE FROM users WHERE email LIKE '%@test.sheeba.io'");
    await query("DELETE FROM otp_verifications WHERE email LIKE '%@test.sheeba.io'");
  }

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runExhibitorMultiRoleTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

