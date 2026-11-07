import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { query } from '../config/db';

async function runSponsorTests() {
  console.log('====================================================');
  console.log('🧪 TESTING SPONSOR AUTH & APPROVAL WORKFLOW');
  console.log('====================================================');

  const testEmail = `sponsor_${Date.now()}@acmetech.et`;
  const testPassword = 'Password123!';

  // 1. Clean up any prior test user
  await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [testEmail]);
  await query('DELETE FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [testEmail]);

  // 2. Register Sponsor
  console.log('\n📦 1. Testing Sponsor Corporate Registration...');
  const regResult = await AuthService.registerSponsor({
    full_name: 'Dawit Bekele',
    email: testEmail,
    password: testPassword,
    company_name: 'Acme Technologies PLC',
    industry_category: 'Fintech',
    company_phone: '+251911223344',
    company_website: 'https://acmetech.et',
    company_description: 'Leading fintech and payment infrastructure company in East Africa.',
    company_logo: 'https://acmetech.et/logo.png',
    sponsorship_objectives: ['Brand awareness', 'Talent recruitment'],
    target_audience: ['Software developers', 'University students'],
    preferred_event_categories: ['Hackathons', 'Tech conferences'],
    skills_and_interests: ['AI', 'Software engineering', 'Python'],
    preferred_locations: ['Addis Ababa'],
    budget_range: 250000,
  });

  if (!regResult.user.bio || !regResult.user.sponsorPreferences) {
    throw new Error('FAIL: Company bio or sponsorPreferences not persisted on user object');
  }
  console.log('  ✅ PASS: Company description and sponsor preferences successfully persisted');

  if (regResult.user.role === 'SPONSOR' && regResult.user.approvalStatus === 'pending') {
    console.log('  ✅ PASS: Sponsor registered in pending approval status');
  } else {
    throw new Error(`Sponsor registration unexpected state: ${JSON.stringify(regResult)}`);
  }

  // 3. Attempt Login before approval (should be blocked)
  console.log('\n📦 2. Testing Sponsor Login Gate Before Admin Approval...');
  let loginBlocked = false;
  try {
    await AuthService.loginUser({ email: testEmail, password: testPassword, role: 'sponsor' });
  } catch (err: any) {
    if (err.isPendingApproval || (err.message && err.message.includes('reviewed shortly'))) {
      loginBlocked = true;
      console.log('  ✅ PASS: Unapproved sponsor login blocked with admin review message');
    }
  }
  if (!loginBlocked) {
    throw new Error('FAIL: Sponsor was allowed to log in before admin approval!');
  }

  // 4. Admin approves sponsor
  console.log('\n📦 3. Testing Admin Review & Approval...');
  const adminUsers = await AdminService.getUsersList();
  const pendingSponsor = adminUsers.sponsors.find((s) => s.email === testEmail);
  if (!pendingSponsor) {
    throw new Error('FAIL: Admin did not see newly registered sponsor in sponsors queue');
  }
  console.log('  ✅ PASS: Admin successfully fetched pending sponsor in queue');

  const approved = await AdminService.approveSponsor(pendingSponsor.id);
  if (approved.approval_status === 'approved' && approved.is_active) {
    console.log('  ✅ PASS: Admin approved sponsor account');
  } else {
    throw new Error('FAIL: Admin approveSponsor did not set approved status');
  }

  // 5. Approved sponsor logs in successfully
  console.log('\n📦 4. Testing Approved Sponsor Login...');
  const loginResult = await AuthService.loginUser({ email: testEmail, password: testPassword, role: 'sponsor' });
  if (loginResult.token && loginResult.user.role === 'SPONSOR') {
    console.log('  ✅ PASS: Approved sponsor successfully authenticated and received session token');
  } else {
    throw new Error('FAIL: Approved sponsor could not log in');
  }

  // 6. Test OTP Forgot Password Flow
  console.log('\n📦 5. Testing 6-Digit OTP Password Reset Flow...');
  const otpDispatched = await AuthService.sendPasswordResetOtp(testEmail);
  if (!otpDispatched.success) {
    throw new Error('FAIL: sendPasswordResetOtp failed');
  }

  const otpRow = await query('SELECT otp_code FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [testEmail]);
  const otpCode = otpRow.rows[0]?.otp_code;
  if (!otpCode || otpCode.length !== 6) {
    throw new Error(`FAIL: OTP code not found in DB or not 6 digits: ${otpCode}`);
  }
  console.log(`  ✅ PASS: 6-digit OTP code generated & stored: ${otpCode}`);

  const newPassword = 'NewSecretPassword456!';
  const resetResult = await AuthService.verifyOtpAndResetPassword(testEmail, otpCode, newPassword);
  if (!resetResult.success) {
    throw new Error('FAIL: verifyOtpAndResetPassword failed');
  }
  console.log('  ✅ PASS: OTP verified and password updated successfully');

  // Verify can log in with new password
  const newLogin = await AuthService.loginUser({ email: testEmail, password: newPassword, role: 'sponsor' });
  if (newLogin.token) {
    console.log('  ✅ PASS: Sponsor logged in with newly reset password');
  } else {
    throw new Error('FAIL: Login with new password failed');
  }

  // Clean up
  await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [testEmail]);
  await query('DELETE FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [testEmail]);

  console.log('\n====================================================');
  console.log('🎉 ALL SPONSOR BACKEND TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runSponsorTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  });
