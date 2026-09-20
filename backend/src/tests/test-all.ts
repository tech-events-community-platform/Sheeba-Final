process.env.NODE_ENV = 'test';
import bcrypt from 'bcryptjs';
import http from 'http';
import app from '../app';
import { signAuthToken, verifyAuthToken } from '../utils/jwt.util';
import { generateTicketToken, verifyTicketToken, generateQrDataUrl } from '../utils/qr.util';
import { query } from '../config/db';

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 SHEBA BACKEND - COMPREHENSIVE AUTOMATED TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: any) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail ? detail : '');
      failed++;
    }
  };

  // TEST SUITE 1: Security & Cryptography
  console.log('📦 1. Testing Password Security (Bcrypt) & Token Cryptography...');
  try {
    const rawPassword = 'StrongPassword2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert(hash !== rawPassword, 'Password securely hashed');
    assert(await bcrypt.compare(rawPassword, hash), 'Bcrypt validates correct password');
    assert(!(await bcrypt.compare('WrongPassword', hash)), 'Bcrypt rejects incorrect passwords');

    // QR Token Cryptography
    const qrToken = generateTicketToken('ticket-123', 'event-456', '2026-09-20');
    const decodedQr = verifyTicketToken(qrToken);
    assert(decodedQr.ticketId === 'ticket-123' && decodedQr.eventId === 'event-456', 'Dynamic QR pass token signed & verified');
    assert(typeof decodedQr.exp === 'number' && decodedQr.exp > 0, 'Token includes end-of-event-day exp timestamp');

    const qrDataUrl = await generateQrDataUrl(qrToken);
    assert(qrDataUrl.startsWith('data:image/png;base64,'), 'QR Code PNG Base64 generation works');
  } catch (err: any) {
    console.error('Crypto test error:', err);
    failed++;
  }

  // TEST SUITE 2: Live HTTP Server & API Integration Tests
  console.log('\n📦 2. Testing Live Express HTTP Server & API Endpoints...');
  const testPort = 5099;
  const server = app.listen(testPort);

  try {
    const fetchHttp = (path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}): Promise<{ status: number; body: any }> => {
      return new Promise((resolve, reject) => {
        const payloadStr = options.body ? JSON.stringify(options.body) : undefined;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        };
        if (payloadStr) {
          headers['Content-Length'] = Buffer.byteLength(payloadStr).toString();
        }

        const req = http.request(
          {
            hostname: 'localhost',
            port: testPort,
            path,
            method: options.method || 'GET',
            headers,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = data ? JSON.parse(data) : {};
                resolve({ status: res.statusCode || 500, body: parsed });
              } catch {
                resolve({ status: res.statusCode || 500, body: data });
              }
            });
          }
        );
        req.on('error', reject);
        if (payloadStr) req.write(payloadStr);
        req.end();
      });
    };

    // 1. Health Endpoint
    const healthRes = await fetchHttp('/api/health');
    assert(healthRes.status === 200 && healthRes.body.status === 'OK', 'GET /api/health returns 200 OK');

    // 2. Admin Login
    console.log('\n📦 3. Testing Single Admin Account Login...');
    const adminLoginRes = await fetchHttp('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@sheba.et', password: 'password123' },
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.data?.token, 'Admin logs in successfully with seeded credentials');
    const adminToken = adminLoginRes.body.data?.token;

    // 3. Attendee Registration Flow
    console.log('\n📦 4. Testing Attendee Direct Registration & Login...');
    const testAttendeeEmail = `attendee_${Date.now()}@example.et`;
    const attendeeRegRes = await fetchHttp('/api/auth/register', {
      method: 'POST',
      body: {
        email: testAttendeeEmail,
        password: 'password123',
        full_name: 'Test Attendee',
        role: 'attendee',
        phone: '+251911001122',
      },
    });
    assert(
      attendeeRegRes.status === 201 &&
      attendeeRegRes.body.data?.token &&
      attendeeRegRes.body.data?.user?.approvalStatus === 'approved',
      'Attendee registers and receives instant login token without approval block'
    );

    // 4. Organizer Registration & Approval Flow
    console.log('\n📦 5. Testing Organizer Registration, 1-Hour Wait Notice & Admin Approval Workflow...');
    const testOrganizerEmail = `organizer_${Date.now()}@gdgaddis.et`;
    const organizerRegRes = await fetchHttp('/api/auth/register', {
      method: 'POST',
      body: {
        email: testOrganizerEmail,
        password: 'password123',
        full_name: 'Sara Mengistu',
        role: 'organizer',
        organization: 'GDG Addis Ababa',
        phone: '+251922334455',
        bio: 'Tech community leader',
      },
    });

    assert(
      organizerRegRes.status === 201 &&
      organizerRegRes.body.data?.isPendingApproval === true &&
      organizerRegRes.body.data?.message?.includes('1 hour'),
      'Organizer registers in PENDING state with message: "you will be using this sytem in 1 hour"'
    );

    const pendingOrganizerId = organizerRegRes.body.data?.user?.id;

    // Organizer Login Before Approval (Must be rejected with 403 / 1-hour wait notice)
    const organizerPreLoginRes = await fetchHttp('/api/auth/login', {
      method: 'POST',
      body: {
        email: testOrganizerEmail,
        password: 'password123',
      },
    });
    assert(
      organizerPreLoginRes.status === 403 &&
      (organizerPreLoginRes.body.message?.includes('1 hour') || organizerPreLoginRes.body.data?.isPendingApproval),
      'Organizer login is blocked prior to approval with 1-hour wait notice'
    );

    // Admin Views Users & Pending Organizers
    const adminUsersRes = await fetchHttp('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminUsersRes.status === 200 &&
      Array.isArray(adminUsersRes.body.data?.organizers) &&
      adminUsersRes.body.data.organizers.some((o: any) => o.id === pendingOrganizerId && o.approvalStatus === 'pending'),
      'Admin sees newly registered organizer in Pending status'
    );

    // Admin Approves the Organizer
    const approveRes = await fetchHttp(`/api/admin/users/${pendingOrganizerId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      approveRes.status === 200 && approveRes.body.data?.approval_status === 'approved',
      'Admin successfully approves the organizer'
    );

    // Organizer Login After Approval (Must succeed)
    const organizerPostLoginRes = await fetchHttp('/api/auth/login', {
      method: 'POST',
      body: {
        email: testOrganizerEmail,
        password: 'password123',
      },
    });
    assert(
      organizerPostLoginRes.status === 200 &&
      organizerPostLoginRes.body.data?.token &&
      organizerPostLoginRes.body.data?.user?.role === 'ORGANIZER',
      'Approved organizer can now log in and access Organizer workspace'
    );

    // TEST SUITE 6: Single Account Upgrade, Admin Approval & Credential-Gated Switching
    console.log('\n📦 6. Testing Single Account Upgrade, Admin Approval & Formal Credential-Gated Role Switching...');
    const upgradeEmail = `upgrade_${Date.now()}@example.et`;
    
    // Step 1: Register as Attendee
    const regAttendeeRes = await fetchHttp('/api/auth/register', {
      method: 'POST',
      body: {
        email: upgradeEmail,
        password: 'Password123!',
        full_name: 'Dagmawi Kebede',
        role: 'attendee',
      },
    });
    assert(regAttendeeRes.status === 201 && regAttendeeRes.body.data?.token, 'Attendee registered successfully');
    const attendeeToken = regAttendeeRes.body.data?.token;
    const attendeeId = regAttendeeRes.body.data?.user?.id;

    // Step 2: Attempt duplicate registration (should return 409 conflict, NOT overwrite account)
    const duplicateRegRes = await fetchHttp('/api/auth/register', {
      method: 'POST',
      body: {
        email: upgradeEmail,
        password: 'Password123!',
        full_name: 'Dagmawi Kebede',
        role: 'organizer',
      },
    });
    assert(duplicateRegRes.status === 409, 'Duplicate registration returns 409 conflict instead of destructive role overwrite');

    // Step 3: Apply for Organizer privileges from settings
    const applyRes = await fetchHttp('/api/auth/apply-organizer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${attendeeToken}` },
      body: {
        organization: 'Sheba Developers Community',
        bio: 'Tech community for builders in Ethiopia',
        phone: '+251933445566',
        password: 'Password123!',
      },
    });
    assert(
      applyRes.status === 200 &&
      applyRes.body.data?.user?.organizerApprovalStatus === 'pending',
      'Attendee submits organizer application with password verification and status becomes pending'
    );

    // Step 4: Verify unapproved switch attempt is rejected
    const unapprovedSwitchRes = await fetchHttp('/api/auth/switch-role', {
      method: 'POST',
      headers: { Authorization: `Bearer ${attendeeToken}` },
      body: { targetRole: 'ORGANIZER', password: 'Password123!' },
    });
    assert(unapprovedSwitchRes.status === 403, 'Switch to Organizer is blocked before admin approval');

    // Step 5: Admin reviews pending applications and approves
    const adminListPending = await fetchHttp('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foundPending = adminListPending.body.data?.organizers?.some(
      (o: any) => o.id === attendeeId && (o.approvalStatus === 'pending' || o.organizerApprovalStatus === 'pending')
    );
    assert(foundPending, 'Admin sees upgraded attendee in organizer review queue');

    const approveUpgradeRes = await fetchHttp(`/api/admin/users/${attendeeId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(approveUpgradeRes.status === 200, 'Admin approves attendee organizer application');

    // Step 6: Attendee switches to Organizer with password verification
    const switchWithWrongPw = await fetchHttp('/api/auth/switch-role', {
      method: 'POST',
      headers: { Authorization: `Bearer ${attendeeToken}` },
      body: { targetRole: 'ORGANIZER', password: 'WrongPassword' },
    });
    assert(switchWithWrongPw.status === 401, 'Switch role rejects invalid password');

    const switchWithCorrectPw = await fetchHttp('/api/auth/switch-role', {
      method: 'POST',
      headers: { Authorization: `Bearer ${attendeeToken}` },
      body: { targetRole: 'ORGANIZER', password: 'Password123!' },
    });
    assert(
      switchWithCorrectPw.status === 200 &&
      switchWithCorrectPw.body.data?.user?.role === 'ORGANIZER' &&
      switchWithCorrectPw.body.data?.token,
      'Approved user enters password and successfully switches to Organizer workspace'
    );
    const organizerSessionToken = switchWithCorrectPw.body.data?.token;

    // Step 7: Organizer switches back to Attendee workspace
    const switchBackRes = await fetchHttp('/api/auth/switch-role', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerSessionToken}` },
      body: { targetRole: 'ATTENDEE', password: 'Password123!' },
    });
    assert(
      switchBackRes.status === 200 &&
      switchBackRes.body.data?.user?.role === 'ATTENDEE' &&
      switchBackRes.body.data?.user?.isOrganizer === true,
      'Organizer enters password and successfully switches back to personal Attendee workspace'
    );

    // Step 8: Portal Login Verification
    const attendeePortalLogin = await fetchHttp('/api/auth/login', {
      method: 'POST',
      body: { email: upgradeEmail, password: 'Password123!', role: 'ATTENDEE' },
    });
    assert(
      attendeePortalLogin.status === 200 && attendeePortalLogin.body.data?.user?.role === 'ATTENDEE',
      'User can sign in directly to Attendee portal'
    );

    const organizerPortalLogin = await fetchHttp('/api/auth/login', {
      method: 'POST',
      body: { email: upgradeEmail, password: 'Password123!', role: 'ORGANIZER' },
    });
    assert(
      organizerPortalLogin.status === 200 && organizerPortalLogin.body.data?.user?.role === 'ORGANIZER',
      'User can sign in directly to Organizer portal'
    );

    // TEST SUITE 7: Independent Sponsor Role, Approval Gate & OTP Password Reset
    console.log('\n📦 7. Testing Sponsor Role, Approval Gate & OTP Password Reset...');
    const testSponsorEmail = `sponsor_suite_${Date.now()}@corporate.et`;
    const testSponsorPass = 'InitialSponsorPass123!';

    // Cleanup prior if any
    await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [testSponsorEmail]);
    await query('DELETE FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [testSponsorEmail]);

    // Step 1: Sponsor Corporate Registration
    const sponsorRegRes = await fetchHttp('/api/auth/sponsor/register', {
      method: 'POST',
      body: {
        email: testSponsorEmail,
        password: testSponsorPass,
        full_name: 'Almaz Tadesse',
        company_name: 'Telebirr Innovations PLC',
        industry_category: 'Fintech',
        company_phone: '+251911998877',
        company_website: 'https://telebirr.et',
      },
    });
    assert(
      sponsorRegRes.status === 201 && sponsorRegRes.body.data?.user?.role === 'SPONSOR' && sponsorRegRes.body.data?.user?.approvalStatus === 'pending',
      'Sponsor registers in PENDING approval status'
    );

    // Step 2: Login before approval blocked
    const unapprovedSponsorLogin = await fetchHttp('/api/auth/sponsor/login', {
      method: 'POST',
      body: { email: testSponsorEmail, password: testSponsorPass },
    });
    assert(
      unapprovedSponsorLogin.status === 403 && unapprovedSponsorLogin.body.isPendingApproval === true,
      'Sponsor login is blocked prior to admin review with pending notice'
    );

    // Step 3: Admin Review & Approval
    const adminUsersResSponsor = await fetchHttp('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingSponsor = adminUsersResSponsor.body.data?.sponsors?.find((s: any) => s.email === testSponsorEmail);
    assert(
      adminUsersResSponsor.status === 200 && Boolean(pendingSponsor),
      'Admin successfully views pending sponsor in sponsors queue'
    );

    const approveSponsorRes = await fetchHttp(`/api/admin/users/${pendingSponsor.id}/approve-sponsor`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      approveSponsorRes.status === 200 && approveSponsorRes.body.data?.approval_status === 'approved',
      'Admin approves sponsor account and triggers approval email'
    );

    // Step 4: Approved Sponsor Login
    const approvedSponsorLogin = await fetchHttp('/api/auth/sponsor/login', {
      method: 'POST',
      body: { email: testSponsorEmail, password: testSponsorPass },
    });
    assert(
      approvedSponsorLogin.status === 200 && approvedSponsorLogin.body.data?.token && approvedSponsorLogin.body.data?.user?.role === 'SPONSOR',
      'Approved sponsor logs in and receives corporate session token'
    );

    // Step 5: OTP Forgot Password
    // Test 5a: Unregistered email rejection
    const unregOtpRes = await fetchHttp('/api/auth/sponsor/forgot-password/otp', {
      method: 'POST',
      body: { email: 'nonexistent_sponsor@nowhere.et' },
    });
    assert(
      unregOtpRes.status === 404,
      'Forgot password rejects unregistered emails with clear 404 notice'
    );

    // Test 5b: Registered sponsor requests OTP
    const forgotOtpRes = await fetchHttp('/api/auth/sponsor/forgot-password/otp', {
      method: 'POST',
      body: { email: testSponsorEmail },
    });
    assert(
      forgotOtpRes.status === 200 && forgotOtpRes.body.success === true,
      'Sponsor requests 6-digit OTP code'
    );

    const dbOtp = await query('SELECT otp_code FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [testSponsorEmail]);
    const otpCode = dbOtp.rows[0]?.otp_code;
    assert(
      Boolean(otpCode && otpCode.length === 6),
      'OTP code securely generated and stored in database'
    );

    // Test 5c: Standalone OTP code authentication
    const verifyOtpRes = await fetchHttp('/api/auth/sponsor/verify-otp', {
      method: 'POST',
      body: { email: testSponsorEmail, otp: otpCode },
    });
    assert(
      verifyOtpRes.status === 200 && verifyOtpRes.body.success === true,
      'Standalone OTP authentication endpoint validates 6-digit code'
    );

    const newSponsorPass = 'NewCorporatePass2026!';
    const resetOtpRes = await fetchHttp('/api/auth/sponsor/reset-password/otp', {
      method: 'POST',
      body: { email: testSponsorEmail, otp: otpCode, newPassword: newSponsorPass },
    });
    assert(
      resetOtpRes.status === 200 && resetOtpRes.body.success === true,
      'Sponsor verifies OTP and resets corporate account password'
    );

    const newPassLogin = await fetchHttp('/api/auth/sponsor/login', {
      method: 'POST',
      body: { email: testSponsorEmail, password: newSponsorPass },
    });
    assert(
      newPassLogin.status === 200 && newPassLogin.body.data?.token,
      'Sponsor successfully logs in using newly reset password'
    );

    // TEST SUITE 8: Sponsorship Marketplace, Pitch Creation & Deal Pipeline
    console.log('\n📦 8. Testing Sponsorship Marketplace, Pitch Creation & Deal Pipeline...');
    const organizerToken = organizerPostLoginRes.body.data?.token;
    const sponsorToken = approvedSponsorLogin.body.data?.token;

    // Step 1: Organizer creates uncreated event sponsorship application
    const createPitchRes = await fetchHttp('/api/sponsorships/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        event_title: 'Addis AI & Cloud Summit 2026',
        event_type: 'hackathon',
        category: 'AI & Data',
        expected_date: 'December 2026',
        location: 'Millennium Hall, Addis Ababa',
        expected_attendees: 500,
        target_audience: 'Senior software engineers, AI researchers, and startup founders',
        funding_goal: 150000,
        currency: 'ETB',
        description: '3-day flagship AI hackathon building local LLM solutions for agriculture and healthcare.',
        packages: [
          { name: 'Title Sponsor', amount: 80000, perks: 'Keynote speaking slot + Logo on all badges + 3x3m Booth' },
          { name: 'Gold Sponsor', amount: 40000, perks: 'Stage banner + Swag bag placement' },
        ],
        contact_name: 'Dawit Bekele',
        contact_phone: '+251911334455',
        contact_email: 'dawit@gdgaddis.et',
        contact_telegram: '@dawit_gdg',
      },
    });
    assert(
      createPitchRes.status === 201 && createPitchRes.body.data?.id,
      'Organizer publishes upcoming event sponsorship pitch to marketplace'
    );
    const createdAppId = createPitchRes.body.data?.id;

    // Step 2: Organizer views their submitted pitches
    const myPitchesRes = await fetchHttp('/api/sponsorships/organizer/my-applications', {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    assert(
      myPitchesRes.status === 200 &&
      Array.isArray(myPitchesRes.body.data) &&
      myPitchesRes.body.data.some((p: any) => p.id === createdAppId),
      'Organizer retrieves their submitted pitches with interested sponsor metrics'
    );

    // Step 3: Sponsor explores marketplace
    const exploreRes = await fetchHttp('/api/sponsorships/explore?category=AI%20%26%20Data');
    assert(
      exploreRes.status === 200 &&
      Array.isArray(exploreRes.body.data) &&
      exploreRes.body.data.some((p: any) => p.id === createdAppId),
      'Sponsor explores marketplace with category filtering'
    );

    // Step 4: Sponsor views pitch details with direct organizer contacts
    const pitchDetailRes = await fetchHttp(`/api/sponsorships/applications/${createdAppId}`);
    assert(
      pitchDetailRes.status === 200 &&
      pitchDetailRes.body.data?.contact_phone === '+251911334455' &&
      pitchDetailRes.body.data?.contact_email === 'dawit@gdgaddis.et',
      'Pitch details expose direct organizer contact details for off-platform communication'
    );

    // Step 5: Sponsor marks deal as INTERESTED
    const markInterestedRes = await fetchHttp('/api/sponsorships/deals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sponsorToken}` },
      body: {
        applicationId: createdAppId,
        status: 'INTERESTED',
        package_name: 'Title Sponsor',
        pledged_amount: 80000,
        sponsor_notes: 'Interested in title sponsorship. Reaching out via phone for booth specifications.',
      },
    });
    assert(
      markInterestedRes.status === 200 && markInterestedRes.body.data?.status === 'INTERESTED',
      'Sponsor marks deal as INTERESTED in Deals & Pledges pipeline'
    );
    const dealId = markInterestedRes.body.data?.id;

    // Step 6: Sponsor views their Deals pipeline
    const myDealsRes = await fetchHttp('/api/sponsorships/sponsor/my-deals', {
      headers: { Authorization: `Bearer ${sponsorToken}` },
    });
    assert(
      myDealsRes.status === 200 &&
      Array.isArray(myDealsRes.body.data) &&
      myDealsRes.body.data.some((d: any) => d.id === dealId && (d.contact_phone === '+251911334455' || d.application?.contact_phone === '+251911334455')),
      'Sponsor views deals pipeline with direct organizer phone and email'
    );

    // Step 7: Sponsor updates deal status to DECLINED
    const updateDealRes = await fetchHttp(`/api/sponsorships/deals/${dealId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sponsorToken}` },
      body: {
        status: 'DECLINED',
        sponsor_notes: 'Allocated marketing budget elsewhere for Q4.',
      },
    });
    assert(
      updateDealRes.status === 200 && updateDealRes.body.data?.status === 'DECLINED',
      'Sponsor updates deal status to DECLINED'
    );

    // Step 8: Clean up test applications & deals
    await query('DELETE FROM sponsorship_deals WHERE application_id = $1', [createdAppId]);
    await query('DELETE FROM sponsorship_applications WHERE id = $1', [createdAppId]);

    // Clean up
    await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [testSponsorEmail]);
    await query('DELETE FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [testSponsorEmail]);

    // TEST SUITE 7: QR Ticket Generation, Scanner Verification, Atomic Check-in & Soft-Void Undo
    console.log('\n📦 7. Testing QR Ticket Generation, Scanner Verification, Duplicate 409 Rejection & Soft-Void...');
    const organizerPortalToken = organizerPortalLogin.body.data?.token;
    const regAttendeeToken = attendeePortalLogin.body.data?.token;

    // Step 1: Organizer creates a tech event
    const createEventRes = await fetchHttp('/api/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: 'Addis AI & Cloud Summit 2026',
        description: 'Deep dive into LLMs and Cloud Native architecture in Ethiopia.',
        type: 'workshop',
        date: '2026-10-15',
        startTime: '09:00 AM',
        endTime: '05:00 PM',
        location: 'Skylight Hotel, Addis Ababa',
        venueName: 'Grand Ballroom',
        capacity: 100,
        isPaid: false,
        customQuestions: [
          { id: 'q1', questionText: 'GitHub Handle', isRequired: false },
          { id: 'q2', questionText: 'T-Shirt Size', isRequired: true }
        ]
      }
    });
    assert(createEventRes.status === 201 && createEventRes.body.data?.id, 'Organizer successfully creates event');
    const eventId = createEventRes.body.data.id;

    // Step 2: Attendee registers for the event
    const regRes = await fetchHttp(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regAttendeeToken}` },
      body: {
        answers: {
          q1: 'sheba-dev',
          q2: 'Large'
        }
      }
    });
    assert(regRes.status === 201 && regRes.body.data?.ticket, 'Attendee registers and receives ticket with signed QR');
    const issuedTicket = regRes.body.data.ticket;

    assert(
      typeof issuedTicket.id === 'string' && issuedTicket.id.startsWith('SHB-'),
      `Ticket code generated in human-readable SHB-XXXX-YYYY format (${issuedTicket.id})`
    );
    assert(
      typeof issuedTicket.qrToken === 'string' && issuedTicket.qrToken.startsWith('eyJ'),
      'QR token is cryptographically signed without PII'
    );

    // Step 3: Scanner verification with signed JWT
    const verifyJwtRes = await fetchHttp('/api/checkin/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        tokenOrCode: issuedTicket.qrToken
      }
    });
    assert(
      verifyJwtRes.status === 200 &&
      verifyJwtRes.body.data?.canCheckIn === true &&
      verifyJwtRes.body.data?.attendee?.email === upgradeEmail,
      'Scanner successfully verifies signed QR token and surfaces attendee record'
    );
    assert(
      verifyJwtRes.body.data?.attendee?.answers?.q2 === 'Large',
      'Scanner surfaces custom registration answers (T-Shirt Size: Large)'
    );

    // Step 4: Scanner verification with short code SHB-XXXX-YYYY
    const verifyCodeRes = await fetchHttp('/api/checkin/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        tokenOrCode: issuedTicket.id
      }
    });
    assert(
      verifyCodeRes.status === 200 && verifyCodeRes.body.data?.canCheckIn === true,
      'Scanner successfully verifies short code (SHB-XXXX-YYYY)'
    );

    // Step 5: Scanner search by email or name
    const searchRes = await fetchHttp('/api/checkin/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        query: 'Dagmawi'
      }
    });
    assert(
      searchRes.status === 200 && Array.isArray(searchRes.body.data) && searchRes.body.data.length > 0,
      'Scanner fallback search finds matching attendee by name'
    );

    // Step 6: Atomic check-in
    const checkInRes = await fetchHttp('/api/checkin/mark-attended', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        attendeeId: issuedTicket.attendeeId
      }
    });
    assert(
      checkInRes.status === 200 && checkInRes.body.data?.badgeAwarded?.badgeCode === 'attended',
      'Check-in succeeds atomically and awards Attended badge'
    );

    // Step 7: Duplicate check-in returns 409 Conflict with timestamp
    const dupCheckInRes = await fetchHttp('/api/checkin/mark-attended', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        attendeeId: issuedTicket.attendeeId
      }
    });
    assert(
      dupCheckInRes.status === 409 &&
      (dupCheckInRes.body.code === 'ALREADY_CHECKED_IN' || dupCheckInRes.body.error === 'ALREADY_CHECKED_IN'),
      'Duplicate check-in attempt strictly rejected with HTTP 409 Conflict'
    );

    // Step 8: Scanner re-verification shows CHECKED_IN status and canUndo: true
    const verifyCheckedInRes = await fetchHttp('/api/checkin/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        tokenOrCode: issuedTicket.id
      }
    });
    assert(
      verifyCheckedInRes.status === 200 &&
      verifyCheckedInRes.body.data?.canCheckIn === false &&
      verifyCheckedInRes.body.data?.canUndo === true &&
      verifyCheckedInRes.body.data?.hasAttendedBadge === true,
      'Scanner displays CHECKED_IN status, active Attended badge, and enables Soft-Void'
    );

    // Step 9: Soft-void undo check-in
    const undoRes = await fetchHttp('/api/checkin/undo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        attendeeId: issuedTicket.attendeeId,
        reason: 'Accidental door duty scan'
      }
    });
    assert(
      undoRes.status === 200 && undoRes.body.success === true,
      'Soft-void check-in undo successfully resets ticket and revokes badge without deleting records'
    );

    // Step 10: After soft-void, ticket is back to ISSUED and can be checked in again
    const postUndoVerify = await fetchHttp('/api/checkin/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        eventId,
        tokenOrCode: issuedTicket.id
      }
    });
    assert(
      postUndoVerify.status === 200 &&
      postUndoVerify.body.data?.canCheckIn === true &&
      postUndoVerify.body.data?.ticket?.status === 'ISSUED',
      'Post-undo verification confirms ticket is back to ISSUED and ready for check-in'
    );

  } catch (err: any) {
    console.error('Integration test error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();
