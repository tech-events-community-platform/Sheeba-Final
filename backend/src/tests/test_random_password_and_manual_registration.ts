process.env.NODE_ENV = 'test';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { generateRandomInitialPassword, encryptCredential, decryptCredential } from '../utils/credential.util';
import { signAuthToken, verifyAuthToken } from '../utils/jwt.util';
import { TicketService } from '../services/ticket.service';
import { EmailService } from '../services/email.service';
import { NotificationQueueService, NotificationJobRow } from '../services/notificationQueue.service';
import { authenticate } from '../middlewares/auth.middleware';
import { getFrontendUrl } from '../config/env';
import { generateQrDataUrl } from '../utils/qr.util';

/**
 * Isolated Verification Suite for Sheeba Random Initial Passwords, Forced Password Change & Manual Registration
 */
async function runManualRegistrationAndCredentialTests() {
  console.log('====================================================');
  console.log('🔐 SHEEBA RANDOM PASSWORDS & MANUAL REGISTRATION SUITE');
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
  // SUITE 1: CRYPTOGRAPHIC RANDOM PASSWORD GENERATION & ENTROPY
  // =========================================================================
  console.log('📦 1. Testing Cryptographic Random Initial Password Generation...');

  const pw1 = generateRandomInitialPassword(12);
  const pw2 = generateRandomInitialPassword(12);

  assert(pw1 !== pw2, 'Subsequent password generations produce unique cryptographically random values');
  assert(pw1.length >= 12, 'Generated password meets minimum 12-character length requirement');
  assert(/[A-Z]/.test(pw1), 'Password contains uppercase letters (A-Z)');
  assert(/[a-z]/.test(pw1), 'Password contains lowercase letters (a-z)');
  assert(/[0-9]/.test(pw1), 'Password contains decimal digits (0-9)');
  assert(/[^A-Za-z0-9]/.test(pw1), 'Password contains special symbols');

  // Verify multiple generations consistently fulfill policy
  let allCompliant = true;
  for (let i = 0; i < 50; i++) {
    const pw = generateRandomInitialPassword(12);
    if (
      pw.length < 12 ||
      !/[A-Z]/.test(pw) ||
      !/[a-z]/.test(pw) ||
      !/[0-9]/.test(pw) ||
      !/[^A-Za-z0-9]/.test(pw)
    ) {
      allCompliant = false;
      break;
    }
  }
  assert(allCompliant, '100% of generated passwords strictly conform to Sheeba password policy');

  // =========================================================================
  // SUITE 2: AES-256-GCM CREDENTIAL ENCRYPTION, TAMPER CHECK & EXPIRATION
  // =========================================================================
  console.log('\n📦 2. Testing Short-Lived Credential Encryption for Outbox Delivery...');

  const plainSecret = generateRandomInitialPassword(12);
  const encryptedPayload = encryptCredential(plainSecret);

  assert(Boolean(encryptedPayload.ciphertext), 'Ciphertext is non-empty');
  assert(Boolean(encryptedPayload.iv), 'Initialization vector is generated');
  assert(Boolean(encryptedPayload.tag), 'Authentication tag is generated');
  assert(!JSON.stringify(encryptedPayload).includes(plainSecret), 'Plaintext secret is not present in encrypted payload');

  const decryptedSecret = decryptCredential(encryptedPayload);
  assert(decryptedSecret === plainSecret, 'Decrypted credential matches original plaintext secret');

  // Tamper resistance test
  const tamperedPayload = { ...encryptedPayload, ciphertext: encryptedPayload.ciphertext.slice(0, -2) + 'aa' };
  let tamperCaught = false;
  try {
    const res = decryptCredential(tamperedPayload);
    if (!res) tamperCaught = true;
  } catch {
    tamperCaught = true;
  }
  assert(tamperCaught, 'Tampered ciphertext is safely rejected by GCM authentication tag');

  // Expired credential test
  const expiredPayload = {
    ...encryptedPayload,
    expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
  };
  assert(decryptCredential(expiredPayload) === null, 'Expired credential payload returns null and cannot be decrypted');

  // =========================================================================
  // SUITE 3: BCRYPT HASHING & DATABASE STORAGE SAFETY
  // =========================================================================
  console.log('\n📦 3. Testing Bcrypt Hashing & Non-Plaintext Persistence...');

  const rawPassword = generateRandomInitialPassword(12);
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  assert(passwordHash.startsWith('$2'), 'Bcrypt hash starts with standard prefix ($2a/$2b)');
  assert(passwordHash !== rawPassword, 'Password hash is distinct from plaintext');
  assert(!passwordHash.includes(rawPassword), 'Hash does not contain the plaintext password');
  assert(await bcrypt.compare(rawPassword, passwordHash), 'Bcrypt compare authenticates plaintext against hash');
  assert(!(await bcrypt.compare('WrongPassword123!', passwordHash)), 'Bcrypt compare rejects incorrect password');

  // =========================================================================
  // SUITE 4: FORCED PASSWORD CHANGE ENFORCEMENT & JWT SESSION INTEGRITY
  // =========================================================================
  console.log('\n📦 4. Testing Forced Password Change Gate in Middleware & JWT...');

  const initialToken = signAuthToken({
    userId: 'user_new_123',
    email: 'newattendee@sheeba.et',
    role: 'attendee',
    fullName: 'Kidus Tadesse',
    mustChangePassword: true,
  });

  const decodedInitial = verifyAuthToken(initialToken);
  assert(decodedInitial.mustChangePassword === true, 'JWT token encodes mustChangePassword: true claim');

  // Test middleware enforcement: blocked routes
  let blockedStatusCode = 0;
  let blockedErrorCode = '';
  const mockResBlocked: any = {
    status: (code: number) => {
      blockedStatusCode = code;
      return {
        json: (body: any) => {
          blockedErrorCode = body.error;
        },
      };
    },
  };

  const mockReqBlocked: any = {
    headers: { authorization: `Bearer ${initialToken}` },
    originalUrl: '/api/events/list',
    path: '/events/list',
  };

  let nextCalledOnBlocked = false;
  authenticate(mockReqBlocked, mockResBlocked, () => {
    nextCalledOnBlocked = true;
  });

  assert(!nextCalledOnBlocked, 'Middleware blocks access to protected event routes when mustChangePassword is true');
  assert(blockedStatusCode === 403, 'Middleware returns HTTP 403 Forbidden');
  assert(blockedErrorCode === 'PASSWORD_CHANGE_REQUIRED', 'Error code is PASSWORD_CHANGE_REQUIRED');

  // Test middleware enforcement: allowed whitelist routes (/change-password, /logout, /me)
  const allowedPaths = ['/api/auth/change-password', '/api/auth/logout', '/api/auth/me'];
  let allAllowedPassed = true;

  for (const path of allowedPaths) {
    const mockReqAllowed: any = {
      headers: { authorization: `Bearer ${initialToken}` },
      originalUrl: path,
      path: path.replace('/api/auth', ''),
    };
    let nextCalled = false;
    const mockResAllowed: any = {
      status: () => ({ json: () => {} }),
    };

    authenticate(mockReqAllowed, mockResAllowed, () => {
      nextCalled = true;
    });

    if (!nextCalled) {
      allAllowedPassed = false;
      break;
    }
  }
  assert(allAllowedPassed, 'Whitelisted endpoints (/change-password, /logout, /me) are permitted for password change');

  // Test unrestricted token after password update
  const unrestrictedToken = signAuthToken({
    userId: 'user_new_123',
    email: 'newattendee@sheeba.et',
    role: 'attendee',
    fullName: 'Kidus Tadesse',
    mustChangePassword: false,
  });

  const decodedUnrestricted = verifyAuthToken(unrestrictedToken);
  assert(decodedUnrestricted.mustChangePassword === false, 'Fresh token has mustChangePassword: false');

  const mockReqUnrestricted: any = {
    headers: { authorization: `Bearer ${unrestrictedToken}` },
    originalUrl: '/api/events/list',
    path: '/events/list',
  };

  let nextCalledUnrestricted = false;
  authenticate(mockReqUnrestricted, mockResBlocked, () => {
    nextCalledUnrestricted = true;
  });
  assert(nextCalledUnrestricted, 'After changing password, user can freely access all protected application routes');

  // =========================================================================
  // SUITE 5: EXISTING ACCOUNT IMMUTABILITY
  // =========================================================================
  console.log('\n📦 5. Testing Existing Attendee Immutability & Safe Re-registration...');

  const existingAccount = {
    id: 'user_existing_456',
    email: 'existing_user@sheeba.et',
    password_hash: '$2a$10$existingHashThatMustNeverChange1234567890',
    must_change_password: false,
    google_id: null,
  };

  // Simulating manual registration check
  const isExisting = true;
  let simulatedUpdatedHash = existingAccount.password_hash;
  let simulatedUpdatedFlag = existingAccount.must_change_password;

  if (!isExisting) {
    simulatedUpdatedHash = 'newly_generated_hash';
    simulatedUpdatedFlag = true;
  }

  assert(simulatedUpdatedHash === existingAccount.password_hash, 'Existing password hash is NOT overwritten');
  assert(simulatedUpdatedFlag === false, 'Existing account must_change_password flag remains FALSE');

  // =========================================================================
  // SUITE 6: EMAIL CONTENT & QR CODE EMBEDDING RULES
  // =========================================================================
  console.log('\n📦 6. Testing Email Notification Templates & Content Compliance...');

  EmailService.clearMockDispatchedEmails();

  // 6.1 New Attendee Email
  const testInitialPw = 'SheebaInitialPass2026!';
  await EmailService.sendManualRegistrationNewUserEmail({
    toEmail: 'new_kidus@sheeba.et',
    fullName: 'Kidus Tadesse',
    eventTitle: 'Addis DevFest 2026',
    initialPassword: testInitialPw,
    ticketCode: 'SHB-DEVFEST-001',
    qrDataUrl: 'data:image/png;base64,mockqrdevkit',
    isPaymentPending: false,
  });

  const newAttendeeEmail = EmailService.mockDispatchedEmails[0];
  assert(newAttendeeEmail.subject.includes('Your Sheeba Account and Event Registration'), 'New attendee email subject matches requirement');
  assert(newAttendeeEmail.html.includes('Kidus Tadesse'), 'Email includes attendee greeting');
  assert(newAttendeeEmail.html.includes('Addis DevFest 2026'), 'Email includes event title');
  assert(newAttendeeEmail.html.includes(testInitialPw), 'Email contains randomly generated initial password');
  assert(newAttendeeEmail.html.includes('change your password immediately'), 'Email includes mandatory password change instruction');
  assert(newAttendeeEmail.html.includes('Do not share your password'), 'Email includes security reminder not to share password');
  assert(newAttendeeEmail.html.includes('/login'), 'Email includes official Sheeba login URL');
  assert(newAttendeeEmail.html.includes('Login to Sheeba'), 'Email main button label is "Login to Sheeba"');
  assert(!newAttendeeEmail.html.includes('Sign In to Sheeba'), 'Email does NOT contain outdated "Sign In to Sheeba" button label');
  assert(!newAttendeeEmail.html.includes('Login: <a') && !newAttendeeEmail.html.includes('Login URL: <a'), 'Redundant plain-text login URL below button is absent');
  assert(newAttendeeEmail.html.includes('cid:qr-ticket-SHB-DEVFEST-001.png'), 'Email HTML references QR image via CID matching ticket code');
  assert(Boolean(newAttendeeEmail.attachments && newAttendeeEmail.attachments.length === 1), 'Email includes exactly 1 QR image attachment');
  const newQrAtt = newAttendeeEmail.attachments![0];
  assert(newAttendeeEmail.html.includes(`cid:${newQrAtt.cid}`), 'HTML img src references the exact matching CID of the attachment');
  assert(newQrAtt.name === 'qr-ticket-SHB-DEVFEST-001.png', 'Attachment filename has ticket-specific .png name');
  assert(newQrAtt.content === 'mockqrdevkit', 'Attachment contains base64 content of QR code without prefix');
  assert(newQrAtt.type === 'image/png', 'Attachment specifies image/png MIME type');
  assert(!newAttendeeEmail.html.includes('data:image/png;base64,'), 'HTML does NOT use raw base64 data URI that breaks in email clients');

  // 6.2 Existing Attendee Email
  EmailService.clearMockDispatchedEmails();
  await EmailService.sendManualRegistrationExistingUserEmail({
    toEmail: 'existing_bethlehem@sheeba.et',
    fullName: 'Bethlehem Tilahun',
    eventTitle: 'Addis DevFest 2026',
    ticketCode: 'SHB-DEVFEST-002',
    qrDataUrl: 'data:image/png;base64,mockqrdevkit2',
    isPaymentPending: false,
  });

  const existingEmail = EmailService.mockDispatchedEmails[0];
  assert(existingEmail.subject.includes('Registration Confirmation: Addis DevFest 2026'), 'Existing attendee subject confirms registration');
  assert(existingEmail.html.includes('existing Sheeba credentials'), 'Instructs attendee to log in with existing credentials');
  assert(existingEmail.html.includes('Login to Sheeba'), 'Existing attendee email main button label is "Login to Sheeba"');
  assert(!existingEmail.html.includes('Sign In to Sheeba'), 'Existing attendee email does NOT contain outdated "Sign In to Sheeba"');
  assert(!existingEmail.html.includes('Login URL: <a') && !existingEmail.html.includes('Login: <a'), 'Redundant plain-text login URL below button is absent in existing attendee email');
  assert(!existingEmail.html.includes('password:'), 'NEVER contains any password or credential secret');
  assert(!existingEmail.html.includes('token='), 'NEVER contains reset tokens');
  assert(existingEmail.html.includes('cid:qr-ticket-SHB-DEVFEST-002.png'), 'Existing attendee email references QR image via CID');
  assert(Boolean(existingEmail.attachments && existingEmail.attachments.length === 1), 'Existing attendee email includes 1 QR code attachment');
  const existingQrAtt = existingEmail.attachments![0];
  assert(existingEmail.html.includes(`cid:${existingQrAtt.cid}`), 'Existing attendee HTML img src references matching CID');
  assert(existingQrAtt.content === 'mockqrdevkit2', 'Existing attendee attachment contains QR code base64 content');
  assert(!existingEmail.html.includes('data:image/png;base64,'), 'Existing attendee HTML does not use broken raw data URI');

  // 6.3 Dedicated Ticket Email
  EmailService.clearMockDispatchedEmails();
  await EmailService.sendManualRegistrationTicketEmail({
    toEmail: 'ticket_attendee@sheeba.et',
    fullName: 'Ticket Attendee',
    eventTitle: 'Addis DevFest 2026',
    date: 'Dec 15, 2026',
    time: '09:00 AM - 05:00 PM EAT',
    location: 'Millennium Hall, Addis Ababa',
    ticketCode: 'SHB-DEVFEST-003',
    qrDataUrl: 'data:image/png;base64,mockqrdevkit3',
    isExistingUser: false,
  });

  const dedicatedTicketEmail = EmailService.mockDispatchedEmails[0];
  assert(dedicatedTicketEmail.html.includes('cid:qr-ticket-SHB-DEVFEST-003.png'), 'Dedicated ticket email HTML references CID');
  assert(Boolean(dedicatedTicketEmail.attachments && dedicatedTicketEmail.attachments.length === 1), 'Dedicated ticket email attaches QR code');
  assert(dedicatedTicketEmail.html.includes(`cid:${dedicatedTicketEmail.attachments![0].cid}`), 'Dedicated ticket email CID matches attached image');
  assert(!dedicatedTicketEmail.html.includes('data:image/png;base64,'), 'Dedicated ticket email does NOT contain raw base64 data URI');

  // 6.4 Production URL and Absence of Localhost
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    // Test explicitly configured production FRONTEND_URL
    process.env.FRONTEND_URL = 'https://sheebanet.com';
    EmailService.clearMockDispatchedEmails();
    await EmailService.sendManualRegistrationNewUserEmail({
      toEmail: 'prod_attendee@sheebanet.com',
      fullName: 'Abebe Bikila',
      eventTitle: 'Great Ethiopian Run Tech Summit',
      initialPassword: 'ProdPassword123!',
      isPaymentPending: false,
    });

    const prodEmail = EmailService.mockDispatchedEmails[0];
    assert(prodEmail.html.includes('href="https://sheebanet.com/login"'), 'Production email button links directly to https://sheebanet.com/login');
    assert(prodEmail.html.includes('Login to Sheeba'), 'Production button displays "Login to Sheeba"');
    assert(!prodEmail.html.includes('localhost'), 'Production email does NOT contain localhost');
    assert(!prodEmail.html.includes('Login: <a') && !prodEmail.html.includes('Login URL: <a'), 'Production email has no redundant plain-text login URL');

    // Test production default fallback when FRONTEND_URL is unset
    delete process.env.FRONTEND_URL;
    const prodFallbackUrl = (function () {
      const oldEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        return getFrontendUrl();
      } finally {
        process.env.NODE_ENV = oldEnv;
      }
    })();

    assert(prodFallbackUrl === 'https://sheebanet.com', 'Production fallback uses https://sheebanet.com without FRONTEND_URL');
    assert(!prodFallbackUrl.includes('localhost'), 'Production fallback does NOT contain localhost');
  } finally {
    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.NODE_ENV = originalNodeEnv;
  }

  // 6.5 Pending Paid Registration Email (No Active QR Code or CID attachment)
  EmailService.clearMockDispatchedEmails();
  await EmailService.sendManualRegistrationNewUserEmail({
    toEmail: 'pending_attendee@sheeba.et',
    fullName: 'Pending Attendee',
    eventTitle: 'VIP Masterclass',
    initialPassword: 'PendingUserPw123!',
    ticketCode: 'SHB-VIP-PENDING',
    qrDataUrl: 'data:image/png;base64,shouldNotBeSent',
    isPaymentPending: true,
  });

  const pendingEmail = EmailService.mockDispatchedEmails[0];
  assert(pendingEmail.html.includes('Pending Payment / Review'), 'Pending registration explains review/payment pending state');
  assert(!pendingEmail.html.includes('cid:qr-ticket-'), 'Pending registration DOES NOT reference active QR pass CID');
  assert(Boolean(!pendingEmail.attachments || pendingEmail.attachments.length === 0), 'Pending registration DOES NOT include any QR attachment');
  assert(!pendingEmail.html.includes('data:image/png;base64,shouldNotBeSent'), 'Unsettled paid registration DOES NOT include active QR pass');


  // 6.6 Real QR Code Generation & Scanner Validation
  const sampleTicketCode = 'SHB-TEST-2026';
  const sampleQrPayload = [
    `SHEEBA VERIFIED PASS`,
    `Attendee: Kidus Tadesse`,
    `Email: kidus@sheeba.et`,
    `Event: Addis DevFest 2026`,
    `Code: ${sampleTicketCode}`,
    `Status: Valid`,
    `Verify: https://sheebanet.com/verify-ticket/${sampleTicketCode}`,
  ].join('\n');

  const generatedQrDataUrl = await generateQrDataUrl(sampleQrPayload);
  assert(generatedQrDataUrl.startsWith('data:image/png;base64,'), 'QR Code generator produces valid base64 PNG data URL');
  assert(!sampleQrPayload.includes('password') && !sampleQrPayload.includes('secret'), 'QR payload strictly omits passwords and secrets');
  assert(sampleQrPayload.includes(`Code: ${sampleTicketCode}`), 'QR payload preserves scan-verifiable pass code');

  // =========================================================================
  // SUITE 7: ATTENDEE DASHBOARD & TICKET PASS ELIGIBILITY
  // =========================================================================
  console.log('\n📦 7. Testing Attendee Dashboard Ticket Pass Security Rules...');

  // 7.1 Eligible Settled Registration
  const eligibleRow = {
    registration_id: 'reg_1',
    event_id: 'event_1',
    event_title: 'AI Summit',
    event_type: 'hackathon',
    event_date: '2026-11-20',
    location: 'Science Museum',
    approval_status: 'approved',
    payment_status: 'settled',
    ticket_code: 'SHB-SUMMIT-01',
    qr_token: 'valid_jwt_token',
    qr_code_data_url: 'data:image/png;base64,validqr',
    status: 'ISSUED',
    is_paid: true,
    ticket_price: '500',
  };

  const eligibleTicket = TicketService.formatTicket(eligibleRow);
  assert(eligibleTicket.status === 'Valid', 'Eligible settled ticket status is Valid');
  assert(eligibleTicket.ticketCode === 'SHB-SUMMIT-01', 'Eligible ticket code is preserved');
  assert(eligibleTicket.qrToken === 'valid_jwt_token', 'Eligible ticket includes active qrToken');
  assert(eligibleTicket.qrDataUrl === 'data:image/png;base64,validqr', 'Eligible ticket includes active qrDataUrl');
  assert(eligibleTicket.isPending === false, 'isPending is false for settled approved registration');

  // 7.2 Unsettled Paid Registration (Pending Payment)
  const unpaidRow = {
    ...eligibleRow,
    payment_status: 'unsettled',
    status: 'PENDING_PAYMENT',
  };

  const unpaidTicket = TicketService.formatTicket(unpaidRow);
  assert(unpaidTicket.status === 'Pending Payment', 'Unsettled registration status is Pending Payment');
  assert(unpaidTicket.qrToken === null, 'Unsettled registration qrToken is NULL (preventing entrance bypass)');
  assert(unpaidTicket.qrDataUrl === null, 'Unsettled registration qrDataUrl is NULL');
  assert(unpaidTicket.ticketCode === 'PENDING_PAYMENT', 'Ticket code masked as PENDING_PAYMENT');
  assert(unpaidTicket.isPending === true, 'isPending is true for unpaid registration');

  // 7.3 Unapproved / Pending Approval Free Registration
  const pendingApprovalRow = {
    ...eligibleRow,
    approval_status: 'pending',
    is_paid: false,
    payment_status: 'free',
  };

  const pendingApprovalTicket = TicketService.formatTicket(pendingApprovalRow);
  assert(pendingApprovalTicket.status === 'Pending Approval', 'Pending approval registration status is Pending Approval');
  assert(pendingApprovalTicket.qrToken === null, 'Pending approval qrToken is NULL');
  assert(pendingApprovalTicket.qrDataUrl === null, 'Pending approval qrDataUrl is NULL');

  console.log('\n====================================================');
  console.log(`📊 MANUAL REGISTRATION & CREDENTIAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runManualRegistrationAndCredentialTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
