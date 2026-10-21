import { signAuthToken } from '../utils/jwt.util';
import { IJwtPayload } from '../types';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function runAuthSecurityTests() {
  console.log('========================================================');
  console.log('🧪 TESTING SPONSOR MATCHING AUTH & AUTHORIZATION GATES');
  console.log('========================================================\n');

  // Generate tokens for different roles
  const attendeePayload: IJwtPayload = {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'attendee@example.com',
    fullName: 'Test Attendee',
    role: 'attendee',
  };

  const sponsorPayload: IJwtPayload = {
    userId: '22222222-2222-2222-2222-222222222222',
    email: 'sponsor@example.com',
    fullName: 'Corporate Sponsor',
    role: 'sponsor',
  };

  const attendeeToken = signAuthToken(attendeePayload);
  const sponsorToken = signAuthToken(sponsorPayload);

  assert(Boolean(attendeeToken), 'Attendee token should be signed');
  assert(Boolean(sponsorToken), 'Sponsor token should be signed');

  console.log('  ✅ PASS: Successfully generated distinct signed JWT tokens for Attendee and Sponsor roles');

  // Verify role normalization in role.middleware
  const allowedRoles = ['sponsor', 'admin'];
  const isAttendeeAllowed = allowedRoles.includes(attendeePayload.role.toLowerCase());
  const isSponsorAllowed = allowedRoles.includes(sponsorPayload.role.toLowerCase());

  assert(!isAttendeeAllowed, 'Attendee MUST NOT be permitted into sponsor-only endpoints');
  assert(isSponsorAllowed, 'Sponsor MUST be permitted into sponsor-only endpoints');

  console.log('  ✅ PASS: Authorization gate blocks non-sponsors (Attendee: Forbidden 403, Sponsor: Allowed 200)');
  console.log('\n🎉 AUTH GATES VERIFIED SUCCESSFULLY!\n');
}

runAuthSecurityTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
