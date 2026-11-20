import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import pool, { query } from '../config/db';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { EventService } from '../services/event.service';
import { SubscriptionService } from '../services/subscription.service';

async function runE2E() {
  console.log('=== STARTING SUBSCRIPTION & EVENT LIMITS E2E TEST ===');

  try {
    // 0. Find an admin user
    const adminRes = await query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id;
    console.log(`0. Found Admin ID: ${adminId}`);

    // 1. Create a fresh organizer
    const email = `org_limit_test_${Date.now()}@test.sheeba.et`;
    console.log(`1. Registering organizer: ${email}`);
    const regResult = await AuthService.registerUser({
      email,
      password: 'password123',
      full_name: 'Allowance Test Org',
      role: 'organizer',
      organization: 'Sheeba Limit Testers',
    });
    const orgId = regResult.user.id;
    console.log(`   Organizer registered with ID: ${orgId}`);

    // 2. Admin approves organizer
    await AdminService.approveOrganizer(orgId);
    console.log('2. Organizer approved by admin.');

    // 3. Verify initial subscription record
    let sub = await SubscriptionService.getOrganizerSubscription(orgId);
    console.log(`3. Initial Subscription: max_events=${sub.max_events}, events_used=${sub.events_used}, remaining=${sub.remaining_events}`);
    if (sub.max_events !== 1) {
      throw new Error(`Expected default max_events = 1, got ${sub.max_events}`);
    }

    // 4. Create first event (Allowed)
    console.log('4. Creating 1st event within allowance...');
    const event1 = await EventService.createEvent(orgId, {
      title: 'Limit Test Event 1',
      description: 'First event within 1-event plan.',
      type: 'summit',
      date: '2026-10-01',
      startTime: '10:00 AM',
      endTime: '04:00 PM',
      location: 'Addis Convention Center',
      capacity: 100,
      isPaid: false,
      ticketPrice: 0,
      customQuestions: [],
    });
    console.log(`   1st Event created successfully: id=${event1.id}`);

    sub = await SubscriptionService.getOrganizerSubscription(orgId);
    console.log(`   Subscription after 1st event: max_events=${sub.max_events}, events_used=${sub.events_used}, remaining=${sub.remaining_events}`);
    if (sub.events_used !== 1 || sub.remaining_events !== 0) {
      throw new Error(`Expected events_used=1 and remaining=0, got used=${sub.events_used}, remaining=${sub.remaining_events}`);
    }

    // 5. Attempt creating 2nd event (Should be BLOCKED)
    console.log('5. Attempting to create 2nd event (Should be rejected with limit error)...');
    let limitBlocked = false;
    let blockedErrorMessage = '';
    try {
      await EventService.createEvent(orgId, {
        title: 'Limit Test Event 2 (Should Fail)',
        description: 'Should not be allowed to create this.',
        type: 'meetup',
        date: '2026-10-02',
        startTime: '10:00 AM',
        endTime: '04:00 PM',
        location: 'Addis Convention Center',
        capacity: 50,
        isPaid: false,
        ticketPrice: 0,
        customQuestions: [],
      });
    } catch (err: any) {
      limitBlocked = true;
      blockedErrorMessage = err.message || '';
      console.log(`   Caught expected rejection: "${blockedErrorMessage}"`);
    }

    if (!limitBlocked) {
      throw new Error('FAIL: Organizer was able to create event exceeding allowance limit!');
    }

    const expectedMessagePart = 'You have reached your event creation limit. Please contact Sheeba to upgrade your plan or purchase additional event credits.';
    if (!blockedErrorMessage.includes(expectedMessagePart)) {
      throw new Error(`Error message does not match expected copy. Got: "${blockedErrorMessage}"`);
    }
    console.log('   PASSED: Event creation restriction correctly enforced on backend.');

    // 6. Admin upgrades organizer allowance from 1 to 3
    console.log('6. Admin increasing organizer allowance from 1 to 3...');
    const updatedSub = await SubscriptionService.updateAllowance(orgId, adminId || orgId, {
      maxEvents: 3,
      planName: 'Growth (3 Events)',
      paymentStatus: 'paid',
      reason: 'Upgraded to 3-event agreement via Bank Transfer',
      notes: 'Payment confirmed CBE #99281726',
    });
    console.log(`   Updated Subscription: max_events=${updatedSub.max_events}, events_used=${updatedSub.events_used}, remaining=${updatedSub.remaining_events}`);
    if (updatedSub.max_events !== 3 || updatedSub.remaining_events !== 2) {
      throw new Error(`Expected max_events=3, remaining=2. Got max=${updatedSub.max_events}, rem=${updatedSub.remaining_events}`);
    }

    // 7. Verify audit history was recorded
    const history = await SubscriptionService.getAllowanceHistory(orgId);
    console.log(`7. Retrieved ${history.length} allowance history record(s).`);
    if (history.length === 0) {
      throw new Error('Expected allowance history audit trail, but none found!');
    }
    console.log(`   Latest change: from ${history[0].previous_max_events} to ${history[0].new_max_events}, reason: "${history[0].reason}"`);

    // 8. Organizer retries creating 2nd event (Should now SUCCEED)
    console.log('8. Organizer retrying 2nd event creation after admin allowance increase...');
    const event2 = await EventService.createEvent(orgId, {
      title: 'Limit Test Event 2 (Should Succeed Now)',
      description: 'Second event now permitted under upgraded 3-event plan.',
      type: 'meetup',
      date: '2026-10-02',
      startTime: '10:00 AM',
      endTime: '04:00 PM',
      location: 'Addis Convention Center',
      capacity: 50,
      isPaid: false,
      ticketPrice: 0,
      customQuestions: [],
    });
    console.log(`   2nd Event created successfully: id=${event2.id}`);

    sub = await SubscriptionService.getOrganizerSubscription(orgId);
    console.log(`   Subscription now: max_events=${sub.max_events}, events_used=${sub.events_used}, remaining=${sub.remaining_events}`);
    if (sub.events_used !== 2 || sub.remaining_events !== 1) {
      throw new Error(`Expected events_used=2 and remaining=1. Got used=${sub.events_used}, rem=${sub.remaining_events}`);
    }

    // 9. Soft delete 1 event and verify allowance synchronization
    console.log('9. Soft-deleting 1st event and testing event usage count sync...');
    await EventService.deleteEvent(event1.id, orgId, 'organizer');
    sub = await SubscriptionService.getOrganizerSubscription(orgId);
    console.log(`   Subscription after soft delete: max_events=${sub.max_events}, events_used=${sub.events_used}, remaining=${sub.remaining_events}`);
    if (sub.events_used !== 1 || sub.remaining_events !== 2) {
      throw new Error(`Expected events_used to decrease to 1 after event deletion. Got ${sub.events_used}`);
    }

    // 10. Clean up test events
    await query(`DELETE FROM events WHERE id IN ($1, $2)`, [event1.id, event2.id]);
    await query(`DELETE FROM organizer_allowance_history WHERE organizer_id = $1`, [orgId]);
    await query(`DELETE FROM organizer_subscriptions WHERE organizer_id = $1`, [orgId]);
    await query(`DELETE FROM users WHERE id = $1`, [orgId]);

    console.log('=== ALL SUBSCRIPTION & EVENT LIMIT TESTS PASSED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('E2E TEST FAILED:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runE2E();
