import type { EventType } from './event';

export type BadgeCode = 'attended' | 'participant' | 'winner' | 'speaker';

export interface BadgeDefinition {
  code: BadgeCode;
  label: string;
  description: string;
  iconName: string;
}

export interface BadgeAward {
  id: string;
  badgeCode: BadgeCode;
  badgeLabel: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  eventDate: string;
  eventLocation: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  issuerName: string; // e.g. "GDG Addis"
  organizerName?: string;
  givenBy?: string;
  awardedBy: string;
  awardedAt: string;
  revokedAt?: string | null;
  organizerNote?: string | null;
  eventDescription?: string | null;
  eventTime?: string | null;
}

export interface AttendeeRosterItem {
  id: string;
  registrationId: string;
  attendeeId: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  registrationDate: string;
  status: 'Registered' | 'Checked in';
  checkInTime?: string;
  badges: BadgeCode[];
  answers?: Record<string, any>;
}

export interface SponsorReportData {
  eventId: string;
  eventTitle: string;
  eventDescription?: string;
  eventType: EventType;
  eventDate: string;
  eventLocation: string;
  organizerName: string;
  customQuestions?: any[];
  totalRegistered: number;
  totalAttended: number;
  attendanceRate: number;
  badgeDistribution: {
    attended: number;
    participant: number;
    winner: number;
    speaker: number;
  };
  registrationsOverTime: { date: string; count: number }[];
  hourlyCheckIns: { time?: string; hour?: string; count: number }[];
  attendees?: AttendeeRosterItem[];
  rolesBreakdown?: { role: string; count: number; percentage: number }[];
  topOrganizations?: { name: string; count: number }[];
  goalsBreakdown?: { goal: string; count: number; percentage: number }[];
  sampleInterests?: string[];
  aiNarrative?: {
    executiveSummary: string;
    eventBackground: string;
    objectives: string;
    deliveryNarrative?: string;
    audienceOverview: string;
    experienceNarrative?: string;
    organizationsNarrative: string;
    interestsNarrative: string;
    motivationNarrative: string;
    engagementNarrative: string;
    communityFindings?: string;
    attendeeVoice?: Array<{ quote: string; theme: string; explanation: string }>;
    audienceDeepAnalysis?: {
      profile: string;
      keyThemes: string;
      emergingInterests: string;
      communityOpportunities: string;
    };
    performanceAnalysis?: string;
    keyFindings: Array<{ title: string; evidence: string }>;
    structuredRecommendations?: {
      futureProgramming: string;
      mentorship: string;
      communityDevelopment: string;
    };
    partnerImpactSummary: string;
    // Legacy / convenience fields
    eventIntroduction?: string;
    demographicAnalysis?: string;
    thematicTakeaways?: string;
    impactHighlights?: string[];
    recommendations?: string[];
    strategicConclusion?: string;
  };
}
