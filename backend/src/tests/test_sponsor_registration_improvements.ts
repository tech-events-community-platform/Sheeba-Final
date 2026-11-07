import assert from 'assert';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { SponsorMatchingService } from '../services/matching/sponsorMatching.service';
import { sponsorRegisterSchema } from '../schemas/auth.schema';
import { query } from '../config/db';

async function runStage1SponsorRegistrationTests() {
  console.log('====================================================');
  console.log('🛡️  SHEEBA STAGE 1: SPONSOR REGISTRATION TEST SUITE');
  console.log('====================================================');

  const testSuffix = Date.now().toString(36);
  const validEmail = `sponsor_st1_${testSuffix}@sheeba-corp.et`;
  const validPassword = 'SecureSponsor2026!';
  const dupEmail = `sponsor_dup_${testSuffix}@sheeba-corp.et`;

  // 0. Clean prior state
  await query('DELETE FROM users WHERE LOWER(email) IN (LOWER($1), LOWER($2))', [validEmail, dupEmail]);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Zod Schema Validation - Success with all required & optional fields
    // -------------------------------------------------------------------------
    console.log('\n🔹 1. Testing Zod Schema Validation with Complete Payload...');
    const validPayload = {
      fullName: 'Dr. Michael Chen',
      email: validEmail,
      password: validPassword,
      companyName: 'Horizon Robotics Ethiopia',
      industryCategory: 'AI, Data & Machine Learning',
      companyPhone: '+251 91 234 5678',
      companyWebsite: 'https://horizon-robotics.et',
      companyDescription: 'Autonomous robotics, embedded edge AI, and computer vision lab in Addis Ababa.',
      companyLogo: 'https://horizon-robotics.et/logo.png',
      sponsorshipObjectives: ['Brand awareness', 'Talent recruitment', 'Startup discovery'],
      targetAudience: ['University students', 'Software developers', 'Researchers'],
      preferredEventCategories: ['Hackathons', 'Tech conferences', 'Innovation events'],
      skillsAndInterests: ['AI', 'Python', 'Computer Vision', 'Edge Computing'],
      preferredLocations: ['Addis Ababa', 'Hawassa'],
      budgetRange: 350000,
      preferredBenefits: ['Keynote speaking slot', 'Prime exhibition booth'],
    };

    const schemaParsed = sponsorRegisterSchema.safeParse(validPayload);
    assert(schemaParsed.success, `Schema validation failed: ${JSON.stringify(schemaParsed.error?.format())}`);
    console.log('  ✅ PASS: Schema correctly validates and transforms complete sponsor registration payload');

    // -------------------------------------------------------------------------
    // TEST 2: Zod Schema Validation - Missing Required Fields
    // -------------------------------------------------------------------------
    console.log('\n🔹 2. Testing Schema Rejection of Missing Required Fields...');

    // Missing company description
    const missingDesc = sponsorRegisterSchema.safeParse({ ...validPayload, companyDescription: '' });
    assert(!missingDesc.success, 'Schema should reject empty company description');

    // Missing sponsorship objectives
    const missingObjectives = sponsorRegisterSchema.safeParse({ ...validPayload, sponsorshipObjectives: [] });
    assert(!missingObjectives.success, 'Schema should reject empty sponsorship objectives');

    // Missing target audience
    const missingAudience = sponsorRegisterSchema.safeParse({ ...validPayload, targetAudience: [] });
    assert(!missingAudience.success, 'Schema should reject empty target audience');

    // Missing preferred event categories
    const missingCategories = sponsorRegisterSchema.safeParse({ ...validPayload, preferredEventCategories: [] });
    assert(!missingCategories.success, 'Schema should reject empty preferred event categories');

    // Missing skills and interests
    const missingSkills = sponsorRegisterSchema.safeParse({ ...validPayload, skillsAndInterests: [] });
    assert(!missingSkills.success, 'Schema should reject empty skills and interests');

    // Excessively long skill tag (> 50 chars)
    const longTag = sponsorRegisterSchema.safeParse({
      ...validPayload,
      skillsAndInterests: ['A'.repeat(51)],
    });
    assert(!longTag.success, 'Schema should reject custom skill tag longer than 50 characters');
    console.log('  ✅ PASS: Schema strictly enforces all required fields and tag length constraints');

    // -------------------------------------------------------------------------
    // TEST 3: Database Persistence via AuthService.registerSponsor()
    // -------------------------------------------------------------------------
    console.log('\n🔹 3. Testing Database Persistence & Account Creation...');
    const regResult = await AuthService.registerSponsor({
      full_name: schemaParsed.data.full_name,
      email: schemaParsed.data.email,
      password: schemaParsed.data.password,
      company_name: schemaParsed.data.company_name,
      industry_category: schemaParsed.data.industry_category,
      company_phone: schemaParsed.data.company_phone,
      company_website: schemaParsed.data.company_website,
      company_description: schemaParsed.data.company_description,
      company_logo: schemaParsed.data.company_logo,
      sponsorship_objectives: schemaParsed.data.sponsorship_objectives,
      target_audience: schemaParsed.data.target_audience,
      preferred_event_categories: schemaParsed.data.preferred_event_categories,
      skills_and_interests: schemaParsed.data.skills_and_interests,
      preferred_locations: schemaParsed.data.preferred_locations,
      budget_range: schemaParsed.data.budget_range,
      preferred_benefits: schemaParsed.data.preferred_benefits,
    });

    const sponsorUser = regResult.user;
    assert(sponsorUser.role === 'SPONSOR', 'User role must be SPONSOR');
    assert(sponsorUser.approvalStatus === 'pending', 'User approvalStatus must be pending');
    assert(sponsorUser.bio === validPayload.companyDescription, 'Company description must be persisted in bio');
    assert(sponsorUser.avatarUrl === validPayload.companyLogo, 'Company logo must be persisted in avatarUrl');
    console.log('  ✅ PASS: Registration returned pending sponsor user with formatted bio & avatarUrl');

    // Direct Database Query verification
    const dbRow = await query(
      'SELECT id, role, bio, avatar_url, sponsor_preferences FROM users WHERE id = $1',
      [sponsorUser.id]
    );
    assert(dbRow.rowCount === 1, 'User record must exist in PostgreSQL');
    const dbUser = dbRow.rows[0];

    assert.strictEqual(dbUser.bio, validPayload.companyDescription, 'DB bio column matches company description');
    assert.strictEqual(dbUser.avatar_url, validPayload.companyLogo, 'DB avatar_url matches company logo');

    const prefs = typeof dbUser.sponsor_preferences === 'string'
      ? JSON.parse(dbUser.sponsor_preferences)
      : dbUser.sponsor_preferences;

    assert(Array.isArray(prefs.sponsorshipObjectives), 'Preferences has sponsorshipObjectives array');
    assert.deepStrictEqual(prefs.sponsorshipObjectives, validPayload.sponsorshipObjectives);
    assert.deepStrictEqual(prefs.targetAudience, validPayload.targetAudience);
    assert.deepStrictEqual(prefs.targetSkills, validPayload.skillsAndInterests);
    assert.deepStrictEqual(prefs.preferredLocations, validPayload.preferredLocations);
    assert.strictEqual(prefs.maxBudget, validPayload.budgetRange);
    console.log('  ✅ PASS: Direct DB query verified users.bio and users.sponsor_preferences JSONB integrity');

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate Email Rejection
    // -------------------------------------------------------------------------
    console.log('\n🔹 4. Testing Duplicate Email Protection...');
    let dupError: any = null;
    try {
      await AuthService.registerSponsor({
        ...schemaParsed.data,
      });
    } catch (err: any) {
      dupError = err;
    }
    assert(dupError, 'Registration with duplicate email must throw an error');
    assert.strictEqual(dupError.statusCode, 409, 'Duplicate error status code must be 409');
    console.log('  ✅ PASS: Duplicate corporate email registration rejected with HTTP 409');

    // -------------------------------------------------------------------------
    // TEST 5: Gate Check - Unapproved Sponsor Cannot Access Portal
    // -------------------------------------------------------------------------
    console.log('\n🔹 5. Testing Portal Gate Before Admin Approval...');
    let loginBlocked = false;
    try {
      await AuthService.loginUser({
        email: validEmail,
        password: validPassword,
        role: 'sponsor',
      });
    } catch (err: any) {
      if (err.isPendingApproval || (err.message && err.message.includes('reviewed shortly'))) {
        loginBlocked = true;
      }
    }
    assert(loginBlocked, 'Unapproved sponsor must be blocked from logging in');
    console.log('  ✅ PASS: Unapproved sponsor login blocked with admin review pending gate');

    // -------------------------------------------------------------------------
    // TEST 6: Admin Approval & Subsequent Login
    // -------------------------------------------------------------------------
    console.log('\n🔹 6. Testing Admin Approval & Subsequent Session Token Issuance...');
    const approvedSponsor = await AdminService.approveSponsor(sponsorUser.id);
    assert.strictEqual(approvedSponsor.approval_status, 'approved', 'Sponsor approval_status updated to approved');

    const loginRes = await AuthService.loginUser({
      email: validEmail,
      password: validPassword,
      role: 'sponsor',
    });
    assert(loginRes.token, 'Approved sponsor receives JWT auth token');
    assert.strictEqual(loginRes.user.role, 'SPONSOR', 'Approved sponsor user object has SPONSOR role');
    console.log('  ✅ PASS: Admin successfully approved sponsor account; session token issued');

    // -------------------------------------------------------------------------
    // TEST 7: AI Matching Service Compatibility Check
    // -------------------------------------------------------------------------
    console.log('\n🔹 7. Testing Compatibility with AI Matching Service...');
    const matchingPrefs = await SponsorMatchingService.getSponsorPreferences(sponsorUser.id);
    assert.strictEqual(matchingPrefs.isCustomized, true, 'Matching service must recognize custom preferences');
    assert(matchingPrefs.preferences.targetInterests.length > 0, 'targetInterests populated for AI embedding');
    assert(matchingPrefs.preferences.targetSkills.includes('AI'), 'targetSkills includes custom skills');
    assert(matchingPrefs.preferences.preferredEventTypes?.includes('hackathon'), 'preferredEventTypes includes hackathon');
    console.log('  ✅ PASS: SponsorMatchingService directly consumes the persisted sponsor preferences');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 STAGE 1 SPONSOR REGISTRATION TESTS PASSED (100%)');
    console.log('====================================================\n');
  } finally {
    // Cleanup
    await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [validEmail]);
  }
}

runStage1SponsorRegistrationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ STAGE 1 TEST SUITE FAILED:', err);
    process.exit(1);
  });

