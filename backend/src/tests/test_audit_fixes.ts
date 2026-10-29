import { query } from '../config/db';
import { RecycleBinService } from '../services/recycleBin.service';
import { EventService } from '../services/event.service';
import { UserService } from '../services/user.service';
import { SearchService } from '../services/search.service';
import { SponsorMatchingService } from '../services/matching/sponsorMatching.service';
import { CheckinService } from '../services/checkin.service';
import { recycleBinItemParamSchema } from '../schemas/common.schema';

async function runAuditFixesRegressionTests() {
  console.log('====================================================');
  console.log('🛡️  SHEEBA AUDIT FIXES REGRESSION VERIFICATION SUITE');
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
  const orgEmail = `audit_org_${testSuffix}@sheeba.test`;
  const attEmail1 = `audit_att1_${testSuffix}@sheeba.test`;
  const attEmail2 = `audit_att2_${testSuffix}@sheeba.test`;
  const sponsorEmail = `audit_sponsor_${testSuffix}@sheeba.test`;
  const adminEmail = `audit_admin_${testSuffix}@sheeba.test`;

  let orgId = '';
  let att1Id = '';
  let att2Id = '';
  let sponsorId = '';
  let adminId = '';

  let event1Id = '';
  let eventCapId = '';
  let appId = '';

  try {
    // -------------------------------------------------------------
    // SETUP: Create test users
    // -------------------------------------------------------------
    console.log('📦 Setup: Creating isolated test users...');

    const orgRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, organization, is_active, approval_status, is_organizer, organizer_approval_status)
       VALUES ($1, 'hash', 'Audit Organizer', 'organizer', 'Audit Tech Hub', TRUE, 'approved', TRUE, 'approved')
       RETURNING id`,
      [orgEmail]
    );
    orgId = orgRes.rows[0].id;

    const att1Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'hash', 'Audit Attendee One', 'attendee', TRUE, 'approved')
       RETURNING id`,
      [attEmail1]
    );
    att1Id = att1Res.rows[0].id;

    const att2Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'hash', 'Audit Attendee Two', 'attendee', TRUE, 'approved')
       RETURNING id`,
      [attEmail2]
    );
    att2Id = att2Res.rows[0].id;

    const sponsorRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, company_name, industry_category, is_active, approval_status)
       VALUES ($1, 'hash', 'Audit Sponsor', 'sponsor', 'Audit Corp', 'Technology', TRUE, 'approved')
       RETURNING id`,
      [sponsorEmail]
    );
    sponsorId = sponsorRes.rows[0].id;

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'hash', 'Audit Admin', 'admin', TRUE, 'approved')
       RETURNING id`,
      [adminEmail]
    );
    adminId = adminRes.rows[0].id;

    // Create an event
    const evtRes = await query(
      `INSERT INTO events (title, description, event_date, organizer_id, capacity, status, event_type, is_publicized, location)
       VALUES ($1, 'Audit Test Event', CURRENT_DATE + INTERVAL '5 days', $2, 50, 'published', 'hackathon', TRUE, 'Addis Ababa')
       RETURNING id`,
      [`Audit Test Summit ${testSuffix}`, orgId]
    );
    event1Id = evtRes.rows[0].id;

    console.log('  Users & test event created successfully.\n');

    // -------------------------------------------------------------
    // PRIORITY 1: FIX 1 & 2 - Unique constraint collisions & re-registration
    // -------------------------------------------------------------
    console.log('🔹 Priority 1.1 & 1.2: Soft-deleted registration & re-registration...');

    // 1. Initial registration
    const reg1Res = await EventService.registerForEvent({ eventId: event1Id, userId: att1Id });
    const reg1Id = reg1Res.ticket?.registrationId;
    assert(Boolean(reg1Id), 'Attendee initially registers for event');

    // 2. Soft-delete the registration (e.g. attendee or organizer removes)
    await EventService.removeAttendeeFromEvent(event1Id, att1Id, orgId, 'organizer');
    const checkDeletedReg = await query('SELECT deleted_at FROM registrations WHERE id = $1', [reg1Id]);
    assert(Boolean(checkDeletedReg.rows[0]?.deleted_at), 'Registration is soft-deleted');

    // 3. Attendee re-registers for the same event
    let reRegSuccess = false;
    let newRegId = '';
    try {
      const reg2Res = await EventService.registerForEvent({ eventId: event1Id, userId: att1Id });
      newRegId = reg2Res.ticket?.registrationId;
      reRegSuccess = Boolean(newRegId && newRegId !== reg1Id);
    } catch (e: any) {
      console.error('Re-registration error:', e);
    }
    assert(reRegSuccess, 'Attendee can re-register after soft deletion without unique constraint collision');

    // 4. Test unique constraint on sponsorship deals with soft deletion
    console.log('🔹 Priority 1.1: Partial unique index on sponsorship deals & event reviews...');

    // Create a sponsorship application
    const appRes = await query(
      `INSERT INTO sponsorship_applications (
         organizer_id, event_title, expected_date, location, target_audience, description, contact_name, contact_phone, contact_email
       ) VALUES ($1, 'Audit Sponsorship Summit', 'Next Month', 'Addis Ababa', 'Engineers', 'Summit', 'Organizer', '0911000000', $2)
       RETURNING id`,
      [orgId, orgEmail]
    );
    appId = appRes.rows[0].id;

    // Create deal 1
    const deal1Res = await query(
      `INSERT INTO sponsorship_deals (application_id, sponsor_id, status, package_name, pledged_amount)
       VALUES ($1, $2, 'INTERESTED', 'Gold', 10000) RETURNING id`,
      [appId, sponsorId]
    );
    const deal1Id = deal1Res.rows[0].id;

    // Soft delete deal 1
    await query('UPDATE sponsorship_deals SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [sponsorId, deal1Id]);

    // Create deal 2 for the same application and sponsor -> Should succeed with partial index
    let deal2Success = false;
    try {
      const deal2Res = await query(
        `INSERT INTO sponsorship_deals (application_id, sponsor_id, status, package_name, pledged_amount)
         VALUES ($1, $2, 'INTERESTED', 'Platinum', 20000) RETURNING id`,
        [appId, sponsorId]
      );
      deal2Success = Boolean(deal2Res.rowCount && deal2Res.rowCount > 0);
    } catch (e: any) {
      console.error('Sponsorship deal insert error:', e);
    }
    assert(deal2Success, 'New sponsorship deal succeeds after previous deal was soft-deleted');

    // Test event review partial unique index
    const rev1Res = await query(
      `INSERT INTO event_reviews (event_id, user_id, rating, comment)
       VALUES ($1, $2, 5, 'First review') RETURNING id`,
      [event1Id, att2Id]
    );
    const rev1Id = rev1Res.rows[0].id;

    // Soft delete review 1
    await query('UPDATE event_reviews SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [att2Id, rev1Id]);

    // Create review 2 for the same event & user -> Should succeed with partial index
    let rev2Success = false;
    try {
      const rev2Res = await query(
        `INSERT INTO event_reviews (event_id, user_id, rating, comment)
         VALUES ($1, $2, 4, 'Second updated review') RETURNING id`,
        [event1Id, att2Id]
      );
      rev2Success = Boolean(rev2Res.rowCount && rev2Res.rowCount > 0);
    } catch (e: any) {
      console.error('Event review insert error:', e);
    }
    assert(rev2Success, 'New event review succeeds after previous review was soft-deleted');

    // -------------------------------------------------------------
    // PRIORITY 1: FIX 3 - Exclude soft-deleted events from organizer account deletion
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 1.3: Organizer account deletion with soft-deleted events...');

    // Create a temporary organizer with an upcoming event
    const tempOrgEmail = `temp_org_${testSuffix}@sheeba.test`;
    const tempOrgRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status, is_organizer, organizer_approval_status)
       VALUES ($1, 'hash', 'Temp Organizer', 'organizer', TRUE, 'approved', TRUE, 'approved') RETURNING id`,
      [tempOrgEmail]
    );
    const tempOrgId = tempOrgRes.rows[0].id;

    const tempEvtRes = await query(
      `INSERT INTO events (title, description, event_date, organizer_id, capacity, status, event_type, location)
       VALUES ('Temp Upcoming Event', 'Description', CURRENT_DATE + INTERVAL '10 days', $1, 100, 'published', 'workshop', 'Addis Ababa') RETURNING id`,
      [tempOrgId]
    );
    const tempEvtId = tempEvtRes.rows[0].id;

    // Trying to delete account with ACTIVE upcoming event -> BLOCKED
    let activeEventBlocked = false;
    try {
      await UserService.deleteAccount(tempOrgId);
    } catch (e: any) {
      activeEventBlocked = e.statusCode === 400;
    }
    assert(activeEventBlocked, 'Account deletion blocked when active upcoming event exists');

    // Now soft-delete the upcoming event
    await EventService.deleteEvent(tempEvtId, tempOrgId, 'organizer');

    // Trying to delete account when all upcoming events are soft-deleted -> SUCCEEDS
    let softDeletedAllowed = false;
    try {
      await UserService.deleteAccount(tempOrgId);
      softDeletedAllowed = true;
    } catch (e: any) {
      console.error('Account deletion with soft-deleted event error:', e);
    }
    assert(softDeletedAllowed, 'Account deletion succeeds when all upcoming events are soft-deleted');

    // -------------------------------------------------------------
    // PRIORITY 1: FIX 4 - Exclude soft-deleted users from public user search
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 1.4: Public user search excludes soft-deleted users...');

    const searchUserEmail = `searchable_${testSuffix}@sheeba.test`;
    const searchUserRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'hash', 'Searchable UniquePerson ${testSuffix}', 'attendee', TRUE, 'approved') RETURNING id`,
      [searchUserEmail]
    );
    const searchUserId = searchUserRes.rows[0].id;

    // Search while active -> Found
    const searchRes1 = await SearchService.searchPublic(`UniquePerson ${testSuffix}`);
    const foundBefore = (searchRes1.attendees || []).some((u: any) => u.id === searchUserId);
    assert(foundBefore, 'Active user is found in public search');

    // Soft-delete user
    await query('UPDATE users SET deleted_at = NOW(), deleted_by = $1 WHERE id = $1', [searchUserId]);

    // Search while soft-deleted -> Not found
    const searchRes2 = await SearchService.searchPublic(`UniquePerson ${testSuffix}`);
    const foundAfter = (searchRes2.attendees || []).some((u: any) => u.id === searchUserId);
    assert(!foundAfter, 'Soft-deleted user is excluded from public search results');

    // -------------------------------------------------------------
    // PRIORITY 2: FIX 5 - Financial safeguards on SETTLED and REFUNDED records
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 2.5: Protect both SETTLED and REFUNDED financial records...');

    // Create a dummy event for financial tests
    const finEvtRes = await query(
      `INSERT INTO events (title, description, event_date, organizer_id, capacity, status, event_type, location)
       VALUES ('Financial Test Event', 'Description', CURRENT_DATE + INTERVAL '2 days', $1, 100, 'published', 'conference', 'Addis Ababa') RETURNING id`,
      [orgId]
    );
    const finEvtId = finEvtRes.rows[0].id;

    // Soft-delete the financial event
    await EventService.deleteEvent(finEvtId, orgId, 'organizer');

    // Add a REFUNDED payment
    const refundTxId = `tx-refund-${testSuffix}`;
    await query(
      `INSERT INTO payments (transaction_id, event_id, user_id, amount, commission_amount, organizer_payout, status)
       VALUES ($1, $2, $3, 200, 20, 180, 'REFUNDED')`,
      [refundTxId, finEvtId, att1Id]
    );

    // Attempt permanent deletion -> MUST BE BLOCKED
    let refundBlocked = false;
    try {
      await RecycleBinService.permanentlyDeleteItem(orgId, 'organizer', 'event', finEvtId);
    } catch (e: any) {
      refundBlocked = e.statusCode === 400 && e.message.includes('Financial records must be retained');
    }
    assert(refundBlocked, 'Permanent deletion strictly BLOCKED for event with REFUNDED financial records');

    // Check recycle bin list: canPermanentDelete is false with explanation
    const orgBin = await RecycleBinService.getRecycleBinItems(orgId, 'organizer');
    const finItem = orgBin.find((i) => i.id === finEvtId);
    assert(finItem?.canPermanentDelete === false, 'canPermanentDelete is false in Recycle Bin view for refunded record');

    // Test automated purge does NOT purge event with REFUNDED payment
    await query("UPDATE events SET deleted_at = NOW() - INTERVAL '35 days' WHERE id = $1", [finEvtId]);
    await RecycleBinService.purgeExpiredItems();
    const checkStillExists = await query('SELECT 1 FROM events WHERE id = $1', [finEvtId]);
    assert(checkStillExists.rowCount === 1, 'Automated purge skips soft-deleted event with REFUNDED payment');

    // Cleanup payment
    await query('DELETE FROM payments WHERE transaction_id = $1', [refundTxId]);

    // -------------------------------------------------------------
    // PRIORITY 2: FIX 6 - Prevent updates to soft-deleted events
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 2.6: Prevent updates to soft-deleted events...');

    let updateBlocked = false;
    let updateErrMsg = '';
    try {
      await EventService.updateEvent(finEvtId, orgId, 'organizer', { title: 'Updated Title' });
    } catch (e: any) {
      updateBlocked = e.statusCode === 400;
      updateErrMsg = e.message;
    }
    assert(updateBlocked, 'updateEvent is blocked on soft-deleted event with HTTP 400');
    assert(updateErrMsg.includes('Recycle Bin'), 'updateEvent returns clear Recycle Bin restoration instruction');

    // -------------------------------------------------------------
    // PRIORITY 2: FIX 7 - Exclude soft-deleted events from sponsor matching
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 2.7: Exclude soft-deleted events from sponsor matching...');

    // finEvtId is soft-deleted. Let's run sponsor matching for sponsorId
    const matchResults = await SponsorMatchingService.getRecommendationsForSponsor(sponsorId);
    const includesDeleted = matchResults.matches.some((m) => m.event.id === finEvtId);
    assert(!includesDeleted, 'Sponsor matching strictly excludes soft-deleted events from candidate pool');

    // -------------------------------------------------------------
    // PRIORITY 2: FIX 8 - QR check-in ticket lookup rejects soft-deleted events
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 2.8: QR check-in rejects tickets for soft-deleted events...');

    // Issue ticket for finEvtId (soft-deleted)
    const dummyTicketCode = `SHB-AUDIT-${Math.floor(1000 + Math.random() * 9000)}`;
    const dummyRegRes = await query(
      `INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, 'registered') RETURNING id`,
      [finEvtId, att1Id]
    );
    const dummyRegId = dummyRegRes.rows[0].id;
    await query(
      `INSERT INTO tickets (event_id, user_id, registration_id, ticket_code, qr_token, status)
       VALUES ($1, $2, $3, $4, $5, 'ISSUED') RETURNING id`,
      [finEvtId, att1Id, dummyRegId, dummyTicketCode, dummyTicketCode]
    );

    let scanBlocked = false;
    let scanErrorCode = '';
    try {
      await CheckinService.getTicketVerification({
        tokenOrCode: dummyTicketCode,
        userId: orgId,
        userRole: 'organizer',
      });
    } catch (e: any) {
      scanBlocked = e.statusCode === 400;
      scanErrorCode = e.code;
    }
    assert(scanBlocked && scanErrorCode === 'EVENT_DELETED', 'QR ticket lookup rejects ticket for soft-deleted event with EVENT_DELETED');

    // -------------------------------------------------------------
    // PRIORITY 3: FIX 9 - Capacity limit check during registration restoration
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 3.9: Check event capacity before restoring a registration...');

    // Create an event with capacity = 1
    const capEvtRes = await query(
      `INSERT INTO events (title, description, event_date, organizer_id, capacity, status, event_type, location)
       VALUES ('Capacity Limited Event', 'Desc', CURRENT_DATE + INTERVAL '3 days', $1, 1, 'published', 'workshop', 'Addis Ababa') RETURNING id`,
      [orgId]
    );
    eventCapId = capEvtRes.rows[0].id;

    // Register att1, then soft delete it
    const capReg1 = await EventService.registerForEvent({ eventId: eventCapId, userId: att1Id });
    const capReg1Id = capReg1.ticket?.registrationId;
    await EventService.removeAttendeeFromEvent(eventCapId, att1Id, orgId, 'organizer');

    // Register att2 to fill the capacity to 1/1
    await EventService.registerForEvent({ eventId: eventCapId, userId: att2Id });

    // Now att1 tries to restore registration -> Event is at full capacity!
    let restoreCapBlocked = false;
    let restoreCapMsg = '';
    try {
      await RecycleBinService.restoreItem(att1Id, 'attendee', 'registration', capReg1Id!);
    } catch (e: any) {
      restoreCapBlocked = e.statusCode === 400;
      restoreCapMsg = e.message;
    }
    assert(restoreCapBlocked, 'Restoring registration blocked when event is at full capacity (HTTP 400)');
    assert(restoreCapMsg.includes('maximum capacity') || restoreCapMsg.includes('full capacity'), 'Clear error indicates event has reached maximum capacity');

    // Test restoring registration when another active registration already exists for same user
    let dupActiveRestoreBlocked = false;
    try {
      // att1 re-registered for event1 earlier (newRegId is active)
      // Now att1 tries to restore old reg1Id for event1
      await RecycleBinService.restoreItem(att1Id, 'attendee', 'registration', reg1Id!);
    } catch (e: any) {
      dupActiveRestoreBlocked = e.statusCode === 400;
    }
    assert(dupActiveRestoreBlocked, 'Restoring registration blocked if user already has an active registration for event');

    // -------------------------------------------------------------
    // PRIORITY 3: FIX 10 - Zod validation for Recycle Bin entity type route parameter
    // -------------------------------------------------------------
    console.log('\n🔹 Priority 3.10: Zod validation for Recycle Bin entityType parameter...');

    const validTypes = ['event', 'registration', 'sponsorship_application', 'sponsorship_deal', 'event_vendor', 'user', 'review'];
    let allValidPassed = true;
    for (const vt of validTypes) {
      const parsed = recycleBinItemParamSchema.safeParse({ entityType: vt, id: '123' });
      if (!parsed.success) allValidPassed = false;
    }
    assert(allValidPassed, 'Zod schema accepts all valid entity types');

    const invalidTypes = ['invalid', 'secret_table', 'orders', 'payments', 'eval'];
    let allInvalidRejected = true;
    for (const it of invalidTypes) {
      const parsed = recycleBinItemParamSchema.safeParse({ entityType: it, id: '123' });
      if (parsed.success) allInvalidRejected = false;
    }
    assert(allInvalidRejected, 'Zod schema rejects unauthorized/invalid entity types');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log('\n🧹 Cleaning up test artifacts...');
    try {
      if (appId) {
        await query('DELETE FROM sponsorship_deals WHERE application_id = $1', [appId]);
        await query('DELETE FROM sponsorship_applications WHERE id = $1', [appId]);
      }
      if (event1Id) {
        await query('DELETE FROM event_reviews WHERE event_id = $1', [event1Id]);
        await query('DELETE FROM tickets WHERE event_id = $1', [event1Id]);
        await query('DELETE FROM registrations WHERE event_id = $1', [event1Id]);
        await query('DELETE FROM events WHERE id = $1', [event1Id]);
      }
      if (eventCapId) {
        await query('DELETE FROM tickets WHERE event_id = $1', [eventCapId]);
        await query('DELETE FROM registrations WHERE event_id = $1', [eventCapId]);
        await query('DELETE FROM events WHERE id = $1', [eventCapId]);
      }
      await query('DELETE FROM events WHERE organizer_id = $1', [orgId]);
      await query('DELETE FROM users WHERE LOWER(email) IN ($1, $2, $3, $4, $5)', [
        orgEmail.toLowerCase(),
        attEmail1.toLowerCase(),
        attEmail2.toLowerCase(),
        sponsorEmail.toLowerCase(),
        adminEmail.toLowerCase(),
      ]);
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }
  }

  console.log('\n====================================================');
  console.log(`📊 AUDIT FIXES VERIFICATION: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAuditFixesRegressionTests().catch((err) => {
  console.error('Execution failure:', err);
  process.exit(1);
});
