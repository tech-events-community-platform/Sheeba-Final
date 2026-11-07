import assert from 'node:assert';
import { applyOrganizerSchema, registerSchema, ORGANIZATION_TYPES } from '../schemas/auth.schema';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { authorizeRoles } from '../middlewares/role.middleware';
import { query } from '../config/db';

async function runTests() {
  console.log('\n====================================================');
  console.log('🏛️ SHEEBA ORGANIZER FORMALIZATION TEST SUITE');
  console.log('====================================================\n');

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

  // --- 1. Schema & Validation Tests: Individual & Organization ---
  console.log('📦 1. Testing applyOrganizerSchema Formalization...');
  {
    // Individual Organizer: Valid
    const validIndividual = applyOrganizerSchema.safeParse({
      applicant_type: 'Individual Organizer',
      phone: '+251911223344',
      personal_introduction: 'Experienced Ethiopian tech community builder and mentor.',
    });
    assertTest('Individual Organizer: accepts valid submission with intro and phone', validIndividual.success);
    if (validIndividual.success) {
      assertTest('Individual Organizer: applicant_type normalized', validIndividual.data.applicant_type === 'Individual Organizer');
      assertTest('Individual Organizer: bio mapped to personal introduction', validIndividual.data.bio === 'Experienced Ethiopian tech community builder and mentor.');
    }

    // Individual Organizer: missing personal intro
    const missingIntro = applyOrganizerSchema.safeParse({
      applicant_type: 'Individual Organizer',
      phone: '+251911223344',
      personal_introduction: '   ',
    });
    assertTest('Individual Organizer: rejects empty personal introduction', !missingIntro.success);

    // Individual Organizer: does NOT force organization info
    const individualNoOrg = applyOrganizerSchema.safeParse({
      applicant_type: 'Individual Organizer',
      phone: '+251911223344',
      personal_introduction: 'Independent hacker and meetup host.',
    });
    assertTest('Individual Organizer: does not require organization name or type', individualNoOrg.success);

    // Organization / Institution: Valid
    const validOrg = applyOrganizerSchema.safeParse({
      applicant_type: 'Organization / Institution',
      phone: '+251911223344',
      organization: 'Addis Open Source',
      organization_type: 'Community / Student Club',
      applicant_position: 'Founder & Community Lead',
      organization_description: 'Non-profit grassroots software engineering community.',
      organization_website: 'https://addisopensource.et',
      organization_logo: 'https://res.cloudinary.com/dktpwqspb/image/upload/v123/logo.png',
    });
    assertTest('Organization: accepts valid application with all required organization fields and optional logo', validOrg.success);

    // Organization: rejects missing organization name
    const missingOrgName = applyOrganizerSchema.safeParse({
      applicant_type: 'Organization / Institution',
      phone: '+251911223344',
      organization: '   ',
      organization_type: 'Community / Student Club',
      applicant_position: 'Lead',
      organization_description: 'Tech club',
    });
    assertTest('Organization: rejects empty organization name', !missingOrgName.success);

    // Organization: rejects missing organization type
    const missingOrgType = applyOrganizerSchema.safeParse({
      applicant_type: 'Organization / Institution',
      phone: '+251911223344',
      organization: 'Addis Devs',
      applicant_position: 'Lead',
      organization_description: 'Tech club',
    });
    assertTest('Organization: rejects missing organization type', !missingOrgType.success);

    // Organization: rejects invalid organization type
    const invalidOrgType = applyOrganizerSchema.safeParse({
      applicant_type: 'Organization / Institution',
      phone: '+251911223344',
      organization: 'Addis Devs',
      organization_type: 'Random Unofficial Type',
      applicant_position: 'Lead',
      organization_description: 'Tech club',
    });
    assertTest('Organization: rejects unsupported organization type', !invalidOrgType.success);

    // Organization: rejects missing position
    const missingPosition = applyOrganizerSchema.safeParse({
      applicant_type: 'Organization / Institution',
      phone: '+251911223344',
      organization: 'Addis Devs',
      organization_type: 'Company / Business',
      applicant_position: '   ',
      organization_description: 'Tech enterprise',
    });
    assertTest('Organization: rejects missing applicant position', !missingPosition.success);

    // Organization: rejects missing organization description
    const missingOrgDesc = applyOrganizerSchema.safeParse({
      applicant_type: 'Organization / Institution',
      phone: '+251911223344',
      organization: 'Addis Devs',
      organization_type: 'Company / Business',
      applicant_position: 'Director',
      organization_description: '   ',
    });
    assertTest('Organization: rejects missing organization description', !missingOrgDesc.success);

    // Common: rejects missing phone number
    const missingPhone = applyOrganizerSchema.safeParse({
      applicant_type: 'Individual Organizer',
      phone: '   ',
      personal_introduction: 'Community host',
    });
    assertTest('Common: rejects missing phone number', !missingPhone.success);

    // Passwordless flexibility (Google users)
    const withoutPassword = applyOrganizerSchema.safeParse({
      applicant_type: 'Organization / Institution',
      phone: '+251911223344',
      organization: 'Addis Open Source',
      organization_type: 'Community / Student Club',
      applicant_position: 'Lead',
      organization_description: 'Tech community',
    });
    assertTest('Common: accepts application without password (for Google OAuth users)', withoutPassword.success);
  }

  // --- 2. formatUserResponse & hasPassword Flag ---
  console.log('\n📦 2. Testing formatUserResponse with Formalization Fields...');
  {
    const userWithPasswordHash = {
      id: 'usr_1',
      full_name: 'Abebe Kebede',
      email: 'abebe@example.com',
      role: 'attendee',
      phone: '+251911223344',
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      applicant_type: 'Organization / Institution',
      organization: 'Addis Tech',
      organization_type: 'Company / Business',
      applicant_position: 'CTO',
      organization_description: 'Software development agency',
      organization_logo: 'https://res.cloudinary.com/dktpwqspb/logo.png',
      avatar_url: 'https://res.cloudinary.com/dktpwqspb/personal_avatar.png',
      organizer_rejection_reason: null,
      organizer_info_requested_notes: null,
      organizer_applied_at: new Date('2026-11-01T10:00:00Z'),
    };
    const formattedWithPw = AuthService.formatUserResponse(userWithPasswordHash);
    assertTest('formatUserResponse sets hasPassword: true when password_hash present', formattedWithPw.hasPassword === true);
    assertTest('formatUserResponse populates applicantType', formattedWithPw.applicantType === 'Organization / Institution');
    assertTest('formatUserResponse populates organizationType', formattedWithPw.organizationType === 'Company / Business');
    assertTest('formatUserResponse populates applicantPosition', formattedWithPw.applicantPosition === 'CTO');
    assertTest('formatUserResponse keeps personal avatarUrl distinct from organizationLogo',
      formattedWithPw.avatarUrl === 'https://res.cloudinary.com/dktpwqspb/personal_avatar.png' &&
      formattedWithPw.organizationLogo === 'https://res.cloudinary.com/dktpwqspb/logo.png'
    );

    const googleUserNoPassword = {
      id: 'usr_2',
      full_name: 'Google User',
      email: 'google@example.com',
      role: 'attendee',
      password_hash: null,
      google_id: 'google_oauth_123',
    };
    const formattedGoogle = AuthService.formatUserResponse(googleUserNoPassword);
    assertTest('formatUserResponse sets hasPassword: false when password_hash is null', formattedGoogle.hasPassword === false);

    const userWithExplicitHasPassword = {
      id: 'usr_3',
      full_name: 'Fetched User',
      email: 'user3@example.com',
      role: 'attendee',
      has_password: true,
    };
    const formattedExplicit = AuthService.formatUserResponse(userWithExplicitHasPassword);
    assertTest('formatUserResponse respects explicit has_password: true boolean from DB query', formattedExplicit.hasPassword === true);
  }

  // --- 3. Email Template & Dispatch Verification ---
  console.log('\n📦 3. Testing Organizer Email Methods & Templates...');
  {
    let emailDispatched = false;
    let dispatchedSubject = '';
    let dispatchedHtml = '';

    const origDispatch = (EmailService as any).dispatchEmail;
    (EmailService as any).dispatchEmail = async (to: string, subject: string, html: string) => {
      emailDispatched = true;
      dispatchedSubject = subject;
      dispatchedHtml = html;
    };

    try {
      // Approval Email
      await EmailService.sendOrganizerApprovalEmail('org@sheeba.et', 'Kidus Yohannes', 'Addis Devs');
      assertTest('sendOrganizerApprovalEmail dispatches email', emailDispatched);
      assertTest('Approval subject congratulates the applicant', dispatchedSubject.includes('Approved'));
      assertTest('Approval HTML includes organization name', dispatchedHtml.includes('Addis Devs'));
      assertTest('Approval HTML mentions Organizer Workspace', dispatchedHtml.includes('Organizer Workspace'));

      // Rejection Email without reason
      emailDispatched = false;
      await EmailService.sendOrganizerRejectionEmail('org@sheeba.et', 'Kidus Yohannes', 'Addis Devs');
      assertTest('sendOrganizerRejectionEmail dispatches email without reason', emailDispatched);
      assertTest('Rejection subject is polite', dispatchedSubject.includes('Application'));
      assertTest('Rejection HTML explicitly affirms attendee account remains fully active', dispatchedHtml.includes('attendee account remains fully active'));

      // Rejection Email with explicit reason
      emailDispatched = false;
      await EmailService.sendOrganizerRejectionEmail('org@sheeba.et', 'Kidus Yohannes', 'Addis Devs', 'Organization website could not be verified.');
      assertTest('sendOrganizerRejectionEmail dispatches with reason', emailDispatched);
      assertTest('Rejection HTML contains the specified rejection reason', dispatchedHtml.includes('Organization website could not be verified.'));

      // Additional Information Requested Email
      emailDispatched = false;
      await EmailService.sendOrganizerInfoRequestedEmail('org@sheeba.et', 'Kidus Yohannes', 'Addis Devs', 'Please provide a valid link to your student club social media page.');
      assertTest('sendOrganizerInfoRequestedEmail dispatches email', emailDispatched);
      assertTest('Info requested subject informs the applicant', dispatchedSubject.includes('Additional Information Requested'));
      assertTest('Info requested HTML contains the requested notes', dispatchedHtml.includes('Please provide a valid link to your student club social media page.'));
      assertTest('Info requested HTML links to settings page', dispatchedHtml.includes('/app/settings'));
    } finally {
      (EmailService as any).dispatchEmail = origDispatch;
    }
  }

  // --- 4. Role Middleware Stale JWT Gate Verification ---
  console.log('\n📦 4. Testing Role Middleware Stale JWT Enforcement...');
  {
    const middleware = authorizeRoles('organizer', 'admin');

    // Case A: Admin JWT passes without DB query
    let nextCalled = false;
    let statusCode = 0;
    const reqAdmin: any = {
      user: { userId: 'admin_1', role: 'admin' },
    };
    const resMock: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { return data; },
    };
    await middleware(reqAdmin, resMock, () => { nextCalled = true; });
    assertTest('Admin role passes middleware without falling through', nextCalled);

    // Case B: Stale organizer JWT on a user who is rejected or inactive in DB
    const origQuery = query;
    try {
      (global as any).mockUserDbRow = {
        role: 'attendee',
        is_organizer: true,
        organizer_approval_status: 'rejected',
        approval_status: 'rejected',
        is_active: true,
      };

      const resForbidden: any = {
        status(code: number) { statusCode = code; return this; },
        json(payload: any) { return payload; },
      };

      const reqStaleToken: any = {
        user: { userId: 'user_rejected_1', role: 'organizer' },
      };

      let stalePassed = false;
      await middleware(reqStaleToken, resForbidden, () => { stalePassed = true; });

      assertTest('Stale organizer JWT is not short-circuited; role check verifies DB', !stalePassed || statusCode === 403);
    } finally {
      // Clean up
    }
  }

  // --- 5. Testing Public Registration with Organizer Formalization Fields ---
  console.log('\n📦 5. Testing registerSchema with Organizer Formalization...');
  {
    // Attendee: Valid registration without organizer fields and optional phone
    const validAttendee = registerSchema.safeParse({
      full_name: 'Almaz Ayana',
      email: 'almaz@example.com',
      password: 'password123',
      confirm_password: 'password123',
      role: 'ATTENDEE',
    });
    assertTest('Public Reg - Attendee: accepts valid registration without phone or organizer fields', validAttendee.success);

    // Attendee: rejects password mismatch
    const attendeeMismatch = registerSchema.safeParse({
      full_name: 'Almaz Ayana',
      email: 'almaz@example.com',
      password: 'password123',
      confirm_password: 'differentpassword',
      role: 'ATTENDEE',
    });
    assertTest('Public Reg: rejects mismatched password confirmation', !attendeeMismatch.success);

    // Public Reg: rejects ADMIN role
    const adminAttempt = registerSchema.safeParse({
      full_name: 'Admin Attempt',
      email: 'admin@example.com',
      password: 'password123',
      role: 'ADMIN',
    });
    assertTest('Public Reg: rejects creation of administrator account', !adminAttempt.success);

    // Organizer: Individual Organizer Valid
    const validIndividualOrg = registerSchema.safeParse({
      full_name: 'Kenenisa Bekele',
      email: 'kenenisa@example.com',
      password: 'password123',
      confirm_password: 'password123',
      role: 'ORGANIZER',
      phone: '+251911001122',
      applicant_type: 'Individual Organizer',
      personal_introduction: 'Community organizer hosting tech and running events across Ethiopia.',
    });
    assertTest('Public Reg - Individual Organizer: accepts valid submission with intro and phone', validIndividualOrg.success);
    if (validIndividualOrg.success) {
      assertTest('Public Reg - Individual Organizer: applicant_type normalized to Individual Organizer', validIndividualOrg.data.applicant_type === 'Individual Organizer');
      assertTest('Public Reg - Individual Organizer: personal introduction assigned to bio', validIndividualOrg.data.bio === 'Community organizer hosting tech and running events across Ethiopia.');
    }

    // Organizer: Individual Organizer missing intro
    const individualMissingIntro = registerSchema.safeParse({
      full_name: 'Kenenisa Bekele',
      email: 'kenenisa@example.com',
      password: 'password123',
      role: 'ORGANIZER',
      phone: '+251911001122',
      applicant_type: 'Individual Organizer',
      personal_introduction: 'short',
    });
    assertTest('Public Reg - Individual Organizer: rejects intro shorter than 10 chars', !individualMissingIntro.success);

    // Organizer: Individual Organizer missing phone
    const individualMissingPhone = registerSchema.safeParse({
      full_name: 'Kenenisa Bekele',
      email: 'kenenisa@example.com',
      password: 'password123',
      role: 'ORGANIZER',
      applicant_type: 'Individual Organizer',
      personal_introduction: 'Community organizer hosting tech and running events across Ethiopia.',
    });
    assertTest('Public Reg - Individual Organizer: rejects missing phone number', !individualMissingPhone.success);

    // Organizer: Organization / Institution Valid
    const validOrgReg = registerSchema.safeParse({
      full_name: 'Derartu Tulu',
      email: 'derartu@example.com',
      password: 'password123',
      confirm_password: 'password123',
      role: 'ORGANIZER',
      phone: '+251922334455',
      applicant_type: 'Organization / Institution',
      organization: 'Ethiopian Innovation Hub',
      organization_type: 'Company / Business',
      applicant_position: 'Managing Director',
      organization_description: 'Incubating startup tech events, hackathons, and founder meetups.',
      organization_website: 'https://innovationhub.et',
      organization_logo: 'https://res.cloudinary.com/demo/image/upload/sample.png',
    });
    assertTest('Public Reg - Organization: accepts valid submission with organization fields and logo', validOrgReg.success);
    if (validOrgReg.success) {
      assertTest('Public Reg - Organization: applicant_type normalized to Organization / Institution', validOrgReg.data.applicant_type === 'Organization / Institution');
      assertTest('Public Reg - Organization: preserves organization name and type', validOrgReg.data.organization === 'Ethiopian Innovation Hub' && validOrgReg.data.organization_type === 'Company / Business');
      assertTest('Public Reg - Organization: preserves applicant position', validOrgReg.data.applicant_position === 'Managing Director');
    }

    // Organizer: Organization missing required fields
    const orgMissingDesc = registerSchema.safeParse({
      full_name: 'Derartu Tulu',
      email: 'derartu@example.com',
      password: 'password123',
      role: 'ORGANIZER',
      phone: '+251922334455',
      applicant_type: 'Organization / Institution',
      organization: 'Ethiopian Innovation Hub',
      organization_type: 'Company / Business',
      applicant_position: 'Managing Director',
      organization_description: 'short',
    });
    assertTest('Public Reg - Organization: rejects description shorter than 10 chars', !orgMissingDesc.success);

    const orgInvalidType = registerSchema.safeParse({
      full_name: 'Derartu Tulu',
      email: 'derartu@example.com',
      password: 'password123',
      role: 'ORGANIZER',
      phone: '+251922334455',
      applicant_type: 'Organization / Institution',
      organization: 'Ethiopian Innovation Hub',
      organization_type: 'Invalid Organization Category',
      applicant_position: 'Managing Director',
      organization_description: 'Incubating startup tech events, hackathons, and founder meetups.',
    });
    assertTest('Public Reg - Organization: rejects invalid organization type', !orgInvalidType.success);
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
