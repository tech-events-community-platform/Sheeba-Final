export interface SponsorPreferences {
  targetInterests: string[];
  targetSkills: string[];
  sponsorshipObjectives: string[];
  preferredEventTypes?: string[];
  preferredLocations?: string[];
  maxBudget?: number;
}

export interface RecommendedEventCandidate {
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
  verifiedAttendanceRate: number;
  bannerUrl?: string;
  isPaid?: boolean;
  ticketPrice?: number;
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

export interface MatchScoreBreakdown {
  semanticRelevance: number;
  categoryFit: number;
  audienceSkillFit: number;
  eventCredibility: number;
}

export interface MatchExplanation {
  primaryReason: string;
  evidence: string[];
  strengths: string[];
}

export interface ScoredEventRecommendation {
  event: RecommendedEventCandidate;
  overallScore: number;
  scoreBreakdown: MatchScoreBreakdown;
  explanation: MatchExplanation;
}

export interface SponsorRecommendationsResponse {
  sponsor: {
    id: string;
    companyName: string;
    industryCategory: string;
  };
  preferences: SponsorPreferences;
  matches: ScoredEventRecommendation[];
  totalEligibleEvents: number;
  generatedAt: string;
}
