import {
  SponsorPreferences,
  EventCandidate,
  ScoredEventMatch,
  MatchingWeights,
  DEFAULT_MATCHING_WEIGHTS,
} from './matchingTypes';

/**
 * Normalizes text into lowercased token set
 */
export function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Calculates Jaccard / token-overlap similarity between two text snippets or lists
 */
export function calculateTokenOverlap(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes cosine similarity between two numeric embedding vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound between 0 and 1
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Domain & Category Affinity Matrix:
 * Maps categories/types to related concepts
 */
const DOMAIN_AFFINITIES: Record<string, string[]> = {
  technology: ['tech', 'software', 'developer', 'engineering', 'code', 'ai', 'cloud', 'data', 'hackathon'],
  software: ['code', 'developer', 'frontend', 'backend', 'fullstack', 'programming', 'engineering', 'web'],
  ai: ['machine learning', 'data science', 'deep learning', 'neural', 'generative ai', 'llm', 'computer vision'],
  fintech: ['finance', 'banking', 'payments', 'crypto', 'blockchain', 'telebirr', 'accounting'],
  entrepreneurship: ['startup', 'founder', 'business', 'pitch', 'venture', 'investment', 'incubation', 'scaleup'],
  education: ['student', 'university', 'youth', 'learning', 'workshop', 'training', 'masterclass'],
  creative: ['design', 'ui', 'ux', 'media', 'art', 'graphics', 'marketing', 'content'],
};

/**
 * Compute Category & Topic Match (0 to 1)
 */
export function calculateCategoryFit(
  event: EventCandidate,
  preferences: SponsorPreferences,
  sponsorIndustry?: string
): number {
  const combinedPrefs = [
    ...(preferences.targetInterests || []),
    ...(preferences.preferredEventTypes || []),
    sponsorIndustry || '',
  ]
    .join(' ')
    .toLowerCase();

  const eventContent = `${event.category} ${event.eventType} ${event.title}`.toLowerCase();

  // Direct category string match
  if (preferences.targetInterests?.some((t) => eventContent.includes(t.toLowerCase()))) {
    return 1.0;
  }

  // Check event type match
  if (
    preferences.preferredEventTypes &&
    preferences.preferredEventTypes.length > 0 &&
    preferences.preferredEventTypes.some(
      (type) => type.toLowerCase() === event.eventType.toLowerCase()
    )
  ) {
    return 0.9;
  }

  // Affinity check
  let affinityScore = 0;
  for (const [domain, keywords] of Object.entries(DOMAIN_AFFINITIES)) {
    const prefMatchesDomain = combinedPrefs.includes(domain) || keywords.some((k) => combinedPrefs.includes(k));
    const eventMatchesDomain = eventContent.includes(domain) || keywords.some((k) => eventContent.includes(k));

    if (prefMatchesDomain && eventMatchesDomain) {
      affinityScore = Math.max(affinityScore, 0.85);
    }
  }

  if (affinityScore > 0) return affinityScore;

  // Fallback to token overlap
  const prefTokens = tokenize(combinedPrefs);
  const eventTokens = tokenize(eventContent);
  const overlap = calculateTokenOverlap(prefTokens, eventTokens);
  return Math.min(1.0, overlap * 2);
}

/**
 * Calculate Audience & Skill Fit (0 to 1)
 * Compares sponsor's target skills & roles with actual attendee responses.
 * If no attendee registration telemetry exists, returns a neutral 0.5 without fabricating data.
 */
export function calculateAudienceSkillFit(
  event: EventCandidate,
  preferences: SponsorPreferences
): { score: number; matchedSkills: string[]; matchedRoles: string[]; isTelemetryAvailable: boolean } {
  const targetSkills = (preferences.targetSkills || []).map((s) => s.toLowerCase());
  const targetRoles = (preferences.targetInterests || []).map((r) => r.toLowerCase());

  const totalRegistered = event.registeredCount || 0;
  const roleEntries = Object.entries(event.attendeeRoles || {});
  const skillEntries = Object.entries(event.attendeeSkills || {});

  const hasAudienceData = roleEntries.length > 0 || skillEntries.length > 0;

  if (!hasAudienceData || totalRegistered === 0) {
    // Zero telemetry recorded: Return neutral 0.5 score
    return {
      score: 0.5,
      matchedSkills: [],
      matchedRoles: [],
      isTelemetryAvailable: false,
    };
  }

  let skillMatchCount = 0;
  let totalSkillsRecorded = 0;
  const matchedSkills: string[] = [];

  for (const [skill, count] of skillEntries) {
    totalSkillsRecorded += count;
    const lower = skill.toLowerCase();
    if (targetSkills.some((target) => lower.includes(target) || target.includes(lower))) {
      skillMatchCount += count;
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
    }
  }

  let roleMatchCount = 0;
  let totalRolesRecorded = 0;
  const matchedRoles: string[] = [];

  for (const [role, count] of roleEntries) {
    totalRolesRecorded += count;
    const lower = role.toLowerCase();
    if (
      targetRoles.some((target) => lower.includes(target) || target.includes(lower)) ||
      targetSkills.some((target) => lower.includes(target) || target.includes(lower))
    ) {
      roleMatchCount += count;
      if (!matchedRoles.includes(role)) matchedRoles.push(role);
    }
  }

  const skillRatio = totalSkillsRecorded > 0 ? skillMatchCount / totalSkillsRecorded : 0;
  const roleRatio = totalRolesRecorded > 0 ? roleMatchCount / totalRolesRecorded : 0;

  // Combined score weighted by actual audience alignment
  const score = Math.min(1.0, Math.max(0.1, (skillRatio * 0.6 + roleRatio * 0.4) * 1.5));

  return {
    score,
    matchedSkills,
    matchedRoles,
    isTelemetryAvailable: true,
  };
}

/**
 * Calculate Event Credibility & Verified Attendance Track Record (0 to 1)
 * Crucial Safeguard: High registrations with low verified check-ins are penalized.
 */
export function calculateEventCredibility(event: EventCandidate): {
  score: number;
  attendanceEvidence: string;
} {
  const registered = event.registeredCount || 0;
  const checkedIn = event.checkedInCount || 0;

  let attendanceScore = 0.5; // neutral for upcoming events with no check-in window yet
  let attendanceEvidence = 'Event is open for registration';

  if (registered > 0) {
    const verifiedRate = checkedIn / registered;

    if (checkedIn === 0 && registered > 20) {
      // High registrations but zero physical turnout yet (or past event with no attendance)
      attendanceScore = 0.4;
      attendanceEvidence = `${registered} registrations recorded; pending door check-in verification`;
    } else if (checkedIn > 0) {
      // Real check-in data exists
      attendanceScore = Math.min(1.0, 0.4 + verifiedRate * 0.6);
      attendanceEvidence = `${checkedIn} verified check-in(s) (${Math.round(verifiedRate * 100)}% verified turnout)`;
    } else {
      attendanceScore = 0.55;
      attendanceEvidence = `${registered} participant(s) registered`;
    }
  }

  // Bonus for verified badge honors (winners, speakers)
  const badges = event.badgeCounts || { attended: 0, participant: 0, winner: 0, speaker: 0 };
  const hasHonors = (badges.winner || 0) > 0 || (badges.speaker || 0) > 0;
  if (hasHonors) {
    attendanceScore = Math.min(1.0, attendanceScore + 0.1);
  }

  // Bonus for verified high review ratings
  if (event.averageRating && event.averageRating >= 4.0 && (event.reviewCount || 0) > 0) {
    attendanceScore = Math.min(1.0, attendanceScore + 0.05);
  }

  return {
    score: attendanceScore,
    attendanceEvidence,
  };
}

/**
 * Generate human-readable, evidence-based match explanation
 */
export function generateMatchExplanation(
  event: EventCandidate,
  preferences: SponsorPreferences,
  breakdown: {
    semanticRelevance: number;
    categoryFit: number;
    audienceSkillFit: number;
    eventCredibility: number;
  },
  audienceDetails: {
    matchedSkills: string[];
    matchedRoles: string[];
    isTelemetryAvailable: boolean;
  },
  attendanceEvidence: string
): { primaryReason: string; evidence: string[]; strengths: string[] } {
  const evidence: string[] = [];
  const strengths: string[] = [];

  // 1. Primary thematic reason
  let primaryReason = `Matches your sponsorship focus in ${preferences.targetInterests?.slice(0, 2).join(' & ') || event.category}.`;
  if (preferences.sponsorshipObjectives?.includes('talent_recruitment')) {
    primaryReason = `Strong talent pipeline alignment: ${event.title} engages relevant candidates in ${event.category}.`;
  } else if (preferences.sponsorshipObjectives?.includes('startup_discovery')) {
    primaryReason = `High entrepreneurial alignment: provides visibility into innovative projects and founders.`;
  }

  // 2. Audience evidence
  if (audienceDetails.isTelemetryAvailable && audienceDetails.matchedSkills.length > 0) {
    evidence.push(`Audience data confirms participants with expertise in: ${audienceDetails.matchedSkills.slice(0, 3).join(', ')}.`);
    strengths.push('Target Skill Alignment');
  } else if (audienceDetails.isTelemetryAvailable && audienceDetails.matchedRoles.length > 0) {
    evidence.push(`Registrants represent target profiles including: ${audienceDetails.matchedRoles.slice(0, 3).join(', ')}.`);
    strengths.push('Audience Profile Fit');
  } else {
    evidence.push(`Open registration in ${event.category} tailored for ${event.eventType} attendees.`);
  }

  // 3. Attendance & verification evidence
  evidence.push(attendanceEvidence);
  if (breakdown.eventCredibility >= 0.75) {
    strengths.push('High Verified Turnout');
  }

  // 4. Badges / Outcomes
  if (event.badgeCounts?.winner > 0) {
    evidence.push(`Includes ${event.badgeCounts.winner} verified competition winner credentials.`);
    strengths.push('Competitive Tech Event');
  }

  if (breakdown.semanticRelevance >= 0.7) {
    strengths.push('High Semantic Match');
  }

  return {
    primaryReason,
    evidence,
    strengths: strengths.length > 0 ? strengths : ['Category Relevant'],
  };
}

/**
 * Pure Ranking Function:
 * Ranks an array of EventCandidate against SponsorPreferences
 */
export function rankEventsForSponsor(
  events: EventCandidate[],
  preferences: SponsorPreferences,
  options: {
    sponsorIndustry?: string;
    semanticScores?: Map<string, number>; // eventId -> semantic similarity (0 to 1)
    weights?: Partial<MatchingWeights>;
    topN?: number;
  } = {}
): ScoredEventMatch[] {
  const weights: MatchingWeights = {
    ...DEFAULT_MATCHING_WEIGHTS,
    ...(options.weights || {}),
  };

  // Normalize weights to sum to 1.0
  const weightSum = weights.semantic + weights.category + weights.audience + weights.credibility;
  const normW = {
    semantic: weights.semantic / weightSum,
    category: weights.category / weightSum,
    audience: weights.audience / weightSum,
    credibility: weights.credibility / weightSum,
  };

  // 1. Mandatory Eligibility Filters
  const eligibleEvents = events.filter((ev) => {
    // Deduplicate or validate ID
    if (!ev.id) return false;

    // Filter by budget if specified
    if (preferences.maxBudget && ev.ticketPrice && ev.ticketPrice > preferences.maxBudget) {
      return false;
    }

    // Filter by preferred locations if specified
    if (
      preferences.preferredLocations &&
      preferences.preferredLocations.length > 0 &&
      !preferences.preferredLocations.some((loc) =>
        ev.location.toLowerCase().includes(loc.toLowerCase())
      )
    ) {
      return false;
    }

    return true;
  });

  // Deduplicate by ID
  const seenIds = new Set<string>();
  const uniqueEligible = eligibleEvents.filter((ev) => {
    if (seenIds.has(ev.id)) return false;
    seenIds.add(ev.id);
    return true;
  });

  // 2. Score Each Event
  const scoredList: ScoredEventMatch[] = uniqueEligible.map((event) => {
    // Semantic Score: Use embedding score if available, or fall back to token overlap
    let semanticScore = options.semanticScores?.get(event.id);
    if (semanticScore === undefined) {
      const prefText = `${preferences.targetInterests.join(' ')} ${preferences.targetSkills.join(' ')} ${preferences.sponsorshipObjectives.join(' ')}`;
      const eventText = `${event.title} ${event.category} ${event.description}`;
      semanticScore = calculateTokenOverlap(tokenize(prefText), tokenize(eventText));
    }

    const categoryScore = calculateCategoryFit(event, preferences, options.sponsorIndustry);
    const audienceDetails = calculateAudienceSkillFit(event, preferences);
    const credibilityDetails = calculateEventCredibility(event);

    const breakdown = {
      semanticRelevance: Number(semanticScore.toFixed(3)),
      categoryFit: Number(categoryScore.toFixed(3)),
      audienceSkillFit: Number(audienceDetails.score.toFixed(3)),
      eventCredibility: Number(credibilityDetails.score.toFixed(3)),
    };

    const compositeScore =
      normW.semantic * breakdown.semanticRelevance +
      normW.category * breakdown.categoryFit +
      normW.audience * breakdown.audienceSkillFit +
      normW.credibility * breakdown.eventCredibility;

    const overallScore = Math.round(Math.min(100, Math.max(0, compositeScore * 100)));

    const explanation = generateMatchExplanation(
      event,
      preferences,
      breakdown,
      audienceDetails,
      credibilityDetails.attendanceEvidence
    );

    return {
      event,
      overallScore,
      scoreBreakdown: breakdown,
      explanation,
    };
  });

  // 3. Sort Descending by Overall Score
  scoredList.sort((a, b) => b.overallScore - a.overallScore);

  // Return up to topN (default 10)
  const topN = options.topN || 10;
  return scoredList.slice(0, topN);
}
