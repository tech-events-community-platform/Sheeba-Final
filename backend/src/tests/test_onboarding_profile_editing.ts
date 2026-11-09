import pool, { query } from '../config/db';
import { UserService } from '../services/user.service';
import { SponsorMatchingService } from '../services/matching/sponsorMatching.service';
import { AuditService } from '../services/audit.service';

async function runOnboardingProfileEditingTest() {
  console.log('====================================================');
  console.log('🧪 TESTING ONBOARDING PROFILE EDITING & PRESERVATION');
  console.log('====================================================\n');

  try {
    await AuditService.initAuditTable();

    // 1. Setup a test organizer with approved status and some empty optional fields
    console.log('🔹 1. Setting up Test Organizer Account...');
    const testOrgEmail = `test_org_edit_${Date.now()}@sheeba.et`;
    const orgInsertRes = await query(
      `INSERT INTO users (
        email, password_hash, full_name, role, is_active, approval_status,
        is_organizer, organizer_approval_status, applicant_type, organization,
        organization_type, applicant_position, phone, organization_description
      ) VALUES (
        $1, 'hashed_pw', 'Abebe Bikila', 'organizer', true, 'approved',
        true, 'approved', 'Organization / Institution', 'Original Tech Club',
        'Community / Student Club', 'Lead Organizer', '+251911111111', 'Original community mission'
      ) RETURNING *`,
      [testOrgEmail]
    );
    const orgUser = orgInsertRes.rows[0];
    console.log(`  ✅ Created test organizer ID: ${orgUser.id} with approved status`);

    // 2. Test Organizer Profile Update: filling in empty optional fields (website, logo, socials)
    console.log('\n🔹 2. Testing Organizer Profile Update (Filling Empty Optional Fields & Updating Details)...');
    const updatedOrg = await UserService.updateUserProfile(orgUser.id, {
      organization: 'Tech Innovators Ethiopia',
      organization_type: 'Company / Business',
      applicant_position: 'Founder & CEO',
      phone: '+251922222222',
      organization_description: 'Expanded tech training and incubator company',
      organization_website: 'https://techinnovators.et',
      organization_logo: 'https://res.cloudinary.com/sheeba/image/upload/v12345/logo.png',
      organizer_socials: {
        telegram: '@techinnovators_et',
        x: '@techinnovators',
      },
    });

    // Safeguard 1: Check values persisted
    if (updatedOrg.organization !== 'Tech Innovators Ethiopia') {
      throw new Error(`Expected organization 'Tech Innovators Ethiopia', got '${updatedOrg.organization}'`);
    }
    if (updatedOrg.organizationType !== 'Company / Business') {
      throw new Error(`Expected organizationType 'Company / Business', got '${updatedOrg.organizationType}'`);
    }
    if (updatedOrg.applicantPosition !== 'Founder & CEO') {
      throw new Error(`Expected applicantPosition 'Founder & CEO', got '${updatedOrg.applicantPosition}'`);
    }
    if (updatedOrg.organizationWebsite !== 'https://techinnovators.et') {
      throw new Error(`Expected website 'https://techinnovators.et', got '${updatedOrg.organizationWebsite}'`);
    }
    if (updatedOrg.organizationLogo !== 'https://res.cloudinary.com/sheeba/image/upload/v12345/logo.png') {
      throw new Error(`Expected logo saved, got '${updatedOrg.organizationLogo}'`);
    }
    console.log('  ✅ PASS: All onboarding fields updated and empty optional fields filled');

    // Safeguard 2 & 8: Role and Approval status must remain untouched
    if (updatedOrg.role !== 'ORGANIZER' || updatedOrg.approvalStatus !== 'approved' || updatedOrg.organizerApprovalStatus !== 'approved') {
      throw new Error(`Safeguard violation! Role or approval status changed: role=${updatedOrg.role}, approval=${updatedOrg.approvalStatus}`);
    }
    console.log('  ✅ PASS: Safeguard 2 & 8: Account role and approved status preserved without reapproval');

    // 3. Test Partial Update: ensure unprovided fields are NOT overwritten with null/undefined
    console.log('\n🔹 3. Testing Preservation of Existing Fields on Partial Update...');
    const partialUpdatedOrg = await UserService.updateUserProfile(orgUser.id, {
      applicant_position: 'Executive Director',
    });
    if (partialUpdatedOrg.organization !== 'Tech Innovators Ethiopia') {
      throw new Error(`Safeguard 1 violation! Organization was overwritten: '${partialUpdatedOrg.organization}'`);
    }
    if (partialUpdatedOrg.organizationWebsite !== 'https://techinnovators.et') {
      throw new Error(`Safeguard 1 violation! Website was overwritten: '${partialUpdatedOrg.organizationWebsite}'`);
    }
    if (partialUpdatedOrg.applicantPosition !== 'Executive Director') {
      throw new Error(`Expected applicantPosition 'Executive Director', got '${partialUpdatedOrg.applicantPosition}'`);
    }
    console.log('  ✅ PASS: Safeguard 1: Unchanged optional fields retained intact');

    // 4. Test Switching to Individual Organizer profile
    console.log('\n🔹 4. Testing Individual Organizer Profile Mode...');
    const individualOrg = await UserService.updateUserProfile(orgUser.id, {
      applicant_type: 'Individual Organizer',
      full_name: 'Abebe Bikila Independent',
      bio: 'Independent open-source community organizer and speaker',
    });
    if (individualOrg.applicantType !== 'Individual Organizer') {
      throw new Error(`Expected applicantType 'Individual Organizer', got '${individualOrg.applicantType}'`);
    }
    console.log('  ✅ PASS: Safeguard 3: Both Individual Organizer and Organization/Institution modes work properly');

    // 5. Test Audit Log for Organizer Profile Update
    console.log('\n🔹 5. Verifying Audit Log for Organizer Profile Update...');
    const orgAuditRes = await query(
      `SELECT * FROM system_audit_logs WHERE entity_id = $1 AND action = 'ORGANIZER_PROFILE_UPDATED' ORDER BY created_at DESC LIMIT 1`,
      [orgUser.id]
    );
    if (!orgAuditRes.rowCount || orgAuditRes.rowCount === 0) {
      throw new Error('Expected ORGANIZER_PROFILE_UPDATED audit log entry');
    }
    console.log(`  ✅ PASS: Safeguard 10: Audit trail logged ORGANIZER_PROFILE_UPDATED for organizer ${orgUser.id}`);

    // 6. Setup a test sponsor with initial preferences
    console.log('\n🔹 6. Setting up Test Sponsor Account...');
    const testSponsorEmail = `test_spn_edit_${Date.now()}@sheeba.et`;
    const initialPrefs = {
      targetInterests: ['Technology & AI'],
      targetSkills: ['TypeScript', 'Python'],
      sponsorshipObjectives: ['brand_awareness'],
      preferredEventTypes: ['hackathon'],
      targetAudience: ['Software developers'],
      maxBudget: 250000,
    };
    const spnInsertRes = await query(
      `INSERT INTO users (
        email, password_hash, full_name, role, is_active, approval_status,
        company_name, industry_category, company_phone, company_website,
        bio, sponsor_preferences
      ) VALUES (
        $1, 'hashed_pw', 'Kebede Michael', 'sponsor', true, 'approved',
        'Original FinTech Corp', 'Finance & Banking', '+251933333333', 'https://originalfintech.et',
        'Original sponsor bio', $2
      ) RETURNING *`,
      [testSponsorEmail, JSON.stringify(initialPrefs)]
    );
    const spnUser = spnInsertRes.rows[0];
    console.log(`  ✅ Created test sponsor ID: ${spnUser.id} with approved status`);

    // 7. Test Sponsor Profile & Preferences Update
    console.log('\n🔹 7. Testing Sponsor Profile & Preferences Update...');
    const updatedSponsor = await SponsorMatchingService.updateSponsorPreferences(spnUser.id, {
      fullName: 'Kebede Michael Senior VP',
      companyName: 'NextGen FinTech Solutions',
      industryCategory: 'Technology',
      companyPhone: '+251944444444',
      companyWebsite: 'https://nextgenfintech.et',
      companyDescription: 'Pioneering payment gateways and developer grants',
      companyLogo: 'https://res.cloudinary.com/sheeba/image/upload/v67890/sponsor_logo.png',
      maxBudget: 750000,
      sponsorshipObjectives: ['brand_awareness', 'talent_recruitment'],
      targetAudience: ['Software developers', 'Entrepreneurs and startup founders'],
      preferredLocations: ['Addis Ababa', 'Hawassa'],
    });

    if (updatedSponsor.companyName !== 'NextGen FinTech Solutions') {
      throw new Error(`Expected companyName 'NextGen FinTech Solutions', got '${updatedSponsor.companyName}'`);
    }
    if (updatedSponsor.fullName !== 'Kebede Michael Senior VP') {
      throw new Error(`Expected fullName 'Kebede Michael Senior VP', got '${updatedSponsor.fullName}'`);
    }
    if (updatedSponsor.industryCategory !== 'Technology') {
      throw new Error(`Expected industryCategory 'Technology', got '${updatedSponsor.industryCategory}'`);
    }
    if (updatedSponsor.preferences.maxBudget !== 750000) {
      throw new Error(`Expected maxBudget 750000, got ${updatedSponsor.preferences.maxBudget}`);
    }
    // Safeguard 4: Existing skills should be preserved
    if (!updatedSponsor.preferences.targetSkills.includes('TypeScript')) {
      throw new Error(`Safeguard 4 violation! Existing skills were not preserved in preferences`);
    }
    console.log('  ✅ PASS: Safeguard 4: Sponsor preferences and company details updated and preserved without duplicate records');

    // Verify row count in users table for this sponsor (must remain exactly 1)
    const countRes = await query(`SELECT COUNT(*) as count FROM users WHERE email = $1`, [testSponsorEmail]);
    if (parseInt(countRes.rows[0].count, 10) !== 1) {
      throw new Error(`Duplicate sponsor record created! Count: ${countRes.rows[0].count}`);
    }
    console.log('  ✅ PASS: Verified exactly 1 user record exists (no duplicates created)');

    // 8. Test Audit Log for Sponsor Profile Update
    console.log('\n🔹 8. Verifying Audit Log for Sponsor Profile Update...');
    const spnAuditRes = await query(
      `SELECT * FROM system_audit_logs WHERE entity_id = $1 AND action = 'SPONSOR_PROFILE_UPDATED' ORDER BY created_at DESC LIMIT 1`,
      [spnUser.id]
    );
    if (!spnAuditRes.rowCount || spnAuditRes.rowCount === 0) {
      throw new Error('Expected SPONSOR_PROFILE_UPDATED audit log entry');
    }
    console.log(`  ✅ PASS: Safeguard 10: Audit trail logged SPONSOR_PROFILE_UPDATED for sponsor ${spnUser.id}`);

    // Clean up test records
    await query(`DELETE FROM system_audit_logs WHERE entity_id IN ($1, $2)`, [orgUser.id, spnUser.id]);
    await query(`DELETE FROM users WHERE id IN ($1, $2)`, [orgUser.id, spnUser.id]);

    console.log('\n====================================================');
    console.log('🎉 ALL ONBOARDING PROFILE EDITING TESTS PASSED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runOnboardingProfileEditingTest();

