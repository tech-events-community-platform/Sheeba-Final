import { query } from '../config/db';
import { signAuthToken } from '../utils/jwt.util';
import { SponsorMatchingService } from '../services/matching/sponsorMatching.service';
import { rankEventsForSponsor } from '../services/matching/rankingEngine';
import { EventCandidate, SponsorPreferences } from '../services/matching/matchingTypes';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSponsorMatchingIntegrationTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING SPONSOR MATCHING SERVICE INTEGRATION TESTS');
  console.log('========================================================\n');

  // 1. Find existing sponsor users or create temporary test sponsors
  const sponsorsRes = await query(
    `SELECT id, email, full_name, role, company_name, industry_category 
     FROM users WHERE LOWER(role) = 'sponsor' LIMIT 2`
  );

  let sponsorA = sponsorsRes.rows[0];
  let sponsorB = sponsorsRes.rows[1];

  if (!sponsorA) {
    const insertRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, company_name, industry_category, approval_status, is_active)
       VALUES ('test_tech_sponsor@sheeba.et', 'hash123', 'TechCorp Director', 'sponsor', 'TechCorp Solutions', 'Software & Cloud Infrastructure', 'approved', true)
       RETURNING id, email, full_name, role, company_name, industry_category`
    );
    sponsorA = insertRes.rows[0];
  }

  if (!sponsorB) {
    const insertResB = await query(
      `INSERT INTO users (email, password_hash, full_name, role, company_name, industry_category, approval_status, is_active)
       VALUES ('test_vc_sponsor@sheeba.et', 'hash123', 'Venture Capital Lead', 'sponsor', 'Addis Ventures Fund', 'Venture Capital & Innovation Funds', 'approved', true)
       RETURNING id, email, full_name, role, company_name, industry_category`
    );
    sponsorB = insertResB.rows[0];
  }

  console.log(`Using Sponsor A: ${sponsorA.company_name} (${sponsorA.industry_category})`);
  console.log(`Using Sponsor B: ${sponsorB.company_name} (${sponsorB.industry_category})\n`);

  // 2. Test Preferences Retrieval & Updating
  console.log('📦 1. Testing Sponsor Preferences Management...');
  const initialPrefsA = await SponsorMatchingService.getSponsorPreferences(sponsorA.id);
  assert(Boolean(initialPrefsA.preferences), 'Sponsor preferences should be loaded or defaulted');
  assert(initialPrefsA.preferences.targetInterests.length > 0, 'Target interests must be populated');
  console.log('  ✅ PASS: Retrieved preferences for Sponsor A:', initialPrefsA.preferences.targetInterests);

  // Update preferences for Sponsor A (Tech talent recruitment)
  const updatedPrefsA = await SponsorMatchingService.updateSponsorPreferences(sponsorA.id, {
    targetInterests: ['Technology & AI', 'Software Engineering'],
    targetSkills: ['TypeScript', 'Python', 'DevOps', 'Machine Learning'],
    sponsorshipObjectives: ['talent_recruitment'],
    preferredEventTypes: ['hackathon', 'workshop'],
  });
  assert(updatedPrefsA.sponsorshipObjectives.includes('talent_recruitment'), 'Updated objective must persist');
  console.log('  ✅ PASS: Successfully updated Sponsor A preferences for tech talent recruitment');

  // Update preferences for Sponsor B (Startup & venture discovery)
  const updatedPrefsB = await SponsorMatchingService.updateSponsorPreferences(sponsorB.id, {
    targetInterests: ['Startup & Entrepreneurship', 'Fintech'],
    targetSkills: ['Founder', 'Entrepreneur', 'Product Management'],
    sponsorshipObjectives: ['startup_discovery', 'brand_awareness'],
    preferredEventTypes: ['summit', 'meetup'],
  });
  assert(updatedPrefsB.sponsorshipObjectives.includes('startup_discovery'), 'Updated objective must persist');
  console.log('  ✅ PASS: Successfully updated Sponsor B preferences for startup discovery');

  // 3. Generate Recommendations for Sponsor A
  console.log('\n📦 2. Testing Recommendations Generation for Sponsor A (Tech Talent)...');
  const recommendationsA = await SponsorMatchingService.getRecommendationsForSponsor(sponsorA.id, { limit: 10 });
  assert(Array.isArray(recommendationsA.matches), 'Matches must be an array');
  assert(recommendationsA.matches.length > 0, 'Should find candidate events from database');
  assert(recommendationsA.matches.length <= 10, 'Should return at most 10 events');

  // Check top match structure
  const topA = recommendationsA.matches[0];
  assert(Boolean(topA.event.id), 'Top match must have an event id');
  assert(topA.overallScore >= 0 && topA.overallScore <= 100, 'Score must be between 0 and 100');
  assert(Boolean(topA.scoreBreakdown), 'Must contain score breakdown');
  assert(Boolean(topA.explanation.primaryReason), 'Must contain primary explanation');
  assert(Array.isArray(topA.explanation.evidence), 'Must contain evidence bullet points');
  assert(topA.explanation.evidence.length > 0, 'Evidence must not be empty');

  console.log(`  ✅ PASS: Sponsor A Top Match: "${topA.event.title}"`);
  console.log(`     Match Score: ${topA.overallScore}%`);
  console.log(`     Category: ${topA.event.category} (${topA.event.eventType})`);
  console.log(`     Evidence: ${topA.explanation.evidence.join(' | ')}`);

  // Verify descending order
  for (let i = 1; i < recommendationsA.matches.length; i++) {
    assert(
      recommendationsA.matches[i - 1].overallScore >= recommendationsA.matches[i].overallScore,
      'Matches must be sorted in descending order of score'
    );
  }
  console.log('  ✅ PASS: Recommendations correctly ordered descending by score');

  // 4. Generate Recommendations for Sponsor B (Startup & Entrepreneurship)
  console.log('\n📦 3. Testing Recommendations Generation for Sponsor B (Entrepreneurship & VC)...');
  const recommendationsB = await SponsorMatchingService.getRecommendationsForSponsor(sponsorB.id, { limit: 10 });
  assert(recommendationsB.matches.length > 0, 'Sponsor B should receive recommendations');
  const topB = recommendationsB.matches[0];

  console.log(`  ✅ PASS: Sponsor B Top Match: "${topB.event.title}"`);
  console.log(`     Match Score: ${topB.overallScore}%`);
  console.log(`     Category: ${topB.event.category} (${topB.event.eventType})`);
  console.log(`     Evidence: ${topB.explanation.evidence.join(' | ')}`);

  // 5. Test Personalization Difference
  console.log('\n📦 4. Verifying Personalization Across Different Sponsors...');
  const scoresA = new Map(recommendationsA.matches.map((m) => [m.event.id, m.overallScore]));
  const scoresB = new Map(recommendationsB.matches.map((m) => [m.event.id, m.overallScore]));

  let hasScoreDifferences = false;
  for (const [id, scoreA] of scoresA) {
    if (scoresB.has(id) && scoresB.get(id) !== scoreA) {
      hasScoreDifferences = true;
      break;
    }
  }
  assert(hasScoreDifferences, 'Different sponsors MUST receive different match scores');
  console.log('  ✅ PASS: Confirmed distinct personalized match scores for different sponsors');

  // 6. Test Deduplication
  console.log('\n📦 5. Verifying Zero Duplicates in Recommendations...');
  const seenIds = new Set<string>();
  for (const match of recommendationsA.matches) {
    assert(!seenIds.has(match.event.id), `Duplicate event found in recommendations: ${match.event.id}`);
    seenIds.add(match.event.id);
  }
  console.log(`  ✅ PASS: All ${seenIds.size} recommended events are unique with no duplicates`);

  // 7. Verify Fallback Behavior and Fault Tolerance
  console.log('\n📦 6. Testing Graceful Handling of Empty Preferences & AI Fallback...');
  const fallbackRecs = await SponsorMatchingService.getRecommendationsForSponsor(sponsorA.id, {
    preferences: {
      targetInterests: [],
      targetSkills: [],
      sponsorshipObjectives: [],
    },
  });
  assert(Array.isArray(fallbackRecs.matches), 'Fallback should return valid array even with empty preferences');
  assert(fallbackRecs.matches.length > 0, 'Fallback should still surface eligible events');
  console.log(`  ✅ PASS: Successfully handled empty preferences without crashing; returned ${fallbackRecs.matches.length} events`);

  // 8. Verify Exclusion of Past Events in East Africa Time (EAT)
  console.log('\n📦 7. Testing that past events are strictly excluded from recommendations...');
  const { computeEventDayExpiration } = await import('../utils/qr.util');
  const currentTime = new Date();
  for (const match of recommendationsA.matches) {
    const exp = computeEventDayExpiration(match.event.eventDate);
    assert(
      currentTime.getTime() <= exp.getTime(),
      `Event "${match.event.title}" (${match.event.eventDate}) is expired and should not be recommended`
    );
  }
  for (const match of recommendationsB.matches) {
    const exp = computeEventDayExpiration(match.event.eventDate);
    assert(
      currentTime.getTime() <= exp.getTime(),
      `Event "${match.event.title}" (${match.event.eventDate}) is expired and should not be recommended`
    );
  }
  console.log('  ✅ PASS: Verified 100% of recommended events are active/upcoming (EAT timezone respected)');

  console.log('\n🎉 ALL SPONSOR MATCHING SERVICE TESTS PASSED!\n');
}

runSponsorMatchingIntegrationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Integration test failed:', err);
    process.exit(1);
  });
