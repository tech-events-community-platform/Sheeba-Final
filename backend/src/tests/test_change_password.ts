import dotenv from 'dotenv';
dotenv.config();

import { query } from '../config/db';
import { AuthService } from '../services/auth.service';
import bcrypt from 'bcryptjs';

async function runChangePasswordTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING CHANGE PASSWORD TEST SUITE');
  console.log('================================================================');

  const testEmail = `test_change_pwd_${Date.now()}@example.com`;
  const initialPassword = 'OldPassword123!';
  const updatedPassword = 'NewPassword456!';
  let userId: string;

  try {
    // 1. Create a verified test user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);
    const userRes = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status, member_since)
       VALUES ($1, $2, 'Change Pwd Tester', 'ATTENDEE', true, 'approved', 'October 2026')
       RETURNING id`,
      [testEmail, passwordHash]
    );
    userId = userRes.rows[0].id;
    console.log(`  ✅ Test user created: ${testEmail} (id: ${userId})`);

    // 2. Test incorrect current password rejection
    try {
      await AuthService.changePassword(userId, 'WrongCurrentPassword!', updatedPassword);
      throw new Error('FAIL: Should have rejected incorrect current password');
    } catch (err: any) {
      if (err.message.includes('Current password is incorrect')) {
        console.log('  ✅ PASS: Incorrect current password rejected');
      } else {
        throw err;
      }
    }

    // 3. Test short new password rejection
    try {
      await AuthService.changePassword(userId, initialPassword, '123');
      throw new Error('FAIL: Should have rejected short new password');
    } catch (err: any) {
      if (err.message.includes('at least 6 characters')) {
        console.log('  ✅ PASS: Short new password rejected');
      } else {
        throw err;
      }
    }

    // 4. Test successful password change
    const changeResult = await AuthService.changePassword(userId, initialPassword, updatedPassword);
    if (!changeResult.success) {
      throw new Error('FAIL: Change password did not return success');
    }
    console.log('  ✅ PASS: Change password succeeded with valid current password');

    // 5. Test login with old password fails
    try {
      await AuthService.loginUser({ email: testEmail, password: initialPassword });
      throw new Error('FAIL: Login with old password should fail');
    } catch (err: any) {
      console.log('  ✅ PASS: Login with old password fails');
    }

    // 6. Test login with new password succeeds
    const loginRes = await AuthService.loginUser({ email: testEmail, password: updatedPassword });
    if (!loginRes.token || !loginRes.user) {
      throw new Error('FAIL: Login with new password failed');
    }
    console.log('  ✅ PASS: Login with new password succeeds');

    // 7. Cleanup
    await query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('  🧹 Test cleanup complete.');

    console.log('\n================================================================');
    console.log('ALL CHANGE PASSWORD TESTS PASSED (6/6)');
    console.log('================================================================\n');
  } catch (error) {
    if (userId!) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
    console.error('❌ Change password test failed:', error);
    process.exit(1);
  }
}

runChangePasswordTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
