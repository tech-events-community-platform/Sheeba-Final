import assert from 'assert';
import { AdminService } from '../services/admin.service';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';

async function runAdminSponsorVisibilityTests() {
  console.log('====================================================');
  console.log('🛡️  SHEEBA: ADMIN SPONSOR VISIBILITY AUDIT & FIX TESTS');
  console.log('====================================================');

  const testSuffix = Date.now().toString(36);
  const sponsorEmail = `visibility_sponsor_${testSuffix}@example.com`;
  const plainPassword = 'SecurePassword123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  let sponsorId: string;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create a sponsor with full Stage 1 registration payload
    // -------------------------------------------------------------------------
    console.log('\n🔹 1. Creating sponsor with comprehensive registration fields...');
    const fullPreferences = {
      sponsorshipObjectives: ['Brand Awareness', 'Developer Recruitment', 'Product Launch'],
      targetAudience: ['Senior Engineers', 'Engineering Leaders', 'Students'],
      preferredEventCategories: ['Technology', 'AI / ML', 'Open Source'],
      preferredEventTypes: ['Conference', 'Hackathon'],
      targetSkills: ['TypeScript', 'Python', 'Kubernetes'],
      targetInterests: ['Cloud Native', 'Generative AI'],
      preferredLocations: ['Addis Ababa', 'Virtual'],
      maxBudget: 250000,
      preferredBenefits: ['Keynote Slot', 'Dedicated Booth', 'Logo on Lanyards'],
      additionalPreferences: 'Requires wheelchair accessible booth space and power outlet.',
    };

    const spRes = await query(
      `INSERT INTO users (
        full_name, email, password_hash, role, approval_status,
        company_name, industry_category, company_phone, company_website,
        bio, avatar_url, sponsor_preferences, is_active
      ) VALUES ($1, $2, $3, 'sponsor', 'pending', $4, $5, $6, $7, $8, $9, $10, FALSE)
      RETURNING id`,
      [
        'Abebe Kebede',
        sponsorEmail,
        hashedPassword,
        'Addis Tech Innovations',
        'FinTech & Cloud',
        '+251 91 123 4567',
        'https://addistech.et',
        'Addis Tech Innovations is Ethiopia leading fintech infrastructure builder.',
        'https://addistech.et/assets/brand-logo.png',
        JSON.stringify(fullPreferences),
      ]
    );

    sponsorId = spRes.rows[0].id;
    assert(sponsorId, 'Sponsor ID should be returned from fixture insertion');
    console.log(`  ✅ Fixture created: Sponsor ID = ${sponsorId}`);

    // -------------------------------------------------------------------------
    // TEST 1: Admin getUsersList() includes all sponsor registration fields
    // -------------------------------------------------------------------------
    console.log('\n🔹 2. Verifying AdminService.getUsersList() exposes full registration data...');
    const usersData = await AdminService.getUsersList();
    const foundSponsor = usersData.sponsors.find((s: any) => s.id === sponsorId);

    assert(foundSponsor, 'Sponsor must be present in AdminService.getUsersList()');
    assert.strictEqual(foundSponsor.name, 'Abebe Kebede');
    assert.strictEqual(foundSponsor.email, sponsorEmail);
    assert.strictEqual(foundSponsor.companyName, 'Addis Tech Innovations');
    assert.strictEqual(foundSponsor.industryCategory, 'FinTech & Cloud');
    assert.strictEqual(foundSponsor.companyPhone, '+251 91 123 4567');
    assert.strictEqual(foundSponsor.companyWebsite, 'https://addistech.et');
    assert.strictEqual(foundSponsor.bio, 'Addis Tech Innovations is Ethiopia leading fintech infrastructure builder.');
    assert.strictEqual(foundSponsor.avatarUrl, 'https://addistech.et/assets/brand-logo.png');
    assert.strictEqual(foundSponsor.approvalStatus, 'pending');
    assert.strictEqual(foundSponsor.status, 'Pending Approval');
    assert.strictEqual(foundSponsor.isActive, false);

    // Verify preferences in getUsersList()
    assert(foundSponsor.sponsorPreferences, 'sponsorPreferences must be present in getUsersList');
    assert.deepStrictEqual(foundSponsor.sponsorPreferences.sponsorshipObjectives, fullPreferences.sponsorshipObjectives);
    assert.deepStrictEqual(foundSponsor.sponsorPreferences.targetAudience, fullPreferences.targetAudience);
    assert.deepStrictEqual(foundSponsor.sponsorPreferences.preferredEventCategories, fullPreferences.preferredEventCategories);
    assert.strictEqual(foundSponsor.sponsorPreferences.maxBudget, 250000);
    assert.deepStrictEqual(foundSponsor.sponsorPreferences.targetSkills, fullPreferences.targetSkills);
    assert.strictEqual(foundSponsor.sponsorPreferences.additionalPreferences, fullPreferences.additionalPreferences);

    // Security check: ensure no password_hash or sensitive auth fields are in sponsor record
    assert.strictEqual((foundSponsor as any).password_hash, undefined, 'password_hash must NOT be present in getUsersList()');
    assert.strictEqual((foundSponsor as any).password, undefined, 'password must NOT be present in getUsersList()');
    console.log('  ✅ PASS: AdminService.getUsersList() exposes complete sponsor fields without security leakage');

    // -------------------------------------------------------------------------
    // TEST 2: Dedicated AdminService.getSponsorDetails(sponsorId)
    // -------------------------------------------------------------------------
    console.log('\n🔹 3. Verifying dedicated AdminService.getSponsorDetails(id)...');
    const details = await AdminService.getSponsorDetails(sponsorId);

    assert(details, 'getSponsorDetails must return the sponsor record');
    assert.strictEqual(details.id, sponsorId);
    assert.strictEqual(details.name, 'Abebe Kebede');
    assert.strictEqual(details.email, sponsorEmail);
    assert.strictEqual(details.companyName, 'Addis Tech Innovations');
    assert.strictEqual(details.industryCategory, 'FinTech & Cloud');
    assert.strictEqual(details.companyPhone, '+251 91 123 4567');
    assert.strictEqual(details.website, 'https://addistech.et');
    assert.strictEqual(details.bio, 'Addis Tech Innovations is Ethiopia leading fintech infrastructure builder.');
    assert.strictEqual(details.avatarUrl, 'https://addistech.et/assets/brand-logo.png');
    assert.strictEqual(details.approvalStatus, 'pending');
    assert.strictEqual(details.isActive, false);

    // Verify all 4 sections of preferences
    assert.deepStrictEqual(details.sponsorPreferences.sponsorshipObjectives, fullPreferences.sponsorshipObjectives);
    assert.deepStrictEqual(details.sponsorPreferences.targetAudience, fullPreferences.targetAudience);
    assert.deepStrictEqual(details.sponsorPreferences.preferredEventCategories, fullPreferences.preferredEventCategories);
    assert.deepStrictEqual(details.sponsorPreferences.preferredLocations, fullPreferences.preferredLocations);
    assert.deepStrictEqual(details.sponsorPreferences.preferredBenefits, fullPreferences.preferredBenefits);
    assert.strictEqual(details.sponsorPreferences.maxBudget, 250000);
    assert.strictEqual(details.sponsorPreferences.additionalPreferences, fullPreferences.additionalPreferences);

    // Security check: ensure no password_hash or sensitive auth fields
    assert.strictEqual((details as any).password_hash, undefined, 'password_hash must NOT be present in getSponsorDetails()');
    assert.strictEqual((details as any).password, undefined, 'password must NOT be present in getSponsorDetails()');
    console.log('  ✅ PASS: getSponsorDetails(id) returns all 4 sections with complete fields and zero sensitive leaks');

    // -------------------------------------------------------------------------
    // TEST 3: Not-found handling in getSponsorDetails
    // -------------------------------------------------------------------------
    console.log('\n🔹 4. Verifying 404 error when sponsor does not exist...');
    try {
      await AdminService.getSponsorDetails('00000000-0000-0000-0000-000000000000');
      assert.fail('Should have thrown an error for non-existent sponsor');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 404);
      console.log('  ✅ PASS: Properly throws 404 for unknown sponsor ID');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Existing Approve/Reject workflow operates seamlessly
    // -------------------------------------------------------------------------
    console.log('\n🔹 5. Verifying Admin approval and rejection workflow...');
    // Approve sponsor
    const approvedUser = await AdminService.approveSponsor(sponsorId);
    assert.strictEqual(approvedUser.approval_status, 'approved');
    assert.strictEqual(approvedUser.is_active, true);

    const approvedDetails = await AdminService.getSponsorDetails(sponsorId);
    assert.strictEqual(approvedDetails.approvalStatus, 'approved');
    assert.strictEqual(approvedDetails.isActive, true);
    assert.strictEqual(approvedDetails.status, 'Active');
    console.log('  ✅ PASS: Sponsor account successfully approved and activated');

    // Reject sponsor
    const rejectedUser = await AdminService.rejectSponsor(sponsorId);
    assert.strictEqual(rejectedUser.approval_status, 'rejected');
    assert.strictEqual(rejectedUser.is_active, false);

    const rejectedDetails = await AdminService.getSponsorDetails(sponsorId);
    assert.strictEqual(rejectedDetails.approvalStatus, 'rejected');
    assert.strictEqual(rejectedDetails.isActive, false);
    assert.strictEqual(rejectedDetails.status, 'Rejected');
    console.log('  ✅ PASS: Sponsor account successfully rejected and deactivated');

    console.log('\n====================================================');
    console.log('🎉 ALL 5 ADMIN SPONSOR VISIBILITY TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    // Cleanup test fixtures
    await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [sponsorEmail]);
  }
}

runAdminSponsorVisibilityTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });

