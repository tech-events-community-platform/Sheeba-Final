import assert from 'assert';
import { SponsorMatchingService } from '../services/matching/sponsorMatching.service';
import { updateSponsorPreferencesSchema } from '../schemas/matching.schema';
import { calculateCategoryFit, calculateAudienceSkillFit } from '../services/matching/rankingEngine';
import { EventCandidate } from '../services/matching/matchingTypes';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';

async function runStage3SponsorSettingsTests() {
  console.log('====================================================');
  console.log('🛡️  SHEEBA STAGE 3: SPONSOR SETTINGS & AI MATCHING');
  console.log('====================================================');

  const testSuffix = Date.now().toString(36);
  const sponsorEmail = `st3_sponsor_${testSuffix}@example.com`;
  const legacySponsorEmail = `st3_legacy_${testSuffix}@example.com`;
  const nonSponsorEmail = `st3_attendee_${testSuffix}@example.com`;
  const hashedPassword = await bcrypt.hash('SecretPass123!', 10);

  let sponsorId: string;
  let legacySponsorId: string;
  let nonSponsorId: string;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create test users
    // -------------------------------------------------------------------------
    // 1. Modern Sponsor
    const spRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, approval_status, company_name, industry_category, bio, avatar_url, sponsor_preferences)
       VALUES ($1, $2, $3, 'SPONSOR', 'approved', 'Nova Tech Solutions', 'AI & Machine Learning', 'Original Nova Bio', 'https://example.com/old-logo.png',
               '{"sponsorshipObjectives": ["Brand awareness"], "targetAudience": ["Software developers"]}'::jsonb)
       RETURNING id`,
      ['Nova Rep', sponsorEmail, hashedPassword]
    );
    sponsorId = spRes.rows[0].id;

    // 2. Legacy Sponsor (pre-Stage 1: NULL sponsor_preferences, NULL bio, NULL avatar_url)
    const legRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, approval_status, company_name, industry_category)
       VALUES ($1, $2, $3, 'SPONSOR', 'approved', 'Legacy Holdings', 'Financial Technology')
       RETURNING id`,
      ['Legacy Rep', legacySponsorEmail, hashedPassword]
    );
    legacySponsorId = legRes.rows[0].id;

    // 3. Attendee (Non-sponsor)
    const attRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, approval_status)
       VALUES ($1, $2, $3, 'ATTENDEE', 'approved')
       RETURNING id`,
      ['Test Attendee', nonSponsorEmail, hashedPassword]
    );
    nonSponsorId = attRes.rows[0].id;

    console.log('✅ Test fixtures initialized successfully.');

    // -------------------------------------------------------------------------
    // TEST 1: Schema Validation (updateSponsorPreferencesSchema)
    // -------------------------------------------------------------------------
    console.log('\n🔹 1. Testing updateSponsorPreferencesSchema Validation...');
    const validPayload = {
      companyName: 'Nova Tech International',
      companyDescription: 'Leading enterprise AI platforms and intelligent workflow automation across Africa.',
      companyLogo: 'https://example.com/nova-logo-2026.png',
      companyWebsite: 'https://novatech.et',
      companyPhone: '+251 91 999 8888',
      preferredEventCategories: ['AI & Data Science', 'Fintech', 'Developer Conferences'],
      skillsAndInterests: ['Machine Learning', 'Deep Learning', 'Python', 'Cloud Computing'],
      sponsorshipObjectives: ['Talent recruitment', 'Product promotion', 'Brand awareness'],
      targetAudience: ['Software developers', 'Researchers', 'Technology professionals'],
      preferredLocations: ['Addis Ababa', 'Virtual / Online'],
      maxBudget: 750000,
      preferredBenefits: ['Keynote presentation', 'Exhibition booth', 'Access to attendee resumes'],
      additionalPreferences: { notes: 'Interested in partnering on student hackathon challenges.' },
    };

    const parsed = updateSponsorPreferencesSchema.safeParse(validPayload);
    assert(parsed.success, `Schema validation should pass for complete payload: ${JSON.stringify(parsed.error?.format())}`);
    console.log('  ✅ PASS: Valid payload passes schema validation');

    // Invalid logo URL
    const invalidLogo = updateSponsorPreferencesSchema.safeParse({
      ...validPayload,
      companyLogo: 'not-a-valid-url',
    });
    assert(!invalidLogo.success, 'Schema should reject invalid companyLogo URL');
    console.log('  ✅ PASS: Invalid companyLogo format rejected');

    // Negative budget
    const negativeBudget = updateSponsorPreferencesSchema.safeParse({
      ...validPayload,
      maxBudget: -100,
    });
    assert(!negativeBudget.success, 'Schema should reject negative maxBudget');
    console.log('  ✅ PASS: Negative maxBudget rejected');

    // -------------------------------------------------------------------------
    // TEST 2: Pre-Stage 1 Legacy Sponsor Fallbacks
    // -------------------------------------------------------------------------
    console.log('\n🔹 2. Testing Pre-Stage 1 Legacy Sponsor Preferences Retrieval...');
    const legacyData = await SponsorMatchingService.getSponsorPreferences(legacySponsorId);
    assert(legacyData !== null, 'Legacy sponsor data must not be null');
    assert(Array.isArray(legacyData.preferences.targetInterests), 'targetInterests must be an array for legacy sponsor');
    assert(Array.isArray(legacyData.preferences.sponsorshipObjectives), 'sponsorshipObjectives must be an array');
    assert(Array.isArray(legacyData.preferences.targetAudience), 'targetAudience must be an array');
    assert(Array.isArray(legacyData.preferences.preferredEventCategories), 'preferredEventCategories must be an array');
    assert.strictEqual(legacyData.companyName, 'Legacy Holdings');
    assert.strictEqual(legacyData.bio, '');
    assert.strictEqual(legacyData.avatarUrl, '');
    console.log('  ✅ PASS: Legacy pre-Stage 1 sponsor preferences loaded with safe default fallbacks');

    // -------------------------------------------------------------------------
    // TEST 3: Updating Sponsor Preferences & PostgreSQL Persistence
    // -------------------------------------------------------------------------
    console.log('\n🔹 3. Testing Sponsor Settings Update and Database Persistence...');
    await SponsorMatchingService.updateSponsorPreferences(sponsorId, {
      companyName: 'Nova Tech International',
      companyDescription: 'Leading enterprise AI platforms and intelligent workflow automation across Africa.',
      companyLogo: 'https://example.com/nova-logo-2026.png',
      companyWebsite: 'https://novatech.et',
      companyPhone: '+251 91 999 8888',
      preferredEventCategories: ['AI & Data Science', 'Fintech'],
      targetAudience: ['Software developers', 'Researchers'],
      skillsAndInterests: ['Machine Learning', 'Python'],
      sponsorshipObjectives: ['Talent recruitment', 'Startup discovery'],
      preferredLocations: ['Addis Ababa'],
      maxBudget: 750000,
      preferredBenefits: ['Keynote presentation', 'Exhibition booth'],
      additionalPreferences: { notes: 'Special interest in robotics demos.' },
    });

    // Check direct database values in users table
    const dbCheck = await query(
      `SELECT bio, avatar_url, company_name, company_website, company_phone, sponsor_preferences
       FROM users WHERE id = $1`,
      [sponsorId]
    );
    const row = dbCheck.rows[0];
    assert.strictEqual(row.bio, 'Leading enterprise AI platforms and intelligent workflow automation across Africa.');
    assert.strictEqual(row.avatar_url, 'https://example.com/nova-logo-2026.png');
    assert.strictEqual(row.company_name, 'Nova Tech International');
    assert.strictEqual(row.company_website, 'https://novatech.et');
    assert.strictEqual(row.company_phone, '+251 91 999 8888');

    const jsonbPrefs = row.sponsor_preferences;
    assert.deepStrictEqual(jsonbPrefs.preferredEventCategories, ['AI & Data Science', 'Fintech']);
    assert.deepStrictEqual(jsonbPrefs.targetAudience, ['Software developers', 'Researchers']);
    assert.deepStrictEqual(jsonbPrefs.sponsorshipObjectives, ['Talent recruitment', 'Startup discovery']);
    assert.deepStrictEqual(jsonbPrefs.targetSkills, ['Machine Learning', 'Python']);
    assert.strictEqual(jsonbPrefs.maxBudget, 750000);
    assert.deepStrictEqual(jsonbPrefs.additionalPreferences, { notes: 'Special interest in robotics demos.' });
    console.log('  ✅ PASS: PostgreSQL bio, avatar_url, contact fields and sponsor_preferences JSONB persisted exactly');

    // -------------------------------------------------------------------------
    // TEST 4: Get Updated Sponsor Settings
    // -------------------------------------------------------------------------
    console.log('\n🔹 4. Testing getSponsorPreferences after update...');
    const updatedData = await SponsorMatchingService.getSponsorPreferences(sponsorId);
    assert.strictEqual(updatedData.bio, 'Leading enterprise AI platforms and intelligent workflow automation across Africa.');
    assert.strictEqual(updatedData.avatarUrl, 'https://example.com/nova-logo-2026.png');
    assert.strictEqual(updatedData.preferences.maxBudget, 750000);
    assert.deepStrictEqual(updatedData.preferences.preferredEventCategories, ['AI & Data Science', 'Fintech']);
    assert.deepStrictEqual(updatedData.preferences.targetAudience, ['Software developers', 'Researchers']);
    assert.deepStrictEqual(updatedData.preferences.additionalPreferences, { notes: 'Special interest in robotics demos.' });
    console.log('  ✅ PASS: getSponsorPreferences returns all persisted fields and profile metadata');

    // -------------------------------------------------------------------------
    // TEST 5: AI Ranking Engine Category & Audience Fit with Stage 3 Preferences
    // -------------------------------------------------------------------------
    console.log('\n🔹 5. Testing RankingEngine Category & Audience Fit...');
    
    const mockCandidate: EventCandidate = {
      id: 'event-mock-01',
      title: 'Addis AI & Machine Learning Summit',
      description: 'Annual gathering of deep learning practitioners and researchers',
      category: 'AI & Data Science',
      eventType: 'Summit',
      location: 'Addis Ababa',
      eventDate: '2026-12-01',
      capacity: 500,
      registeredCount: 350,
      checkedInCount: 300,
      verifiedAttendanceRate: 0.85,
      attendeeRoles: { 'Software developers': 180, 'Researchers': 90, 'Students': 80 },
      attendeeSkills: { 'Python': 220, 'Machine Learning': 190, 'Docker': 110 },
      badgeCounts: { attended: 300, participant: 50, winner: 5, speaker: 20 },
    };

    // Category fit test
    const categoryFitScore = calculateCategoryFit(
      mockCandidate,
      updatedData.preferences,
      updatedData.industryCategory
    );
    assert(categoryFitScore >= 0.85, `Category fit score should be high for matching preferred category: got ${categoryFitScore}`);
    console.log(`  ✅ PASS: Category fit score correctly elevated to ${categoryFitScore} for matching preferredEventCategories`);

    // Audience fit test
    const audienceFitResult = calculateAudienceSkillFit(
      mockCandidate,
      updatedData.preferences
    );
    assert(audienceFitResult.score >= 0.5, `Audience fit score should reflect targetAudience and targetSkills match: got ${audienceFitResult.score}`);
    assert(audienceFitResult.matchedRoles.some((r) => r.toLowerCase() === 'software developers'), 'Matched roles should include software developers');
    assert(audienceFitResult.matchedSkills.some((s) => s.toLowerCase() === 'python'), 'Matched skills should include python');
    console.log(`  ✅ PASS: Audience & skill fit score correctly calculated (${audienceFitResult.score}) factoring in targetAudience`);

    // -------------------------------------------------------------------------
    // TEST 6: Empty/Partial Preferences Update Safety
    // -------------------------------------------------------------------------
    console.log('\n🔹 6. Testing Safe Partial Updates (Preserving Unmodified Fields)...');
    await SponsorMatchingService.updateSponsorPreferences(sponsorId, {
      companyDescription: 'Updated bio only',
    });
    const partialData = await SponsorMatchingService.getSponsorPreferences(sponsorId);
    assert.strictEqual(partialData.bio, 'Updated bio only');
    // Prior avatar_url and preferences should remain intact
    assert.strictEqual(partialData.avatarUrl, 'https://example.com/nova-logo-2026.png');
    assert.strictEqual(partialData.preferences.maxBudget, 750000);
    assert.deepStrictEqual(partialData.preferences.preferredEventCategories, ['AI & Data Science', 'Fintech']);
    console.log('  ✅ PASS: Partial update preserves existing profile and preference fields');

    console.log('\n====================================================');
    console.log('🎉 ALL 6 STAGE 3 SPONSOR SETTINGS TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    // Cleanup test users
    await query('DELETE FROM users WHERE LOWER(email) IN (LOWER($1), LOWER($2), LOWER($3))', [
      sponsorEmail,
      legacySponsorEmail,
      nonSponsorEmail,
    ]);
  }
}

runStage3SponsorSettingsTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
