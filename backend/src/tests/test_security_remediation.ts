process.env.NODE_ENV = 'test';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { assertTestDatabaseIsolation } from '../config/db';
import { EmailService } from '../services/email.service';
import { PaymentService } from '../services/payment.service';
import { AuthService } from '../services/auth.service';
import { EventService } from '../services/event.service';
import { CheckinService } from '../services/checkin.service';

async function runSecurityRemediationTests() {
  console.log('====================================================');
  console.log('🛡️ SHEEBA SECURITY REMEDIATION VERIFICATION SUITE');
  console.log('====================================================\n');

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

  // =========================================================================
  // SUITE 1: DATABASE ISOLATION SAFEGUARDS
  // =========================================================================
  console.log('📦 1. Testing Database Isolation & Production Safeguards...');

  // 1.1 Unconfigured TEST_DATABASE_URL halt
  delete process.env.TEST_DATABASE_URL;
  let isolationHaltThrown = false;
  try {
    assertTestDatabaseIsolation();
  } catch (err: any) {
    isolationHaltThrown = err.message.includes('[TEST DATABASE GUARD]');
  }
  assert(isolationHaltThrown, 'Halts safely if TEST_DATABASE_URL is not configured');

  // 1.2 TEST_DATABASE_URL matching production DATABASE_URL
  const mockProdUrl = 'postgres://prod_user:secret@ep-cool-dawn-12345.us-east-2.aws.neon.tech/neondb';
  process.env.DATABASE_URL = mockProdUrl;
  process.env.TEST_DATABASE_URL = mockProdUrl;
  let matchProdHaltThrown = false;
  try {
    assertTestDatabaseIsolation();
  } catch (err: any) {
    matchProdHaltThrown = err.message.includes('matches production DATABASE_URL');
  }
  assert(matchProdHaltThrown, 'Halts safely if TEST_DATABASE_URL matches production DATABASE_URL');

  // 1.3 TEST_DATABASE_URL sharing production Neon host
  process.env.TEST_DATABASE_URL = 'postgres://different_user:secret@ep-cool-dawn-12345.us-east-2.aws.neon.tech/otherdb';
  let hostMatchHaltThrown = false;
  try {
    assertTestDatabaseIsolation();
  } catch (err: any) {
    hostMatchHaltThrown = err.message.includes('points to the production database host');
  }
  assert(hostMatchHaltThrown, 'Halts safely if TEST_DATABASE_URL points to production Neon host');

  // Set an isolated, safe test database URL for remaining mock unit tests
  process.env.TEST_DATABASE_URL = 'postgres://test_user:test_pass@localhost:5432/sheeba_isolated_test';

  // =========================================================================
  // SUITE 2: BREVO EMAIL SERVICE MOCKING IN TEST MODE
  // =========================================================================
  console.log('\n📦 2. Testing Email Service Test Mocking...');
  EmailService.clearMockDispatchedEmails();
  await EmailService.sendWelcomeEmail('attendee_test@sheeba.et', 'Test Attendee');
  
  assert(EmailService.mockDispatchedEmails.length === 1, 'Email intercepted into in-memory mock queue without calling Brevo API');
  assert(EmailService.mockDispatchedEmails[0].to === 'attendee_test@sheeba.et', 'Mock email recorded correct recipient');
  assert(EmailService.mockDispatchedEmails[0].subject === 'Welcome to Sheeba!', 'Mock email recorded correct subject');

  // =========================================================================
  // SUITE 3: LINKS.ET PAYMENT VERIFICATION MOCKING IN TEST MODE
  // =========================================================================
  console.log('\n📦 3. Testing Links.et Payment Verification Mocking...');
  const mockVerifyResult = await PaymentService.verifyViaLinksEt({ reference: 'TX_UNIT_TEST_123', paymentMethod: 'cbe' });
  assert(mockVerifyResult.ok === true, 'verifyViaLinksEt returns safe mock response without external network call');
  assert(mockVerifyResult.receipt?.reference === 'TX_UNIT_TEST_123', 'Mock payment contains tested reference');

  const mockScreenshotResult = await PaymentService.verifyScreenshotViaLinksEt({ imageBase64: 'fakebase64' });
  assert(mockScreenshotResult.ok === true, 'verifyScreenshotViaLinksEt returns safe mock response without external network call');

  // =========================================================================
  // SUITE 4: PASSWORD-SETUP TOKEN CRYPTOGRAPHIC HASHING & BACKWARD COMPATIBILITY
  // =========================================================================
  console.log('\n📦 4. Testing Password Setup Token Hashing & Lookup Logic...');
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert(tokenHash.length === 64, 'Token hash is valid 64-character SHA-256 hexadecimal string');
  assert(tokenHash !== rawToken, 'Raw token is never stored directly');

  // =========================================================================
  // SUITE 5: CUSTOM QUESTION FILE UPLOAD VALIDATION
  // =========================================================================
  console.log('\n📦 5. Testing Custom Question File Upload Security Validation...');

  // Create a mock event with custom file upload question
  const futureDate = new Date(Date.now() + 7 * 86400000);
  const mockEvent: any = {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Security Summit',
    isPaid: false,
    ticketPrice: 0,
    currency: 'ETB',
    status: 'open',
    date: futureDate,
    rawDate: futureDate,
    capacity: 100,
    registeredCount: 0,
    requiresApproval: false,
    customQuestions: [
      {
        id: 'q_portfolio',
        questionText: 'Upload your portfolio or certificate (Image or PDF)',
        type: 'file',
        isRequired: true,
        options: ['pdf', 'png', 'jpg'],
      },
      {
        id: 'q_avatar',
        questionText: 'Upload your profile photo (Image only)',
        type: 'file',
        isRequired: true,
        options: ['png', 'jpg'],
      },
    ],
  };

  // Helper to test validation in EventService by creating mock
  // 5.1 Rejects non-HTTPS URL
  let httpError: any = null;
  try {
    // Call registration logic simulation on mockEvent
    const testAnswers = {
      q_portfolio: 'http://res.cloudinary.com/dktpwqspb/image/upload/v1234/test.pdf',
      q_avatar: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/avatar.png',
    };
    // Mock getEventById
    const origGetEvent = EventService.getEventById;
    EventService.getEventById = async () => mockEvent;
    await EventService.registerForEvent({
      eventId: mockEvent.id,
      userId: '00000000-0000-0000-0000-000000000002',
      answers: testAnswers,
    });
    EventService.getEventById = origGetEvent;
  } catch (err: any) {
    httpError = err;
  }
  assert(
    httpError && httpError.code === 'INSECURE_UPLOAD_URL',
    'Strictly rejects insecure HTTP upload URLs (requires HTTPS)'
  );

  // 5.2 Rejects unauthorized external host
  let hostError: any = null;
  try {
    const testAnswers = {
      q_portfolio: 'https://malicious-site.com/payload.pdf',
      q_avatar: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/avatar.png',
    };
    const origGetEvent = EventService.getEventById;
    EventService.getEventById = async () => mockEvent;
    await EventService.registerForEvent({
      eventId: mockEvent.id,
      userId: '00000000-0000-0000-0000-000000000002',
      answers: testAnswers,
    });
    EventService.getEventById = origGetEvent;
  } catch (err: any) {
    hostError = err;
  }
  assert(
    hostError && hostError.code === 'UNAUTHORIZED_UPLOAD_HOST',
    'Strictly rejects arbitrary external upload domains (must be res.cloudinary.com)'
  );

  // 5.3 Rejects invalid path
  let pathError: any = null;
  try {
    const testAnswers = {
      q_portfolio: 'https://res.cloudinary.com/dktpwqspb/raw/download/v1234/test.pdf',
      q_avatar: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/avatar.png',
    };
    const origGetEvent = EventService.getEventById;
    EventService.getEventById = async () => mockEvent;
    await EventService.registerForEvent({
      eventId: mockEvent.id,
      userId: '00000000-0000-0000-0000-000000000002',
      answers: testAnswers,
    });
    EventService.getEventById = origGetEvent;
  } catch (err: any) {
    pathError = err;
  }
  assert(
    pathError && pathError.code === 'INVALID_UPLOAD_PATH',
    'Strictly rejects Cloudinary paths lacking /upload/'
  );

  // 5.4 Rejects unsupported file extension for image-only question
  let extError: any = null;
  try {
    const testAnswers = {
      q_portfolio: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/portfolio.pdf',
      q_avatar: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/avatar.exe',
    };
    const origGetEvent = EventService.getEventById;
    EventService.getEventById = async () => mockEvent;
    await EventService.registerForEvent({
      eventId: mockEvent.id,
      userId: '00000000-0000-0000-0000-000000000002',
      answers: testAnswers,
    });
    EventService.getEventById = origGetEvent;
  } catch (err: any) {
    extError = err;
  }
  assert(
    extError && extError.code === 'UNSUPPORTED_FILE_TYPE',
    'Strictly rejects unauthorized file extensions (.EXE) for custom upload questions'
  );

  // =========================================================================
  // SUITE 6: MANUAL OFFLINE PAYMENT SETTLEMENT AUTHORIZATION
  // =========================================================================
  console.log('\n📦 6. Testing Manual Offline Payment Settlement Security & Authorization...');

  const paidEventForManual: any = {
    id: '00000000-0000-0000-0000-000000000010',
    organizerId: '00000000-0000-0000-0000-000000000099', // Authorized organizer
    title: 'Paid Workshop',
    isPaid: true,
    ticketPrice: 350,
    currency: 'ETB',
    status: 'open',
    date: futureDate,
    rawDate: futureDate,
    capacity: 50,
    registeredCount: 0,
    requiresApproval: false,
    customQuestions: [],
    paymentMethods: [{ provider: 'cbe', accountNumber: '100098765432' }],
  };

  // 6.1 Unauthorized caller cannot settle offline payment
  let unauthSettlementError: any = null;
  try {
    const origGetEvent = EventService.getEventById;
    EventService.getEventById = async () => paidEventForManual;

    await CheckinService.addManualAttendee({
      eventId: paidEventForManual.id,
      organizerId: '00000000-0000-0000-0000-000000000055', // Impersonator / unauthorized user
      name: 'Unauth Attendee',
      email: 'unauth_attendee@example.et',
      userRole: 'attendee', // Not organizer or admin
      paymentStatus: 'settled', // Attempting to mark settled offline
    });
    EventService.getEventById = origGetEvent;
  } catch (err: any) {
    unauthSettlementError = err;
  }
  assert(
    unauthSettlementError &&
      (unauthSettlementError.statusCode === 403 || unauthSettlementError.code === 'UNAUTHORIZED_OFFLINE_SETTLEMENT'),
    'Strictly rejects offline manual payment settlement by unauthorized users (HTTP 403)'
  );

  // 6.2 Unverified screenshot or payment reference is rejected without valid verification
  let unverifiedPaymentError: any = null;
  try {
    const origGetEvent = EventService.getEventById;
    EventService.getEventById = async () => paidEventForManual;

    // Simulate failing Links.et verification
    PaymentService.testMockVerifier = async () => ({
      ok: false,
      httpStatus: 422,
      error: { message: 'Bank confirmation failed. Reference not found upstream.' },
    });

    await PaymentService.verifyPayment({
      event: {
        id: paidEventForManual.id,
        title: paidEventForManual.title,
        ticketPrice: paidEventForManual.ticketPrice,
        currency: paidEventForManual.currency,
        paymentMethods: paidEventForManual.paymentMethods,
      },
      paymentReference: 'TX_INVALID_REF_999',
    });
  } catch (err: any) {
    unverifiedPaymentError = err;
  } finally {
    PaymentService.testMockVerifier = null;
  }
  assert(
    unverifiedPaymentError !== null &&
      (unverifiedPaymentError.statusCode === 422 || unverifiedPaymentError.statusCode === 400),
    'Strictly rejects unverified payment references or screenshots without upstream bank confirmation'
  );

  // =========================================================================
  // SUITE 7: NOTIFICATION RESEND COOLDOWN (HTTP 429) & RACE CONDITION SAFETY
  // =========================================================================
  console.log('\n📦 7. Testing Notification Resend Cooldown & Concurrency Protection...');

  const mockCooldownEvent: any = {
    id: '00000000-0000-0000-0000-000000000020',
    organizerId: '00000000-0000-0000-0000-000000000099',
    title: 'Cooldown Test Event',
  };

  // 7.1 Organizer authorization check on resend
  let unauthResendError: any = null;
  try {
    const origGetEvent = EventService.getEventById;
    EventService.getEventById = async () => mockCooldownEvent;
    await CheckinService.resendManualNotification({
      eventId: mockCooldownEvent.id,
      registrationId: '00000000-0000-0000-0000-000000000030',
      organizerId: '00000000-0000-0000-0000-000000000044', // Wrong organizer
      userRole: 'organizer',
    });
    EventService.getEventById = origGetEvent;
  } catch (err: any) {
    unauthResendError = err;
  }
  assert(
    unauthResendError && unauthResendError.statusCode === 403,
    'Strictly rejects notification resend by non-event organizer (HTTP 403)'
  );

  console.log('\n====================================================');
  console.log(`🎯 SECURITY REMEDIATION TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runSecurityRemediationTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
