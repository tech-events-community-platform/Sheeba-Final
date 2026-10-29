import crypto from 'crypto';
import { query } from '../config/db';
import { RecycleBinService } from '../services/recycleBin.service';
import { EventService } from '../services/event.service';
import { AuthService } from '../services/auth.service';

async function runRecycleBinTests() {
  console.log('====================================================');
  console.log('🗑️  SHEEBA RECYCLE BIN & DATA RESTORATION TEST SUITE');
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

  const testSuffix = Math.random().toString(36).substring(2, 7);
  const org1Email = `org1_${testSuffix}@sheeba.test`;
  const org2Email = `org2_${testSuffix}@sheeba.test`;
  const att1Email = `att1_${testSuffix}@sheeba.test`;
  const sponsorEmail = `sponsor_${testSuffix}@sheeba.test`;
  const exhibitorEmail = `exhibitor_${testSuffix}@sheeba.test`;
  const adminEmail = `admin_${testSuffix}@sheeba.test`;

  let org1Id = '';
  let org2Id = '';
  let att1Id = '';
  let sponsorId = '';
  let exhibitorId = '';
  let adminId = '';

  let event1Id = '';
  let event2Id = '';
  let reg1Id = '';

  try {
    // -------------------------------------------------------------
    // SETUP: Create test users
    // -------------------------------------------------------------
    console.log('📦 1. Setting up Isolated Test Environment & Multi-Role Users...');

    const createOrg1 = await query(
      `INSERT INTO users (email, password_hash, full_name, role, organization, is_active, approval_status, is_organizer, organizer_approval_status)
       VALUES ($1, 'hash', 'Organizer One', 'organizer', 'Addis Tech Hub', TRUE, 'approved', TRUE, 'approved')
       RETURNING id`,
      [org1Email]
    );
    org1Id = createOrg1.rows[0].id;

    const createOrg2 = await query(
      `INSERT INTO users (email, password_hash, full_name, role, organization, is_active, approval_status, is_organizer, organizer_approval_status)
       VALUES ($1, 'hash', 'Organizer Two', 'organizer', 'Sheba Ventures', TRUE, 'approved', TRUE, 'approved')
       RETURNING id`,
      [org2Email]
    );
    org2Id = createOrg2.rows[0].id;

    const createAtt1 = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'hash', 'Attendee One', 'attendee', TRUE, 'approved')
       RETURNING id`,
      [att1Email]
    );
    att1Id = createAtt1.rows[0].id;

    const createSponsor = await query(
      `INSERT INTO users (email, password_hash, full_name, role, company_name, is_active, approval_status)
       VALUES ($1, 'hash', 'Sponsor Rep', 'sponsor', 'Telecorp Ethiopia', TRUE, 'approved')
       RETURNING id`,
      [sponsorEmail]
    );
    sponsorId = createSponsor.rows[0].id;

    const createExhibitor = await query(
      `INSERT INTO users (email, password_hash, full_name, role, organization, is_active, approval_status)
       VALUES ($1, 'hash', 'Exhibitor Rep', 'exhibitor', 'Innovatech Labs', TRUE, 'approved')
       RETURNING id`,
      [exhibitorEmail]
    );
    exhibitorId = createExhibitor.rows[0].id;

    const createAdmin = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'hash', 'Platform Admin', 'admin', TRUE, 'approved')
       RETURNING id`,
      [adminEmail]
    );
    adminId = createAdmin.rows[0].id;

    assert(Boolean(org1Id && org2Id && att1Id && adminId), 'Test users created across all 5 roles');

    // Create 2 events (one for Org1, one for Org2)
    const e1Res = await query(
      `INSERT INTO events (organizer_id, title, description, event_type, event_date, location, capacity, status, is_publicized)
       VALUES ($1, 'Addis AI Summit 2026', 'AI Summit for builders', 'workshop', NOW() + INTERVAL '10 days', 'Bole Addis', 200, 'open', TRUE)
       RETURNING id`,
      [org1Id]
    );
    event1Id = e1Res.rows[0].id;

    const e2Res = await query(
      `INSERT INTO events (organizer_id, title, description, event_type, event_date, location, capacity, status, is_publicized)
       VALUES ($1, 'FinTech Expo 2026', 'FinTech gathering', 'meetup', NOW() + INTERVAL '20 days', 'Kazanchis Addis', 150, 'open', TRUE)
       RETURNING id`,
      [org2Id]
    );
    event2Id = e2Res.rows[0].id;

    // Register attendee 1 for event 1
    const regRes = await query(
      `INSERT INTO registrations (event_id, user_id, status, approval_status)
       VALUES ($1, $2, 'registered', 'approved')
       RETURNING id`,
      [event1Id, att1Id]
    );
    reg1Id = regRes.rows[0].id;

    await query(
      `INSERT INTO tickets (registration_id, event_id, user_id, qr_token, status)
       VALUES ($1, $2, $3, $4, 'ISSUED')`,
      [reg1Id, event1Id, att1Id, `tkt-token-${testSuffix}`]
    );

    // -------------------------------------------------------------
    // TEST 2: SOFT DELETION OF EVENT
    // -------------------------------------------------------------
    console.log('\n📦 2. Testing Soft Deletion & View Disappearance...');

    // Before deletion: event1 is visible in active list
    const activeEventsBefore = await EventService.getEvents({ organizerId: org1Id });
    assert(activeEventsBefore.some((e) => e.id === event1Id), 'Event 1 is initially visible in organizer active events list');

    // Org1 deletes their event
    const deleteResult = await EventService.deleteEvent(event1Id, org1Id, 'organizer');
    assert(deleteResult === true, 'Organizer successfully soft deletes their event');

    // After deletion: event disappears from normal listings
    const activeEventsAfter = await EventService.getEvents({ organizerId: org1Id });
    assert(!activeEventsAfter.some((e) => e.id === event1Id), 'Soft-deleted event disappears from organizer active list');

    const publicEvent = await EventService.getEventById(event1Id);
    assert(publicEvent === null, 'Soft-deleted event returns null (404) for normal event views');

    // -------------------------------------------------------------
    // TEST 3: ROLE-BASED ACCESS & TENANT ISOLATION
    // -------------------------------------------------------------
    console.log('\n📦 3. Testing Role-Based Recycle Bin Isolation & Anti-Tampering...');

    // Org 1 checks their recycle bin -> Sees Addis AI Summit
    const org1Bin = await RecycleBinService.getRecycleBinItems(org1Id, 'organizer');
    assert(org1Bin.some((item) => item.id === event1Id), 'Org 1 can see their deleted event in their Recycle Bin');

    // Org 2 checks their recycle bin -> MUST NOT see Org 1's deleted event!
    const org2Bin = await RecycleBinService.getRecycleBinItems(org2Id, 'organizer');
    assert(!org2Bin.some((item) => item.id === event1Id), 'Org 2 CANNOT see Org 1 deleted event (strictly isolated)');

    // Attendee 1 checks their recycle bin -> MUST NOT see organizer events
    const attBin = await RecycleBinService.getRecycleBinItems(att1Id, 'attendee');
    assert(!attBin.some((item) => item.id === event1Id), 'Attendee CANNOT see organizer deleted events');

    // Admin checks administrative recycle bin -> Sees the deleted event
    const adminBin = await RecycleBinService.getRecycleBinItems(adminId, 'admin');
    assert(adminBin.some((item) => item.id === event1Id), 'Platform Admin can view deleted event in Administrative Recycle Bin');

    // Anti-tampering check: Org 2 attempts to restore Org 1's event -> Rejected with 403
    let org2RestoreTamperError = false;
    try {
      await RecycleBinService.restoreItem(org2Id, 'organizer', 'event', event1Id);
    } catch (e: any) {
      if (e.statusCode === 403) {
        org2RestoreTamperError = true;
      }
    }
    assert(org2RestoreTamperError, 'Tampering blocked: Org 2 cannot restore Org 1 event (HTTP 403)');

    // Anti-tampering check: Org 1 attempts to restore an unauthorized user account -> Rejected with 403
    let orgUserRestoreTamperError = false;
    try {
      await RecycleBinService.restoreItem(org1Id, 'organizer', 'user', att1Id);
    } catch (e: any) {
      if (e.statusCode === 403) {
        orgUserRestoreTamperError = true;
      }
    }
    assert(orgUserRestoreTamperError, 'Strict Section 4.B: Organizers cannot restore user accounts (Admin only, HTTP 403)');

    // -------------------------------------------------------------
    // TEST 4: RESTORATION & RELATIONSHIP INTEGRITY
    // -------------------------------------------------------------
    console.log('\n📦 4. Testing Event Restoration & Dependency Preservation...');

    const restoreRes = await RecycleBinService.restoreItem(org1Id, 'organizer', 'event', event1Id);
    assert(restoreRes.success === true, 'Event restored successfully by authorized owner');

    // Check event is back in active listings
    const activeEventsRestored = await EventService.getEvents({ organizerId: org1Id });
    assert(activeEventsRestored.some((e) => e.id === event1Id), 'Restored event reappears in organizer active list');

    // Verify registrations are preserved
    const roster = await EventService.getEventRoster(event1Id, org1Id, 'organizer');
    assert(roster.some((r) => r.registrationId === reg1Id), 'Original attendee registrations and tickets preserved after restoration');

    // -------------------------------------------------------------
    // TEST 5: REMOVING ATTENDEE & RESTORING REGISTRATION
    // -------------------------------------------------------------
    console.log('\n📦 5. Testing Attendee Soft Removal & Attendee/Organizer Restoration...');

    // Organizer removes attendee from event roster
    await EventService.removeAttendeeFromEvent(event1Id, att1Id, org1Id, 'organizer');

    // Attendee is removed from active roster
    const activeRosterAfterRemove = await EventService.getEventRoster(event1Id, org1Id, 'organizer');
    assert(!activeRosterAfterRemove.some((r) => r.registrationId === reg1Id), 'Removed attendee no longer appears in active event roster');

    // Appears in Organizer's Recycle Bin under registrations
    const orgBinRegistrations = await RecycleBinService.getRecycleBinItems(org1Id, 'organizer', { entityType: 'registration' });
    assert(orgBinRegistrations.some((r) => r.id === reg1Id), 'Removed attendee registration appears in Organizer Recycle Bin');

    // Appears in Attendee's own Recycle Bin
    const attBinRegistrations = await RecycleBinService.getRecycleBinItems(att1Id, 'attendee', { entityType: 'registration' });
    assert(attBinRegistrations.some((r) => r.id === reg1Id), 'Registration appears in Attendee Recycle Bin');

    // Attendee restores their registration
    const attRestoreRes = await RecycleBinService.restoreItem(att1Id, 'attendee', 'registration', reg1Id);
    assert(attRestoreRes.success === true, 'Attendee can restore their registration');

    // Reappears on active event roster
    const rosterAfterAttRestore = await EventService.getEventRoster(event1Id, org1Id, 'organizer');
    assert(rosterAfterAttRestore.some((r) => r.registrationId === reg1Id), 'Restored registration returns to event roster');

    // -------------------------------------------------------------
    // TEST 6: 30-DAY RETENTION POLICY & DAYS REMAINING
    // -------------------------------------------------------------
    console.log('\n📦 6. Testing 30-Day Retention Policy & Expiry Calculation...');

    // Simulate item deleted 5 days ago
    const simulatedDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const retentionInfo = RecycleBinService.computeRetention(simulatedDate);
    assert(retentionInfo.daysRemaining === 25, `Computes remaining retention accurately (Expected 25, got ${retentionInfo.daysRemaining})`);

    // -------------------------------------------------------------
    // TEST 7: FINANCIAL SAFEGUARDS ON PERMANENT DELETION
    // -------------------------------------------------------------
    console.log('\n📦 7. Testing Financial Protections on Permanent Deletion...');

    // Soft delete event again
    await EventService.deleteEvent(event1Id, org1Id, 'organizer');

    // Add a settled payment to event 1
    const pmtTxId = `tx-settled-${testSuffix}`;
    await query(
      `INSERT INTO payments (transaction_id, event_id, user_id, amount, commission_amount, organizer_payout, status)
       VALUES ($1, $2, $3, 500, 50, 450, 'SETTLED')`,
      [pmtTxId, event1Id, att1Id]
    );

    // Attempt permanent deletion -> MUST BE BLOCKED due to financial audit laws!
    let permanentDeleteBlocked = false;
    let blockReason = '';
    try {
      await RecycleBinService.permanentlyDeleteItem(org1Id, 'organizer', 'event', event1Id);
    } catch (e: any) {
      permanentDeleteBlocked = true;
      blockReason = e.message;
    }

    assert(permanentDeleteBlocked, 'Permanent deletion strictly BLOCKED for event with settled financial records');
    assert(blockReason.includes('settled financial transaction'), 'Rejection explanation informs user of financial compliance rule');

    // Clean up payment so we can test clean permanent deletion
    await query('DELETE FROM payments WHERE transaction_id = $1', [pmtTxId]);
    await query('DELETE FROM tickets WHERE event_id = $1', [event1Id]);
    await query('DELETE FROM registrations WHERE event_id = $1', [event1Id]);

    // Now permanent deletion succeeds
    const permRes = await RecycleBinService.permanentlyDeleteItem(org1Id, 'organizer', 'event', event1Id);
    assert(permRes.success === true, 'Event permanently deleted when no protected financial dependencies exist');

    // -------------------------------------------------------------
    // TEST 8: AUDIT TRAIL LOGGING
    // -------------------------------------------------------------
    console.log('\n📦 8. Testing Audit Trail Logging...');

    const auditLogs = await RecycleBinService.getAuditLogs({ limit: 10 });
    assert(auditLogs.length > 0, 'Audit trail logs recorded');
    assert(auditLogs.some((l) => l.action === 'soft_delete'), 'Audit trail recorded soft_delete action');
    assert(auditLogs.some((l) => l.action === 'restore'), 'Audit trail recorded restore action');
    assert(auditLogs.some((l) => l.action === 'permanent_delete'), 'Audit trail recorded permanent_delete action');

    // -------------------------------------------------------------
    // TEST 9: AUTOMATED PURGE OF EXPIRED ITEMS
    // -------------------------------------------------------------
    console.log('\n📦 9. Testing Automated Purge of Items Exceeding 30 Days...');

    // Insert an artificially expired review (>31 days old)
    const oldReviewRes = await query(
      `INSERT INTO event_reviews (event_id, user_id, rating, comment, deleted_at, deleted_by)
       VALUES ($1, $2, 5, 'Great session', NOW() - INTERVAL '35 days', $2)
       RETURNING id`,
      [event2Id, att1Id]
    );
    const oldRevId = oldReviewRes.rows[0].id;

    // Run purge
    const purgeResult = await RecycleBinService.purgeExpiredItems();
    assert(purgeResult.purgedCount >= 1, 'Purge routine automatically cleaned up items past 30 days');

    const checkRev = await query('SELECT 1 FROM event_reviews WHERE id = $1', [oldRevId]);
    assert(checkRev.rowCount === 0, 'Expired item was purged from database');

  } catch (err) {
    console.error('Fatal test failure:', err);
    failed++;
  } finally {
    // Teardown test records
    console.log('\n🧹 Cleaning up test records...');
    try {
      if (event1Id) await query('DELETE FROM events WHERE id = $1', [event1Id]);
      if (event2Id) await query('DELETE FROM events WHERE id = $1', [event2Id]);
      await query('DELETE FROM users WHERE LOWER(email) IN ($1, $2, $3, $4, $5, $6)', [
        org1Email.toLowerCase(),
        org2Email.toLowerCase(),
        att1Email.toLowerCase(),
        sponsorEmail.toLowerCase(),
        exhibitorEmail.toLowerCase(),
        adminEmail.toLowerCase(),
      ]);
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }
  }

  console.log('\n====================================================');
  console.log(`📊 RECYCLE BIN VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runRecycleBinTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
