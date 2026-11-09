import assert from 'assert';
import { AdminService } from '../services/admin.service';

async function runAdminUsersPaginationTest() {
  console.log('====================================================');
  console.log('🧪 TESTING ADMIN USERS PAGINATION & SUB-TAB FILTERING');
  console.log('====================================================');

  try {
    // 1. Test Organizers Pagination (Pending)
    console.log('\n🔹 1. Testing Organizers - Pending sub-tab (15 per page)...');
    const orgPending: any = await AdminService.getUsersList({
      role: 'organizer',
      status: 'pending',
      page: 1,
      limit: 15,
    });
    assert(orgPending.role === 'organizer', 'Role should be organizer');
    assert(orgPending.limit === 15, 'Limit should be 15');
    assert(Array.isArray(orgPending.records), 'Records must be an array');
    assert(orgPending.records.length <= 15, 'Page records should not exceed 15');
    assert(typeof orgPending.total === 'number', 'Total should be a number');
    assert(typeof orgPending.totalPages === 'number', 'TotalPages should be a number');
    assert(orgPending.counts && typeof orgPending.counts.pending === 'number', 'Counts.pending should exist');
    assert(typeof orgPending.counts.approved === 'number', 'Counts.approved should exist');
    assert(typeof orgPending.counts.rejected === 'number', 'Counts.rejected should exist');
    // Ensure all returned records in pending actually have pending approval status
    for (const r of orgPending.records) {
      assert(r.approvalStatus === 'pending', `Record ${r.id} must have pending approvalStatus, got ${r.approvalStatus}`);
    }
    console.log(`  ✅ PASS: Retrieved ${orgPending.records.length}/${orgPending.total} pending organizers (Total pending count: ${orgPending.counts.pending})`);

    // 2. Test Organizers Pagination (Approved)
    console.log('\n🔹 2. Testing Organizers - Approved sub-tab (15 per page)...');
    const orgApproved: any = await AdminService.getUsersList({
      role: 'organizer',
      status: 'approved',
      page: 1,
      limit: 15,
    });
    assert(Array.isArray(orgApproved.records), 'Records must be an array');
    assert(orgApproved.records.length <= 15, 'Approved records should not exceed 15');
    for (const r of orgApproved.records) {
      assert(r.approvalStatus === 'approved', `Record ${r.id} must have approved approvalStatus, got ${r.approvalStatus}`);
    }
    console.log(`  ✅ PASS: Retrieved ${orgApproved.records.length}/${orgApproved.total} approved organizers (Total approved count: ${orgApproved.counts.approved})`);

    // 3. Test Organizers Pagination (Rejected / More Info)
    console.log('\n🔹 3. Testing Organizers - Rejected / More Info sub-tab (15 per page)...');
    const orgRejected: any = await AdminService.getUsersList({
      role: 'organizer',
      status: 'rejected',
      page: 1,
      limit: 15,
    });
    assert(Array.isArray(orgRejected.records), 'Records must be an array');
    for (const r of orgRejected.records) {
      assert(
        r.approvalStatus === 'rejected' || r.approvalStatus === 'more_info_needed',
        `Record ${r.id} must have rejected or more_info_needed approvalStatus, got ${r.approvalStatus}`
      );
    }
    console.log(`  ✅ PASS: Retrieved ${orgRejected.records.length}/${orgRejected.total} rejected/more-info organizers (Total rejected count: ${orgRejected.counts.rejected})`);

    // 4. Test Corporate Sponsors Pagination (Pending, Approved, Rejected)
    console.log('\n🔹 4. Testing Sponsors - Pending sub-tab (15 per page)...');
    const spPending: any = await AdminService.getUsersList({
      role: 'sponsor',
      status: 'pending',
      page: 1,
      limit: 15,
    });
    assert(spPending.role === 'sponsor', 'Role should be sponsor');
    assert(Array.isArray(spPending.records), 'Records must be an array');
    assert(spPending.records.length <= 15, 'Sponsor records should not exceed 15');
    for (const s of spPending.records) {
      assert(s.approvalStatus === 'pending', `Sponsor ${s.id} must be pending, got ${s.approvalStatus}`);
    }
    console.log(`  ✅ PASS: Retrieved ${spPending.records.length}/${spPending.total} pending sponsors (Total pending count: ${spPending.counts.pending})`);

    console.log('\n🔹 5. Testing Sponsors - Approved sub-tab (15 per page)...');
    const spApproved: any = await AdminService.getUsersList({
      role: 'sponsor',
      status: 'approved',
      page: 1,
      limit: 15,
    });
    for (const s of spApproved.records) {
      assert(s.approvalStatus === 'approved', `Sponsor ${s.id} must be approved, got ${s.approvalStatus}`);
    }
    console.log(`  ✅ PASS: Retrieved ${spApproved.records.length}/${spApproved.total} approved sponsors (Total approved count: ${spApproved.counts.approved})`);

    // 6. Test Attendees Pagination
    console.log('\n🔹 6. Testing Attendees - Backend pagination (15 per page)...');
    const attendeesRes: any = await AdminService.getUsersList({
      role: 'attendee',
      page: 1,
      limit: 15,
    });
    assert(attendeesRes.role === 'attendee', 'Role should be attendee');
    assert(Array.isArray(attendeesRes.records), 'Records must be an array');
    assert(attendeesRes.records.length <= 15, 'Attendee records should not exceed 15');
    console.log(`  ✅ PASS: Retrieved ${attendeesRes.records.length}/${attendeesRes.total} attendees on page 1`);

    // 7. Backward Compatibility Check: Unparameterized call must return full legacy object
    console.log('\n🔹 7. Testing Legacy backward compatibility (no role param)...');
    const legacy: any = await AdminService.getUsersList();
    assert(Array.isArray(legacy.attendees), 'Legacy call must have attendees array');
    assert(Array.isArray(legacy.organizers), 'Legacy call must have organizers array');
    assert(Array.isArray(legacy.sponsors), 'Legacy call must have sponsors array');
    console.log(`  ✅ PASS: Legacy format preserved (attendees: ${legacy.attendees.length}, organizers: ${legacy.organizers.length}, sponsors: ${legacy.sponsors.length})`);

    console.log('\n====================================================');
    console.log('🎉 ALL ADMIN USERS PAGINATION & SUB-TAB TESTS PASSED!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runAdminUsersPaginationTest();
