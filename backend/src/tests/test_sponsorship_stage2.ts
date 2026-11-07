import { query } from '../config/db';
import { SponsorshipService } from '../services/sponsorship.service';
import { AdminService } from '../services/admin.service';
import { EmailService } from '../services/email.service';
import { updateDealSchema } from '../schemas/sponsorship.schema';
import bcrypt from 'bcryptjs';

async function runStage2Tests() {
  console.log('=================================================================');
  console.log('🚀 Running Sheeba Stage 2: Formal Sponsorship Applications Test Suite');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  // Cleanup helper
  const createdUserIds: string[] = [];
  const createdPitchIds: string[] = [];
  const createdDealIds: string[] = [];

  const cleanup = async () => {
    try {
      if (createdDealIds.length > 0) {
        await query('DELETE FROM sponsorship_deals WHERE id = ANY($1::uuid[])', [createdDealIds]);
      }
      if (createdPitchIds.length > 0) {
        await query('DELETE FROM sponsorship_deals WHERE application_id = ANY($1::uuid[])', [createdPitchIds]);
        await query('DELETE FROM sponsorship_applications WHERE id = ANY($1::uuid[])', [createdPitchIds]);
      }
      if (createdUserIds.length > 0) {
        await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  };

  try {
    // 0. Setup test users and pitches
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const uniqueSuffix = Date.now().toString().slice(-6);

    // Organizer 1
    const orgRes = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, organization, approval_status, is_active)
       VALUES ($1, $2, $3, 'organizer', 'Addis Tech Hub', 'approved', TRUE)
       RETURNING id`,
      [`org_${uniqueSuffix}@sheeba.test`, passwordHash, 'Organizer One']
    );
    const organizerId = orgRes.rows[0].id;
    createdUserIds.push(organizerId);

    // Organizer 2 (Unrelated organizer)
    const org2Res = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, organization, approval_status, is_active)
       VALUES ($1, $2, $3, 'organizer', 'Other Community', 'approved', TRUE)
       RETURNING id`,
      [`org2_${uniqueSuffix}@sheeba.test`, passwordHash, 'Organizer Two']
    );
    const otherOrganizerId = org2Res.rows[0].id;
    createdUserIds.push(otherOrganizerId);

    // Sponsor 1 (Approved)
    const sponsorRes = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, company_name, organization, approval_status, is_active, company_phone)
       VALUES ($1, $2, $3, 'sponsor', 'Telebirr Commercial', 'Telebirr Commercial', 'approved', TRUE, '+251911223344')
       RETURNING id`,
      [`sponsor_${uniqueSuffix}@telebirr.test`, passwordHash, 'Dawit Rep']
    );
    const sponsorId = sponsorRes.rows[0].id;
    createdUserIds.push(sponsorId);

    // Sponsor 2 (Pending approval - should be blocked from applying)
    const pendingSponsorRes = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, company_name, organization, approval_status, is_active)
       VALUES ($1, $2, $3, 'sponsor', 'Pending Corp', 'Pending Corp', 'pending', FALSE)
       RETURNING id`,
      [`pending_sponsor_${uniqueSuffix}@pending.test`, passwordHash, 'Pending Rep']
    );
    const pendingSponsorId = pendingSponsorRes.rows[0].id;
    createdUserIds.push(pendingSponsorId);

    // Admin User
    const adminRes = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status, is_active)
       VALUES ($1, $2, $3, 'admin', 'approved', TRUE)
       RETURNING id`,
      [`admin_${uniqueSuffix}@sheeba.test`, passwordHash, 'Admin Lead']
    );
    const adminId = adminRes.rows[0].id;
    createdUserIds.push(adminId);

    // Pitch created by Organizer 1
    const pitch = await SponsorshipService.createApplication(organizerId, {
      event_title: `Ethiopia Tech Summit ${uniqueSuffix}`,
      expected_date: 'December 2026',
      location: 'Millennium Hall, Addis Ababa',
      expected_attendees: 500,
      target_audience: 'Software Engineers and Founders',
      funding_goal: 300000,
      currency: 'ETB',
      description: 'The largest annual gathering of developers and founders in East Africa.',
      packages: [
        { name: 'Headline Partner', amount: 150000, perks: 'Keynote, Prime Booth, Logo on Lanyard' },
        { name: 'Gold Partner', amount: 75000, perks: 'Booth, Logo on site, 5 passes' },
        { name: 'Silver Partner', amount: 35000, perks: 'Logo on site, 2 passes' },
      ],
      contact_name: 'Organizer One',
      contact_phone: '+251911000000',
      contact_email: `org_${uniqueSuffix}@sheeba.test`,
    });
    createdPitchIds.push(pitch.id);

    console.log('✅ Test fixture created: Organizers, Sponsors, Admin, and Pitch.\n');

    // TEST 1: Unapproved sponsor cannot submit application
    try {
      console.log('TEST 1: Gate check — Unapproved sponsor blocked from submitting formal application...');
      await SponsorshipService.submitFormalApplication(pendingSponsorId, {
        applicationId: pitch.id,
        package_name: 'Headline Partner',
        pledged_amount: 150000,
        proposal_message: 'We are eager to sponsor this amazing tech summit in Addis Ababa.',
      });
      console.error('❌ TEST 1 FAILED: Unapproved sponsor was allowed to apply.');
      failed++;
    } catch (err: any) {
      if (err.statusCode === 403) {
        console.log('✅ TEST 1 PASSED: Unapproved sponsor rejected with HTTP 403.');
        passed++;
      } else {
        console.error('❌ TEST 1 FAILED: Unexpected error:', err);
        failed++;
      }
    }

    // TEST 2: Valid formal application submission
    let deal1Id = '';
    try {
      console.log('\nTEST 2: Valid formal application submission by approved corporate sponsor...');
      const deal = await SponsorshipService.submitFormalApplication(sponsorId, {
        applicationId: pitch.id,
        package_name: 'Headline Partner',
        pledged_amount: 150000,
        proposal_message: 'Telebirr wants to empower local Ethiopian developers by providing direct workshop grants.',
        sponsor_notes: 'Private internal notes: contact organizer before kickoff.',
      });
      deal1Id = deal.id;
      createdDealIds.push(deal.id);

      if (deal.status === 'PENDING' && deal.proposal_message?.includes('Telebirr') && deal.package_name === 'Headline Partner') {
        console.log('✅ TEST 2 PASSED: Formal application created with status PENDING, proposal message, and correct package.');
        passed++;
      } else {
        console.error('❌ TEST 2 FAILED: Deal fields do not match expected values:', deal);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 2 FAILED with error:', err);
      failed++;
    }

    // TEST 3: Duplicate active application rejection
    try {
      console.log('\nTEST 3: Duplicate active application prevention (same pitch while PENDING)...');
      await SponsorshipService.submitFormalApplication(sponsorId, {
        applicationId: pitch.id,
        package_name: 'Gold Partner',
        pledged_amount: 75000,
        proposal_message: 'Attempting second concurrent application while first is pending.',
      });
      console.error('❌ TEST 3 FAILED: Duplicate application was accepted.');
      failed++;
    } catch (err: any) {
      if (err.statusCode === 409) {
        console.log('✅ TEST 3 PASSED: Duplicate application blocked with HTTP 409 Conflict.');
        passed++;
      } else {
        console.error('❌ TEST 3 FAILED: Unexpected error:', err);
        failed++;
      }
    }

    // TEST 4: Organizer visibility isolation — Organizer cannot see pending applications
    try {
      console.log('\nTEST 4: Organizer isolation — Pending applications are hidden from organizer...');
      const orgView = await SponsorshipService.getApprovedSponsorsForPitch(pitch.id, organizerId);
      if (orgView.approvedSponsors.length === 0) {
        console.log('✅ TEST 4 PASSED: Organizer sees 0 approved sponsors while application is in PENDING review.');
        passed++;
      } else {
        console.error('❌ TEST 4 FAILED: Organizer saw unapproved/pending applications:', orgView);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 4 FAILED with error:', err);
      failed++;
    }

    // TEST 5: Unauthorized organizer cannot access pitch sponsors
    try {
      console.log('\nTEST 5: Authorization gate — Other organizer cannot access pitch sponsors...');
      await SponsorshipService.getApprovedSponsorsForPitch(pitch.id, otherOrganizerId);
      console.error('❌ TEST 5 FAILED: Unrelated organizer was granted access.');
      failed++;
    } catch (err: any) {
      if (err.statusCode === 403) {
        console.log('✅ TEST 5 PASSED: Unrelated organizer blocked with HTTP 403 Forbidden.');
        passed++;
      } else {
        console.error('❌ TEST 5 FAILED: Unexpected error:', err);
        failed++;
      }
    }

    // TEST 6: Admin review — Rejection requires mandatory reason
    try {
      console.log('\nTEST 6: Admin rejection validation — Rejection without reason is rejected...');
      await AdminService.rejectSponsorshipApplication(deal1Id, adminId, '   ');
      console.error('❌ TEST 6 FAILED: Admin rejection accepted empty reason.');
      failed++;
    } catch (err: any) {
      if (err.statusCode === 400) {
        console.log('✅ TEST 6 PASSED: Rejection without valid reason rejected with HTTP 400.');
        passed++;
      } else {
        console.error('❌ TEST 6 FAILED: Unexpected error:', err);
        failed++;
      }
    }

    // TEST 7: Admin rejects application with reason
    try {
      console.log('\nTEST 7: Admin rejects application with reason, recording reviewer and timestamp...');
      const rejectionReason = 'Requested tier is oversubscribed. Please apply for the Gold or Silver partnership packages.';
      const rejectedDeal = await AdminService.rejectSponsorshipApplication(deal1Id, adminId, rejectionReason);

      if (
        rejectedDeal.status === 'REJECTED' &&
        rejectedDeal.rejection_reason === rejectionReason &&
        rejectedDeal.reviewed_by === adminId &&
        rejectedDeal.reviewed_at !== null
      ) {
        console.log('✅ TEST 7 PASSED: Status updated to REJECTED with rejection_reason, reviewed_by, and reviewed_at.');
        passed++;
      } else {
        console.error('❌ TEST 7 FAILED: Rejection fields not persisted correctly:', rejectedDeal);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 7 FAILED with error:', err);
      failed++;
    }

    // TEST 8: Repeated review attempt on already decided application
    try {
      console.log('\nTEST 8: Repeated review attempt prevention (cannot re-review decided deal)...');
      await AdminService.approveSponsorshipApplication(deal1Id, adminId, 'Trying to approve already rejected deal');
      console.error('❌ TEST 8 FAILED: Admin was able to approve already rejected application.');
      failed++;
    } catch (err: any) {
      if (err.statusCode === 409) {
        console.log('✅ TEST 8 PASSED: Repeated review attempt rejected with HTTP 409 Conflict.');
        passed++;
      } else {
        console.error('❌ TEST 8 FAILED: Unexpected error:', err);
        failed++;
      }
    }

    // TEST 9: Resubmission after rejection — Sponsor can apply again to the same pitch
    let deal2Id = '';
    try {
      console.log('\nTEST 9: Resubmission after rejection — Sponsor submits revised application to same pitch...');
      const deal2 = await SponsorshipService.submitFormalApplication(sponsorId, {
        applicationId: pitch.id,
        package_name: 'Gold Partner',
        pledged_amount: 75000,
        proposal_message: 'Revised proposal: Applying for the Gold Partner tier as advised by administration.',
      });
      deal2Id = deal2.id;
      createdDealIds.push(deal2.id);

      if (deal2.id !== deal1Id && deal2.status === 'PENDING' && deal2.package_name === 'Gold Partner') {
        // Verify historical record deal1Id was NOT overwritten
        const checkDeal1 = await query('SELECT id, status, rejection_reason FROM sponsorship_deals WHERE id = $1', [deal1Id]);
        if (checkDeal1.rows[0].status === 'REJECTED' && checkDeal1.rows[0].rejection_reason) {
          console.log('✅ TEST 9 PASSED: New application created while preserving historical rejected application and review notes.');
          passed++;
        } else {
          console.error('❌ TEST 9 FAILED: Previous rejected application was corrupted.');
          failed++;
        }
      } else {
        console.error('❌ TEST 9 FAILED: Second application not created cleanly:', deal2);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 9 FAILED with error:', err);
      failed++;
    }

    // TEST 10: Admin approves revised application
    try {
      console.log('\nTEST 10: Admin approves revised application in transaction...');
      const approvedDeal = await AdminService.approveSponsorshipApplication(deal2Id, adminId, 'Approved for Gold tier');

      if (
        approvedDeal.status === 'APPROVED' &&
        approvedDeal.reviewed_by === adminId &&
        approvedDeal.reviewed_at !== null
      ) {
        console.log('✅ TEST 10 PASSED: Deal approved, reviewed_by and reviewed_at recorded.');
        passed++;
      } else {
        console.error('❌ TEST 10 FAILED: Approval fields missing:', approvedDeal);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 10 FAILED with error:', err);
      failed++;
    }

    // TEST 11: Organizer can now see approved sponsor details
    try {
      console.log('\nTEST 11: Organizer visibility — Owner can see approved sponsor details...');
      const orgView = await SponsorshipService.getApprovedSponsorsForPitch(pitch.id, organizerId);

      if (
        orgView.approvedSponsors.length === 1 &&
        orgView.approvedSponsors[0].packageName === 'Gold Partner' &&
        orgView.approvedSponsors[0].pledgedAmount === 75000 &&
        orgView.approvedSponsors[0].sponsor.companyName === 'Telebirr Commercial' &&
        orgView.approvedSponsors[0].sponsor.contactEmail === `sponsor_${uniqueSuffix}@telebirr.test`
      ) {
        console.log('✅ TEST 11 PASSED: Organizer receives complete corporate details for approved sponsor only.');
        passed++;
      } else {
        console.error('❌ TEST 11 FAILED: Unexpected approved sponsors payload:', orgView);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 11 FAILED with error:', err);
      failed++;
    }

    // TEST 12: Historical compatibility check — Existing INTERESTED & DECLINED deals intact
    try {
      console.log('\nTEST 12: Historical compatibility — Existing INTERESTED/DECLINED records unaffected...');
      const historyRes = await query<{ count: string }>(
        `SELECT COUNT(*) FROM sponsorship_deals WHERE status IN ('INTERESTED', 'DECLINED')`
      );
      const count = parseInt(historyRes.rows[0].count, 10);
      if (count >= 8) {
        console.log(`✅ TEST 12 PASSED: All ${count} historical INTERESTED and DECLINED records preserved.`);
        passed++;
      } else {
        console.error('❌ TEST 12 FAILED: Historical records missing or altered. Found:', count);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 12 FAILED with error:', err);
      failed++;
    }

    // TEST 13: Admin applications list & detail endpoints
    try {
      console.log('\nTEST 13: Admin list & detail endpoints with pagination and attempt history...');
      const adminList = await AdminService.getSponsorshipApplications({ status: 'APPROVED' });
      const foundApproved = adminList.applications.some((a) => a.id === deal2Id);

      const detail = await AdminService.getSponsorshipApplicationDetail(deal2Id);

      if (foundApproved && detail.previousAttempts.length === 1 && detail.previousAttempts[0].id === deal1Id) {
        console.log('✅ TEST 13 PASSED: Admin list filters correctly and detail view shows previous rejected attempt history.');
        passed++;
      } else {
        console.error('❌ TEST 13 FAILED: Detail view missing prior attempt:', detail);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 13 FAILED with error:', err);
      failed++;
    }


    // =========================================================================
    // FIX 1 VERIFICATION: Sponsor status manipulation prevention (SEC-SPONSOR-01)
    // =========================================================================

    // Create a secondary pitch and deal for status update testing
    const pitch2 = await SponsorshipService.createApplication(otherOrganizerId, {
      event_title: `Addis AI Hackathon ${uniqueSuffix}`,
      expected_date: 'January 2027',
      location: 'Addis Ababa',
      expected_attendees: 300,
      target_audience: 'AI Researchers',
      funding_goal: 100000,
      currency: 'ETB',
      description: 'AI hackathon for university talent.',
      packages: [{ name: 'Silver Partner', amount: 35000, perks: 'Booth' }],
      contact_name: 'Organizer Two',
      contact_phone: '+251922000000',
      contact_email: `org2_${uniqueSuffix}@sheeba.test`,
    });
    createdPitchIds.push(pitch2.id);

    const testDealRes = await query<{ id: string }>(
      `INSERT INTO sponsorship_deals (application_id, sponsor_id, status, package_name, pledged_amount)
       VALUES ($1, $2, 'INTERESTED', 'Silver Partner', 35000)
       RETURNING id`,
      [pitch2.id, sponsorId]
    );
    const updateTestDealId = testDealRes.rows[0].id;
    createdDealIds.push(updateTestDealId);

    // TEST 14: Sponsor attempts to set APPROVED -> HTTP 400
    try {
      console.log('\nTEST 14: Sponsor attempts to set APPROVED -> HTTP 400...');
      const schemaCheck = updateDealSchema.safeParse({ status: 'APPROVED' });
      let serviceRejected = false;
      try {
        await SponsorshipService.updateDealStatus(updateTestDealId, sponsorId, 'APPROVED' as any);
      } catch (err: any) {
        if (err.statusCode === 400) {
          serviceRejected = true;
        }
      }

      if (!schemaCheck.success && serviceRejected) {
        console.log('✅ TEST 14 PASSED: Setting APPROVED rejected by both Zod schema and service layer with HTTP 400.');
        passed++;
      } else {
        console.error('❌ TEST 14 FAILED: APPROVED was not rejected properly. Schema valid:', schemaCheck.success, 'Service rejected:', serviceRejected);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 14 FAILED with error:', err);
      failed++;
    }

    // TEST 15: Sponsor attempts to set PENDING -> HTTP 400
    try {
      console.log('\nTEST 15: Sponsor attempts to set PENDING -> HTTP 400...');
      const schemaCheck = updateDealSchema.safeParse({ status: 'PENDING' });
      let serviceRejected = false;
      try {
        await SponsorshipService.updateDealStatus(updateTestDealId, sponsorId, 'PENDING' as any);
      } catch (err: any) {
        if (err.statusCode === 400) {
          serviceRejected = true;
        }
      }

      if (!schemaCheck.success && serviceRejected) {
        console.log('✅ TEST 15 PASSED: Setting PENDING rejected by both Zod schema and service layer with HTTP 400.');
        passed++;
      } else {
        console.error('❌ TEST 15 FAILED: PENDING was not rejected properly. Schema valid:', schemaCheck.success, 'Service rejected:', serviceRejected);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 15 FAILED with error:', err);
      failed++;
    }

    // TEST 16: Sponsor attempts to set REJECTED -> HTTP 400
    try {
      console.log('\nTEST 16: Sponsor attempts to set REJECTED -> HTTP 400...');
      const schemaCheck = updateDealSchema.safeParse({ status: 'REJECTED' });
      let serviceRejected = false;
      try {
        await SponsorshipService.updateDealStatus(updateTestDealId, sponsorId, 'REJECTED' as any);
      } catch (err: any) {
        if (err.statusCode === 400) {
          serviceRejected = true;
        }
      }

      if (!schemaCheck.success && serviceRejected) {
        console.log('✅ TEST 16 PASSED: Setting REJECTED rejected by both Zod schema and service layer with HTTP 400.');
        passed++;
      } else {
        console.error('❌ TEST 16 FAILED: REJECTED was not rejected properly. Schema valid:', schemaCheck.success, 'Service rejected:', serviceRejected);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 16 FAILED with error:', err);
      failed++;
    }

    // TEST 17: Sponsor updates legitimate DECLINED status -> works
    try {
      console.log('\nTEST 17: Sponsor updates legitimate DECLINED status -> works...');
      const schemaCheck = updateDealSchema.safeParse({ status: 'DECLINED', sponsor_notes: 'Passing for now' });
      const updatedDeal = await SponsorshipService.updateDealStatus(updateTestDealId, sponsorId, 'DECLINED', 'Passing for now');

      if (schemaCheck.success && updatedDeal.status === 'DECLINED' && updatedDeal.sponsor_notes === 'Passing for now') {
        console.log('✅ TEST 17 PASSED: Legitimate DECLINED status update succeeded.');
        passed++;
      } else {
        console.error('❌ TEST 17 FAILED: DECLINED update failed:', updatedDeal);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 17 FAILED with error:', err);
      failed++;
    }

    // TEST 18: Sponsor updates legitimate INTERESTED status -> works
    try {
      console.log('\nTEST 18: Sponsor updates legitimate INTERESTED status -> works...');
      const schemaCheck = updateDealSchema.safeParse({ status: 'INTERESTED', sponsor_notes: 'Reconsidering' });
      const updatedDeal = await SponsorshipService.updateDealStatus(updateTestDealId, sponsorId, 'INTERESTED', 'Reconsidering');

      if (schemaCheck.success && updatedDeal.status === 'INTERESTED' && updatedDeal.sponsor_notes === 'Reconsidering') {
        console.log('✅ TEST 18 PASSED: Legitimate INTERESTED status update succeeded.');
        passed++;
      } else {
        console.error('❌ TEST 18 FAILED: INTERESTED update failed:', updatedDeal);
        failed++;
      }
    } catch (err) {
      console.error('❌ TEST 18 FAILED with error:', err);
      failed++;
    }

  } finally {
    await cleanup();
  }

  console.log('\n=================================================================');
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} tests`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStage2Tests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
