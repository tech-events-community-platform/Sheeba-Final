import dotenv from 'dotenv';
dotenv.config();

import { query } from '../config/db';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING BREVO EMAIL & OTP MIGRATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. CONFIGURATION CHECKS
  console.log('--- 1. Configuration & Environment Verification ---');
  assert(Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.startsWith('xkeysib-')), 'BREVO_API_KEY is configured in backend environment');
  assert(process.env.BREVO_SENDER_EMAIL === 'hanannuru384@gmail.com', `BREVO_SENDER_EMAIL is set to hanannuru384@gmail.com (got: ${process.env.BREVO_SENDER_EMAIL})`);
  assert(process.env.BREVO_SENDER_NAME === 'Sheeba', `BREVO_SENDER_NAME is set to Sheeba (got: ${process.env.BREVO_SENDER_NAME})`);
  assert(process.env.OTP_EXPIRATION_MINUTES === '3', `OTP_EXPIRATION_MINUTES is set to 3 (got: ${process.env.OTP_EXPIRATION_MINUTES})`);
  assert(!process.env.RESEND_API_KEY, 'RESEND_API_KEY is completely removed from environment');

  const testAttendeeEmail = `test_attendee_${Date.now()}@example.com`;
  const testOrganizerEmail = `test_org_${Date.now()}@example.com`;
  const testForgotPasswordEmail = `test_forgot_${Date.now()}@example.com`;

  try {
    // 2. ADMIN REGISTRATION REJECTION
    console.log('\n--- 2. Admin Public Registration Guard ---');
    try {
      await AuthService.registerUser({
        email: `admin_${Date.now()}@example.com`,
        password: 'Password123!',
        full_name: 'Fake Admin',
        role: 'admin',
      });
      assert(false, 'Admin public registration should be rejected');
    } catch (err: any) {
      assert(err.statusCode === 403, 'Admin public registration is strictly blocked with 403 Forbidden');
    }

    // 3. ORGANIZER REGISTRATION PRESERVATION
    console.log('\n--- 3. Organizer Registration Preservation ---');
    const orgRes = await AuthService.registerUser({
      email: testOrganizerEmail,
      password: 'Password123!',
      full_name: 'Test Organizer',
      role: 'organizer',
      organization: 'Tech Addis Community',
      bio: 'Leading developer workshops',
    });
    assert(orgRes.isPendingApproval === true, 'Organizer registration preserves pending approval flow');
    assert(orgRes.token === '', 'Organizer receives no session token until admin approval');
    assert(Boolean(orgRes.user && orgRes.user.isOrganizer), 'Organizer record created with isOrganizer = true');

    const orgDbCheck = await query('SELECT approval_status, is_active FROM users WHERE LOWER(email) = LOWER($1)', [testOrganizerEmail]);
    assert(orgDbCheck.rows[0]?.approval_status === 'pending', 'Organizer approval status in DB is pending');
    assert(orgDbCheck.rows[0]?.is_active === false, 'Organizer is_active in DB is false pending approval');

    // 4. ATTENDEE REGISTRATION OTP FLOW
    console.log('\n--- 4. Attendee Registration Brevo OTP Flow ---');
    const attendeeRes = await AuthService.registerUser({
      email: testAttendeeEmail,
      password: 'StrongPassword123!',
      full_name: 'Abebe Bikila',
      role: 'attendee',
    });

    assert(attendeeRes.requireOtp === true, 'Attendee registration returns requireOtp: true');
    assert(attendeeRes.email === testAttendeeEmail.toLowerCase(), 'Attendee registration returns attendee email');

    // Verify user is NOT yet in users table
    const unverifiedUser = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [testAttendeeEmail]);
    assert(unverifiedUser.rowCount === 0, 'Attendee account is not created in users table before OTP verification');

    // Check OTP record in otp_verifications
    const otpRec = await query(
      'SELECT id, otp_code, expires_at, purpose, metadata FROM otp_verifications WHERE LOWER(email) = LOWER($1) AND purpose = $2',
      [testAttendeeEmail, 'registration']
    );
    assert(otpRec.rowCount === 1, 'OTP verification record created with purpose = registration');

    const otpCode = otpRec.rows[0].otp_code;
    const expiresAt = new Date(otpRec.rows[0].expires_at);
    const createdAt = new Date();
    const diffMinutes = Math.round((expiresAt.getTime() - createdAt.getTime()) / (60 * 1000));
    assert(diffMinutes === 3, `OTP expiration is exactly 3 minutes (calculated: ${diffMinutes} min)`);

    // Incorrect OTP rejection
    try {
      await AuthService.verifyRegistrationOtp({ email: testAttendeeEmail, otp: '999999' });
      assert(false, 'Incorrect OTP should be rejected');
    } catch (err: any) {
      assert(err.message.includes('Invalid verification code'), 'Incorrect OTP rejected with attempts message');
    }

    // Expired OTP rejection test: simulate expiration
    await query('UPDATE otp_verifications SET expires_at = NOW() - INTERVAL \'1 minute\' WHERE id = $1', [otpRec.rows[0].id]);
    try {
      await AuthService.verifyRegistrationOtp({ email: testAttendeeEmail, otp: otpCode });
      assert(false, 'Expired OTP should be rejected');
    } catch (err: any) {
      assert(err.message.includes('expired'), 'Expired OTP rejected due to 3-minute expiration limit');
    }

    // Resend OTP test
    // Re-insert unexpired OTP for resend test
    await AuthService.registerUser({
      email: testAttendeeEmail,
      password: 'StrongPassword123!',
      full_name: 'Abebe Bikila',
      role: 'attendee',
    });

    const resendRes = await AuthService.resendRegistrationOtp(testAttendeeEmail);
    assert(resendRes.success === true, 'Resend OTP succeeds and generates fresh code');

    const freshOtpRec = await query(
      'SELECT id, otp_code, expires_at FROM otp_verifications WHERE LOWER(email) = LOWER($1) AND purpose = $2',
      [testAttendeeEmail, 'registration']
    );
    const freshOtpCode = freshOtpRec.rows[0].otp_code;

    // Successful OTP verification
    const verifiedRes = await AuthService.verifyRegistrationOtp({ email: testAttendeeEmail, otp: freshOtpCode });
    assert(Boolean(verifiedRes.token && verifiedRes.token.length > 20), 'Valid OTP verification returns authenticated JWT token');
    assert(verifiedRes.user.email === testAttendeeEmail.toLowerCase(), 'Verified user object returned with correct email');
    assert(verifiedRes.user.role === 'ATTENDEE', 'Verified user has role ATTENDEE');

    // Verify OTP record was deleted after successful verification
    const cleanedOtp = await query('SELECT id FROM otp_verifications WHERE LOWER(email) = LOWER($1) AND purpose = $2', [testAttendeeEmail, 'registration']);
    assert(cleanedOtp.rowCount === 0, 'Used registration OTP record deleted from database');

    // Verify user exists in users table
    const registeredUser = await query('SELECT id, is_active, approval_status FROM users WHERE LOWER(email) = LOWER($1)', [testAttendeeEmail]);
    assert(registeredUser.rowCount === 1 && registeredUser.rows[0].is_active === true, 'User is now active in database');

    // 5. FORGOT PASSWORD BREVO OTP FLOW
    console.log('\n--- 5. Forgot Password Brevo OTP Flow ---');

    // Setup an existing attendee for forgot-password
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES (LOWER($1), 'hash', 'Forgot Tester', 'attendee', TRUE, 'approved')`,
      [testForgotPasswordEmail]
    );

    const forgotRes = await AuthService.forgotPassword(testForgotPasswordEmail);
    assert(forgotRes.success === true, 'Forgot password request succeeds');

    const forgotOtpRec = await query(
      'SELECT id, otp_code, expires_at, is_verified FROM otp_verifications WHERE LOWER(email) = LOWER($1) AND purpose = $2',
      [testForgotPasswordEmail, 'password_reset']
    );
    assert(forgotOtpRec.rowCount === 1, 'Forgot password OTP stored in otp_verifications with purpose = password_reset');

    const forgotOtpCode = forgotOtpRec.rows[0].otp_code;
    const forgotExpiry = new Date(forgotOtpRec.rows[0].expires_at);
    const forgotDiff = Math.round((forgotExpiry.getTime() - Date.now()) / (60 * 1000));
    assert(forgotDiff === 3, `Forgot password OTP expiration is 3 minutes (calculated: ${forgotDiff} min)`);

    // Verify incorrect OTP
    try {
      await AuthService.verifyForgotPasswordOtp(testForgotPasswordEmail, '000000');
      assert(false, 'Incorrect forgot password OTP should fail');
    } catch (err: any) {
      assert(err.message.includes('Invalid verification code'), 'Incorrect forgot password OTP rejected');
    }

    // Verify correct OTP
    const verifyForgotRes = await AuthService.verifyForgotPasswordOtp(testForgotPasswordEmail, forgotOtpCode);
    assert(verifyForgotRes.success === true, 'Forgot password OTP verified successfully');

    // Reset password with verified OTP
    const resetRes = await AuthService.resetPassword({
      email: testForgotPasswordEmail,
      otp: forgotOtpCode,
      newPassword: 'BrandNewPassword123!',
    });
    assert(resetRes.success === true, 'Password reset with verified OTP succeeds');

    // Verify OTP record cleaned up
    const postResetOtp = await query('SELECT id FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [testForgotPasswordEmail]);
    assert(postResetOtp.rowCount === 0, 'Password reset OTP cleaned up from database');

    // Verify login with new password
    const loginRes = await AuthService.loginUser({
      email: testForgotPasswordEmail,
      password: 'BrandNewPassword123!',
    });
    assert(Boolean(loginRes.token), 'Login succeeds with new password');

  } finally {
    // Cleanup test data
    console.log('\n--- 6. Cleaning Up Test Fixtures ---');
    await query('DELETE FROM users WHERE LOWER(email) IN (LOWER($1), LOWER($2), LOWER($3))', [
      testAttendeeEmail,
      testOrganizerEmail,
      testForgotPasswordEmail,
    ]);
    await query('DELETE FROM otp_verifications WHERE LOWER(email) IN (LOWER($1), LOWER($2), LOWER($3))', [
      testAttendeeEmail,
      testOrganizerEmail,
      testForgotPasswordEmail,
    ]);
    console.log('  🧹 Test cleanup complete.');
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
