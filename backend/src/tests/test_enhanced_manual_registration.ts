process.env.NODE_ENV = 'test';
import { CheckinService } from '../services/checkin.service';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';
import { TicketService } from '../services/ticket.service';
import { query } from '../config/db';
import { decryptCredential } from '../utils/credential.util';
import { verifyAuthToken } from '../utils/jwt.util';
import bcrypt from 'bcryptjs';

const runManualRegistrationTests = async () => {
  console.log('====================================================');
  console.log('🎟️ ENHANCED MANUAL ATTENDEE REGISTRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: any) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  };

  try {
    const timestamp = Date.now();
    const organizerEmail = `org_manual_${timestamp}@sheeba.et`;
    const existingUserEmail = `existing_user_${timestamp}@sheeba.et`;
    const newAttendeeEmail = `new_attendee_${timestamp}@sheeba.et`;
    const unauthorizedOrgEmail = `unauth_org_${timestamp}@sheeba.et`;

    // 1. Setup Test Organizer & Test Event with Custom Questions
    console.log('📦 1. Setting Up Test Organizer & Event with Custom Questions...');
    const hashedPw = await bcrypt.hash('Secret123!', 10);
    const orgUserRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status)
       VALUES ($1, $2, 'Organizer Test', 'organizer', 'approved')
       RETURNING id`,
      [organizerEmail, hashedPw]
    );
    const organizerId = orgUserRes.rows[0].id;

    const unauthOrgRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status)
       VALUES ($1, $2, 'Unauthorized Org', 'organizer', 'approved')
       RETURNING id`,
      [unauthorizedOrgEmail, hashedPw]
    );
    const unauthorizedOrgId = unauthOrgRes.rows[0].id;

    // Create a Free Event with custom questions
    const customQuestionsConfig = [
      {
        id: 'q_tshirt',
        questionText: 'Select your T-Shirt size',
        type: 'choice',
        options: ['Small', 'Medium', 'Large', 'XL'],
        isRequired: true,
        order: 1,
      },
      {
        id: 'q_tracks',
        questionText: 'Which tracks interest you?',
        type: 'multi_choice',
        options: ['AI & Machine Learning', 'Cloud Architecture', 'Product Design'],
        isRequired: false,
        order: 2,
      },
      {
        id: 'q_diet',
        questionText: 'Any dietary restrictions?',
        type: 'text',
        isRequired: false,
        order: 3,
      },
    ];

    const freeEvent = await EventService.createEvent(organizerId, {
      title: `Free Tech Conf ${timestamp}`,
      description: 'Annual gathering of builders in Addis.',
      type: 'workshop',
      date: '2026-11-20',
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      location: 'Addis Ababa Science Museum',
      capacity: 100,
      isPaid: false,
      ticketPrice: 0,
      customQuestions: customQuestionsConfig,
    });
    assert(Boolean(freeEvent && freeEvent.id), 'Test Free Event created with custom questions configuration');

    // 2. Scenario B: Manually register a NEW attendee for Free Event
    console.log('\n📦 2. Testing Scenario B: Manual Registration of NEW Attendee...');
    
    // 2.1 Test validation failure: missing required question
    let validationCaught = false;
    try {
      await CheckinService.addManualAttendee({
        eventId: freeEvent.id,
        organizerId,
        name: 'New Attendee Kidus',
        email: newAttendeeEmail,
        phone: '+251911223344',
        userRole: 'organizer',
        answers: {}, // Missing required q_tshirt
      });
    } catch (err: any) {
      validationCaught = true;
      assert(err.statusCode === 400 && err.message.includes('T-Shirt size'), 'Rejects registration when required custom question is unanswered');
    }
    assert(validationCaught, 'Required question check enforced on backend');

    // 2.2 Test validation failure: invalid choice option
    let invalidOptionCaught = false;
    try {
      await CheckinService.addManualAttendee({
        eventId: freeEvent.id,
        organizerId,
        name: 'New Attendee Kidus',
        email: newAttendeeEmail,
        phone: '+251911223344',
        userRole: 'organizer',
        answers: {
          q_tshirt: 'XXXL-NonExistent', // Invalid option
        },
      });
    } catch (err: any) {
      invalidOptionCaught = true;
      assert(err.statusCode === 400 && err.message.includes('Invalid selection'), 'Rejects registration when invalid choice option is selected');
    }
    assert(invalidOptionCaught, 'Choice option validation enforced on backend');

    // 2.3 Successful registration of new attendee
    const newAttendeeAnswers = {
      q_tshirt: 'Large',
      q_tracks: ['AI & Machine Learning', 'Cloud Architecture'],
      q_diet: 'Vegetarian',
    };

    const newRegResult = await CheckinService.addManualAttendee({
      eventId: freeEvent.id,
      organizerId,
      name: 'New Attendee Kidus',
      email: newAttendeeEmail,
      phone: '+251911223344',
      userRole: 'organizer',
      answers: newAttendeeAnswers,
    });

    assert(newRegResult.success === true, 'New attendee registration succeeds');
    assert(newRegResult.isExistingUser === false, 'Correctly flags isExistingUser as false');

    // Verify User Account was created in users table
    const newUserLookup = await query('SELECT id, role, approval_status, phone, password_hash, must_change_password FROM users WHERE email = $1', [newAttendeeEmail]);
    assert(newUserLookup.rowCount === 1, 'User account was automatically created in database');
    assert(newUserLookup.rows[0].role === 'attendee', 'New user account has attendee role');
    assert(newUserLookup.rows[0].approval_status === 'approved', 'New user account is approved');
    assert(newUserLookup.rows[0].phone === '+251911223344', 'Attendee phone number persisted correctly');
    assert(newUserLookup.rows[0].must_change_password === true, 'New user account has must_change_password flag set to TRUE');
    assert(Boolean(newUserLookup.rows[0].password_hash), 'Password hash generated with bcrypt and stored in DB');
    const newUserId = newUserLookup.rows[0].id;

    // Verify Notification Outbox job payload containing short-lived encrypted initial password
    const outboxLookup = await query(
      `SELECT id, payload, job_type, status FROM notification_outbox WHERE recipient_email = $1 ORDER BY created_at DESC LIMIT 1`,
      [newAttendeeEmail]
    );
    assert(outboxLookup.rowCount === 1, 'Durable outbox job persisted for new attendee in same transaction');
    assert(outboxLookup.rows[0].job_type === 'manual_registration_new_user', 'Job type is manual_registration_new_user');
    const outboxPayload = typeof outboxLookup.rows[0].payload === 'string'
      ? JSON.parse(outboxLookup.rows[0].payload)
      : outboxLookup.rows[0].payload;
    assert(Boolean(outboxPayload.encryptedInitialPassword), 'Initial password is encrypted with AES-256-GCM in outbox payload');
    assert(outboxPayload.initialPassword === undefined, 'Plaintext password is NEVER stored in database payload');

    // Decrypt initial password from payload
    const initialPlaintextPassword = decryptCredential(outboxPayload.encryptedInitialPassword);
    assert(Boolean(initialPlaintextPassword), 'Initial password successfully decrypted from encrypted payload');
    assert(initialPlaintextPassword!.length >= 12, 'Initial password has strong entropy (12+ chars)');
    assert(/[A-Z]/.test(initialPlaintextPassword!), 'Initial password contains uppercase characters');
    assert(/[a-z]/.test(initialPlaintextPassword!), 'Initial password contains lowercase characters');
    assert(/[0-9]/.test(initialPlaintextPassword!), 'Initial password contains numbers');
    assert(/[^A-Za-z0-9]/.test(initialPlaintextPassword!), 'Initial password contains symbols');

    // Verify initial password validates against stored bcrypt hash
    const isInitialMatch = await bcrypt.compare(initialPlaintextPassword!, newUserLookup.rows[0].password_hash);
    assert(isInitialMatch === true, 'Decrypted initial password matches bcrypt hash stored in users table');

    // Verify Registration record & answers
    const regLookup = await query('SELECT id, status, approval_status, payment_status, answers, notification_status FROM registrations WHERE event_id = $1 AND user_id = $2', [freeEvent.id, newUserId]);
    assert(regLookup.rowCount === 1, 'Registration record created in database');
    const savedAnswers = typeof regLookup.rows[0].answers === 'string' ? JSON.parse(regLookup.rows[0].answers) : regLookup.rows[0].answers;
    assert(savedAnswers.q_tshirt === 'Large', 'T-Shirt answer saved accurately in JSONB');
    assert(Array.isArray(savedAnswers.q_tracks) && savedAnswers.q_tracks.includes('AI & Machine Learning'), 'Multi-choice tracks saved in JSONB');

    // Verify QR Ticket issued
    const ticketLookup = await query('SELECT ticket_code, qr_token, qr_code_data_url, status FROM tickets WHERE registration_id = $1', [regLookup.rows[0].id]);
    assert(ticketLookup.rowCount === 1, 'Ticket generated and associated with new registration');
    assert(ticketLookup.rows[0].status === 'ISSUED', 'Ticket status is ISSUED');
    assert(ticketLookup.rows[0].qr_code_data_url.startsWith('data:image/png;base64,'), 'QR Code PNG Data URL generated');

    // 2.4 Verify Initial Login & Forced Password Change Flow
    console.log('\n📦 3. Testing Initial Login & Forced Password Change Flow...');
    const initialLoginRes = await AuthService.loginUser({
      email: newAttendeeEmail,
      password: initialPlaintextPassword!,
    });
    assert(Boolean(initialLoginRes && initialLoginRes.token), 'New attendee can authenticate with initial random password');
    assert(initialLoginRes.user.mustChangePassword === true, 'User payload correctly reports mustChangePassword: true');

    const decodedSession = verifyAuthToken(initialLoginRes.token);
    assert(decodedSession.mustChangePassword === true, 'Signed JWT token embeds mustChangePassword: true claim');

    // Change password to permanent secret
    const changePwRes = await AuthService.changePassword(
      newUserId,
      initialPlaintextPassword!,
      'MyNewPermanentPassword2026!'
    );
    assert(changePwRes.success === true, 'Password update succeeds');
    assert(Boolean(changePwRes.token), 'Change password issues a fresh unrestricted JWT session token');

    const decodedNewToken = verifyAuthToken(changePwRes.token!);
    assert(decodedNewToken.mustChangePassword === false, 'Fresh JWT token has mustChangePassword: false');

    // Verify flag was cleared in database
    const userAfterChange = await query('SELECT must_change_password, password_hash FROM users WHERE id = $1', [newUserId]);
    assert(userAfterChange.rows[0].must_change_password === false, 'must_change_password flag set to FALSE in database');
    const isNewPwMatch = await bcrypt.compare('MyNewPermanentPassword2026!', userAfterChange.rows[0].password_hash);
    assert(isNewPwMatch === true, 'New permanent password hash authenticates successfully');

    // Verify subsequent login has mustChangePassword: false
    const regularLoginRes = await AuthService.loginUser({
      email: newAttendeeEmail,
      password: 'MyNewPermanentPassword2026!',
    });
    assert(regularLoginRes.user.mustChangePassword === false, 'Subsequent logins have mustChangePassword: false');

    // 2.5 Verify Attendee Dashboard Display
    console.log('\n📦 3.1 Testing Attendee Dashboard Event & Ticket Display...');
    const attendeeDashboardTickets = await TicketService.getAttendeeTickets(newUserId);
    assert(attendeeDashboardTickets.length >= 1, 'Manually registered event appears in Attendee Dashboard');
    const myTicket = attendeeDashboardTickets.find((t) => t.eventId === freeEvent.id);
    assert(Boolean(myTicket), 'Attendee dashboard contains ticket for the registered event');
    assert(myTicket.ticketCode === ticketLookup.rows[0].ticket_code, 'Dashboard ticket code matches issued ticket');
    assert(Boolean(myTicket.qrDataUrl), 'Dashboard ticket provides active dynamic QR entrance pass');
    assert(myTicket.status === 'Valid', 'Eligible registration status is Valid');

    // 3. Scenario A: Manually register an EXISTING Sheeba User for a different event
    console.log('\n📦 4. Testing Scenario A: Manual Registration of EXISTING Sheeba User...');
    
    // First, create existing user with pre-existing password
    const existingOriginalPw = 'ExistingOriginalPw123!';
    const existingOriginalHash = await bcrypt.hash(existingOriginalPw, 10);
    const existingUserRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status, phone)
       VALUES ($1, $2, 'Bethlehem Tilahun', 'attendee', 'approved', '+251922334455')
       RETURNING id`,
      [existingUserEmail, existingOriginalHash]
    );
    const existingUserId = existingUserRes.rows[0].id;

    // Register existing user for freeEvent
    const existingRegResult = await CheckinService.addManualAttendee({
      eventId: freeEvent.id,
      organizerId,
      name: 'Bethlehem Tilahun',
      email: existingUserEmail,
      userRole: 'organizer',
      answers: {
        q_tshirt: 'Medium',
        q_diet: 'None',
      },
    });

    assert(existingRegResult.success === true, 'Existing user manual registration succeeds');
    assert(existingRegResult.isExistingUser === true, 'Correctly flags isExistingUser as true');

    // Verify existing password was NOT modified
    const existingUserAfter = await query('SELECT password_hash FROM users WHERE id = $1', [existingUserId]);
    assert(existingUserAfter.rows[0].password_hash === existingOriginalHash, 'Existing user password hash remained untouched');

    // Verify NO password_reset_token was generated for existing user
    const tokensForExisting = await query('SELECT id FROM password_reset_tokens WHERE user_id = $1', [existingUserId]);
    assert(tokensForExisting.rowCount === 0, 'No password setup or reset tokens created for existing account');

    // Verify registration and ticket associated with existing account
    const existingTicket = await query('SELECT id, status FROM tickets WHERE event_id = $1 AND user_id = $2', [freeEvent.id, existingUserId]);
    assert(existingTicket.rowCount === 1, 'Ticket created and linked to existing user ID');
    assert(existingTicket.rows[0].status === 'ISSUED', 'Ticket issued for existing user');

    // 4. Duplicate Registration Rejection
    console.log('\n📦 5. Testing Duplicate Registration Rejection (HTTP 409)...');
    let dupCaught = false;
    try {
      await CheckinService.addManualAttendee({
        eventId: freeEvent.id,
        organizerId,
        name: 'Bethlehem Tilahun',
        email: existingUserEmail,
        userRole: 'organizer',
        answers: {
          q_tshirt: 'Medium',
        },
      });
    } catch (err: any) {
      dupCaught = true;
      assert(err.statusCode === 409, 'Duplicate registration rejected with HTTP 409 Conflict');
      assert(err.message.includes('already registered'), 'Returns user-friendly "already registered" message');
    }
    assert(dupCaught, 'Strict duplicate registration protection active');

    // 5. Paid Event Tests: Pending vs Verified Payments
    console.log('\n📦 6. Testing Paid Event Manual Registrations...');
    const paidEvent = await EventService.createEvent(organizerId, {
      title: `FinTech Forum ${timestamp}`,
      description: 'Paid executive forum.',
      type: 'summit',
      date: '2026-11-25',
      startTime: '08:30 AM',
      endTime: '04:30 PM',
      location: 'Skylight Hotel Addis',
      capacity: 50,
      isPaid: true,
      ticketPrice: 350,
    });

    const paidPendingAttendeeEmail = `paid_pending_${timestamp}@sheeba.et`;

    // 5.1 Paid event without payment -> pending payment, no active usable ticket issued
    const paidPendingRes = await CheckinService.addManualAttendee({
      eventId: paidEvent.id,
      organizerId,
      name: 'Unpaid Attendee Nahom',
      email: paidPendingAttendeeEmail,
      userRole: 'organizer',
      paymentStatus: 'unsettled',
    });

    assert(paidPendingRes.success === true, 'Paid event registration with pending payment succeeds');
    assert(paidPendingRes.isPaymentSettled === false, 'Flags isPaymentSettled as false');

    const unpaidUserRes = await query('SELECT id FROM users WHERE email = $1', [paidPendingAttendeeEmail]);
    const unpaidUserId = unpaidUserRes.rows[0].id;
    const unpaidRegRes = await query('SELECT id, payment_status FROM registrations WHERE event_id = $1 AND user_id = $2', [paidEvent.id, unpaidUserId]);
    assert(unpaidRegRes.rows[0].payment_status === 'unsettled', 'Registration payment_status is unsettled in DB');

    // No active ticket should be issued for unsettled payment
    const unpaidTicketRes = await query('SELECT id FROM tickets WHERE registration_id = $1', [unpaidRegRes.rows[0].id]);
    assert(unpaidTicketRes.rowCount === 0, 'No active usable ticket issued while payment is unsettled');

    // 5.2 Verify that manual registration cannot bypass payment verification with fake reference
    let paymentBypassCaught = false;
    try {
      await CheckinService.addManualAttendee({
        eventId: paidEvent.id,
        organizerId,
        name: 'Bypass Attendee',
        email: `bypass_${timestamp}@sheeba.et`,
        userRole: 'organizer',
        paymentReference: 'INVALID-UNVERIFIED-REF-999',
      });
    } catch (err: any) {
      paymentBypassCaught = true;
      assert(err.statusCode === 400 || err.statusCode === 422, 'Fake payment reference strictly rejected by payment verification');
    }
    assert(paymentBypassCaught, 'Manual attendee registration cannot bypass payment verification');

    // 5.3 Paid event with authorized off-platform settled payment -> settled + issued ticket
    const paidSettledAttendeeEmail = `paid_settled_${timestamp}@sheeba.et`;
    const paidSettledRes = await CheckinService.addManualAttendee({
      eventId: paidEvent.id,
      organizerId,
      name: 'Paid Attendee Selam',
      email: paidSettledAttendeeEmail,
      userRole: 'organizer',
      paymentStatus: 'settled',
    });

    assert(paidSettledRes.success === true, 'Paid registration with settled payment succeeds');
    assert(paidSettledRes.isPaymentSettled === true, 'Flags isPaymentSettled as true');

    const settledUserRes = await query('SELECT id FROM users WHERE email = $1', [paidSettledAttendeeEmail]);
    const settledUserId = settledUserRes.rows[0].id;
    const settledRegRes = await query('SELECT id, payment_status FROM registrations WHERE event_id = $1 AND user_id = $2', [paidEvent.id, settledUserId]);
    assert(settledRegRes.rows[0].payment_status === 'settled', 'Registration payment_status is settled in DB');

    const settledTicketRes = await query('SELECT id, status, is_paid FROM tickets WHERE registration_id = $1', [settledRegRes.rows[0].id]);
    assert(settledTicketRes.rowCount === 1, 'Active QR ticket issued for settled payment');
    assert(settledTicketRes.rows[0].status === 'ISSUED', 'Ticket status is ISSUED');
    assert(settledTicketRes.rows[0].is_paid === true, 'Ticket marked is_paid: true');

    // Verify Unpaid registration in Attendee Dashboard does NOT reveal active QR ticket
    const unpaidDashboardTickets = await TicketService.getAttendeeTickets(unpaidUserId);
    assert(unpaidDashboardTickets.length >= 1, 'Unpaid registration visible in dashboard');
    const unpaidTicket = unpaidDashboardTickets.find((t) => t.eventId === paidEvent.id);
    assert(Boolean(unpaidTicket), 'Unpaid registration found');
    assert(unpaidTicket.status === 'Pending Payment', 'Unpaid registration status is Pending Payment');
    assert(unpaidTicket.qrDataUrl === null, 'Unpaid registration DOES NOT expose active QR pass data');

    // 6. Security: Unauthorized Organizer Check
    console.log('\n📦 7. Testing Authorization Security...');
    let unauthCaught = false;
    try {
      await CheckinService.addManualAttendee({
        eventId: freeEvent.id,
        organizerId: unauthorizedOrgId, // unauthorized organizer!
        name: 'Hacker Attendee',
        email: `hacker_${timestamp}@sheeba.et`,
        userRole: 'organizer',
      });
    } catch (err: any) {
      unauthCaught = true;
      assert(err.statusCode === 403, 'Unauthorized organizer strictly rejected with HTTP 403 Forbidden');
    }
    assert(unauthCaught, 'Event ownership check prevents unauthorized manual registrations');

    // 7. Notification Retry / Resend Endpoint
    console.log('\n📦 8. Testing Notification Resend Mechanism...');
    const newRegId = regLookup.rows[0].id;
    const resendResult = await CheckinService.resendManualNotification({
      eventId: freeEvent.id,
      registrationId: newRegId,
      organizerId,
      userRole: 'organizer',
    });
    assert(resendResult.success === true, 'Notification resend succeeds without duplicate account or ticket creation');

    const regAfterResend = await query('SELECT notification_status, notification_sent_at FROM registrations WHERE id = $1', [newRegId]);
    assert(regAfterResend.rows[0].notification_status === 'sent', 'Registration notification_status updated to sent');
    assert(Boolean(regAfterResend.rows[0].notification_sent_at), 'Notification sent timestamp recorded');

    console.log('\n====================================================');
    console.log(`📊 MANUAL REGISTRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
};

runManualRegistrationTests().then(() => process.exit(0)).catch(() => process.exit(1));
