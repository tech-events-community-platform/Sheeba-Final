export interface SponsorPreferences {
  targetInterests: string[];
  targetSkills: string[];
  sponsorshipObjectives: ('talent_recruitment' | 'brand_awareness' | 'startup_discovery' | 'product_showcase' | 'community_impact' | string)[];
  preferredEventTypes?: string[];
  preferredLocations?: string[];
  maxBudget?: number;
}

export interface EventCandidate {
  id: string;
  title: string;
  description: string;
  category: string;
  eventType: string;
  location: string;
  eventDate: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  verifiedAttendanceRate: number; // 0 to 100
  bannerUrl?: string;
  isPaid?: boolean;
  ticketPrice?: number;
  // Aggregated audience telemetry (anonymized, no PII)
  attendeeRoles: Record<string, number>;
  attendeeSkills: Record<string, number>;
  badgeCounts: {
    attended: number;
    participant: number;
    winner: number;
    speaker: number;
  };
  averageRating?: number;
  reviewCount?: number;
}

export interface MatchExplanation {
  primaryReason: string;
  evidence: string[];
  strengths: string[];
}

export interface ScoredEventMatch {
  event: EventCandidate;
  overallScore: number; // 0 to 100
  scoreBreakdown: {
    semanticRelevance: number; // 0 to 1
    categoryFit: number;      // 0 to 1
    audienceSkillFit: number; // 0 to 1
    eventCredibility: number; // 0 to 1
  };
  explanation: MatchExplanation;
}

export interface MatchingWeights {
  semantic: number;
  category: number;
  audience: number;
  credibility: number;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  semantic: 0.35,
  category: 0.20,
  audience: 0.25,
  credibility: 0.20,
};
