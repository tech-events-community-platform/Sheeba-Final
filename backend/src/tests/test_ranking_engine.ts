import {
  rankEventsForSponsor,
  calculateAudienceSkillFit,
  calculateEventCredibility,
  calculateCategoryFit,
} from '../services/matching/rankingEngine';
import { EventCandidate, SponsorPreferences } from '../services/matching/matchingTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRankingEngineTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING SPONSOR MATCHING RANKING ENGINE UNIT TESTS');
  console.log('========================================================\n');

  // Sample Events
  const techHackathon: EventCandidate = {
    id: 'evt-tech-1',
    title: 'Addis AI & Cloud Hackathon',
    description: 'A 48-hour competitive hackathon for software engineers building scalable AI and backend systems.',
    category: 'Technology & AI',
    eventType: 'hackathon',
    location: 'Addis Ababa',
    eventDate: '2026-11-20',
    capacity: 200,
    registeredCount: 150,
    checkedInCount: 135, // 90% verified check-in
    verifiedAttendanceRate: 90,
    attendeeRoles: { 'Software Engineer': 80, 'AI Enthusiast': 40, 'Student': 15 },
    attendeeSkills: { 'Python': 70, 'TypeScript': 60, 'Docker': 45, 'Machine Learning': 50 },
    badgeCounts: { attended: 135, participant: 50, winner: 6, speaker: 4 },
  };

  const startupSummit: EventCandidate = {
    id: 'evt-biz-1',
    title: 'Ethiopia Venture & Startup Pitch Day',
    description: 'Connecting seed-stage startup founders, venture capitalists, and business executives for pitch showcases.',
    category: 'Startup & Entrepreneurship',
    eventType: 'summit',
    location: 'Addis Ababa',
    eventDate: '2026-11-25',
    capacity: 100,
    registeredCount: 80,
    checkedInCount: 72,
    verifiedAttendanceRate: 90,
    attendeeRoles: { 'Founder / Entrepreneur': 50, 'Investor': 15, 'Business Consultant': 7 },
    attendeeSkills: { 'Pitching': 30, 'Fundraising': 25, 'Financial Modeling': 20 },
    badgeCounts: { attended: 72, participant: 30, winner: 3, speaker: 5 },
  };

  const highRegGhostEvent: EventCandidate = {
    id: 'evt-ghost-1',
    title: 'Unverified Viral Webinar',
    description: 'An online gathering with massive bot signups but minimal confirmed attendees.',
    category: 'General',
    eventType: 'meetup',
    location: 'Remote',
    eventDate: '2026-10-10',
    capacity: 1000,
    registeredCount: 500,
    checkedInCount: 0, // ZERO verified check-ins despite 500 registrations
    verifiedAttendanceRate: 0,
    attendeeRoles: {},
    attendeeSkills: {},
    badgeCounts: { attended: 0, participant: 0, winner: 0, speaker: 0 },
  };

  const sparseDataEvent: EventCandidate = {
    id: 'evt-sparse-1',
    title: 'Brand New Coding Workshop',
    description: 'Upcoming hands-on introduction to distributed systems.',
    category: 'Technology & AI',
    eventType: 'workshop',
    location: 'Addis Ababa',
    eventDate: '2026-12-01',
    capacity: 50,
    registeredCount: 0, // Just published, 0 registrations so far
    checkedInCount: 0,
    verifiedAttendanceRate: 0,
    attendeeRoles: {},
    attendeeSkills: {},
    badgeCounts: { attended: 0, participant: 0, winner: 0, speaker: 0 },
  };

  // 1. Technical Talent Sponsor
  console.log('📦 Test 1: Sponsor looking for technical talent...');
  const techSponsorPrefs: SponsorPreferences = {
    targetInterests: ['Technology & AI', 'Software Engineering'],
    targetSkills: ['TypeScript', 'Python', 'Machine Learning', 'Software Engineer'],
    sponsorshipObjectives: ['talent_recruitment'],
    preferredEventTypes: ['hackathon', 'workshop'],
  };

  const techRankings = rankEventsForSponsor(
    [techHackathon, startupSummit, highRegGhostEvent, sparseDataEvent],
    techSponsorPrefs,
    { sponsorIndustry: 'Software & Cloud Infrastructure' }
  );

  assert(techRankings.length === 4, 'All eligible events should be ranked');
  assert(
    techRankings[0].event.id === 'evt-tech-1',
    `Tech hackathon should be #1 for tech sponsor (got: ${techRankings[0].event.title})`
  );
  console.log(`  ✅ PASS: Top event for tech sponsor is "${techRankings[0].event.title}" with score ${techRankings[0].overallScore}`);
  console.log(`     Explanation: ${techRankings[0].explanation.primaryReason}`);

  // 2. Entrepreneurship Sponsor
  console.log('\n📦 Test 2: Sponsor interested in entrepreneurship...');
  const businessSponsorPrefs: SponsorPreferences = {
    targetInterests: ['Startup & Entrepreneurship', 'Business'],
    targetSkills: ['Founder', 'Entrepreneur', 'Fundraising', 'Pitching'],
    sponsorshipObjectives: ['startup_discovery', 'brand_awareness'],
    preferredEventTypes: ['summit'],
  };

  const bizRankings = rankEventsForSponsor(
    [techHackathon, startupSummit, highRegGhostEvent, sparseDataEvent],
    businessSponsorPrefs,
    { sponsorIndustry: 'Venture Capital & Innovation Funds' }
  );

  assert(
    bizRankings[0].event.id === 'evt-biz-1',
    `Startup summit should be #1 for business sponsor (got: ${bizRankings[0].event.title})`
  );
  console.log(`  ✅ PASS: Top event for biz sponsor is "${bizRankings[0].event.title}" with score ${bizRankings[0].overallScore}`);

  // 3. Different sponsors receive different rankings
  console.log('\n📦 Test 3: Verify personalization (different rankings for different sponsors)...');
  assert(
    techRankings[0].event.id !== bizRankings[0].event.id,
    'Sponsors with different profiles MUST receive different rankings'
  );
  console.log(`  ✅ PASS: Personalized rankings confirmed: Tech sponsor top=#1 is ${techRankings[0].event.id}, Biz sponsor top=#1 is ${bizRankings[0].event.id}`);

  // 4. Ghost Event Safeguard: High registrations with low turnout is penalized
  console.log('\n📦 Test 4: High registrations with zero checked-in attendees is penalized...');
  const ghostCredibility = calculateEventCredibility(highRegGhostEvent);
  const techCredibility = calculateEventCredibility(techHackathon);
  assert(
    ghostCredibility.score < techCredibility.score,
    `Ghost event credibility (${ghostCredibility.score}) must be lower than verified event (${techCredibility.score})`
  );
  console.log(`  ✅ PASS: Ghost event penalized (credibility score: ${ghostCredibility.score} vs verified: ${techCredibility.score})`);

  // 5. Missing participant-skill data does not result in fabricated scores
  console.log('\n📦 Test 5: Missing participant skill data handled neutrally without fabrication...');
  const sparseAudienceFit = calculateAudienceSkillFit(sparseDataEvent, techSponsorPrefs);
  assert(
    sparseAudienceFit.isTelemetryAvailable === false,
    'Telemetry must be reported as unavailable for events with 0 registrations'
  );
  assert(
    sparseAudienceFit.score === 0.5,
    'Neutral score of 0.5 must be applied when no attendee data exists'
  );
  assert(
    sparseAudienceFit.matchedSkills.length === 0,
    'No skills should be fabricated when none exist'
  );
  console.log('  ✅ PASS: Missing data handled gracefully with neutral score and zero hallucinated skills');

  // 6. Top 10 deduplication and sorting
  console.log('\n📦 Test 6: Deduplication and ordering...');
  const duplicateEvents = [
    techHackathon,
    { ...techHackathon }, // duplicate ID
    startupSummit,
  ];
  const dedupedRankings = rankEventsForSponsor(duplicateEvents, techSponsorPrefs);
  assert(dedupedRankings.length === 2, 'Duplicate event IDs must be filtered out');
  assert(dedupedRankings[0].overallScore >= dedupedRankings[1].overallScore, 'Events must be ordered descending by score');
  console.log('  ✅ PASS: Deduplication and descending score ordering verified');

  console.log('\n🎉 ALL RANKING ENGINE TESTS PASSED SUCCESSFULLY!\n');
}

runRankingEngineTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
