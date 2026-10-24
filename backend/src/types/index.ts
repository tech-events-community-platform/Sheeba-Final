import { Request } from 'express';

export type UserRole = 'attendee' | 'organizer' | 'admin' | 'sponsor' | 'exhibitor';
export type ProfileVisibility = 'public' | 'private';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type OrganizerApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface ISponsorRegistration {
  full_name: string;
  email: string;
  password: string;
  company_name: string;
  industry_category: string;
  company_phone: string;
  company_website?: string;
}

export interface IUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  bio?: string | null;
  organization?: string | null;
  company_name?: string | null;
  industry_category?: string | null;
  company_website?: string | null;
  company_phone?: string | null;
  exhibitor_description?: string | null;
  google_id?: string | null;
  avatar_url?: string | null;
  visibility: ProfileVisibility;
  member_since: string;
  is_active: boolean;
  approval_status: ApprovalStatus;
  is_organizer?: boolean;
  organizer_approval_status?: OrganizerApprovalStatus;
  organizer_bio?: string | null;
  organizer_socials?: Record<string, string> | null;
  must_change_password?: boolean;
  created_at: Date;
  updated_at: Date;
  // Computed stats
  stats?: {
    meetupsCount: number;
    workshopsCount: number;
    hackathonsCount: number;
    totalEventsAttended: number;
  };
}

export type IUserSafe = Omit<IUser, 'password_hash'>;

export type EventType = 'hackathon' | 'workshop' | 'meetup' | 'summit' | string;
export type EventStatus = 'open' | 'closed' | 'completed' | 'canceled' | 'postponed' | 'draft' | 'published';

export interface RegistrationQuestion {
  id: string;
  questionText: string;
  type?: string;
  options?: string[];
  isRequired: boolean;
  order?: number;
}

export interface PaymentDestination {
  id?: string;
  provider: string; // 'cbe', 'telebirr', 'awash', 'boa', etc.
  accountNumber: string;
  accountHolder?: string;
  label?: string;
}

export interface IEvent {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  event_type: EventType;
  category?: string;
  event_date: Date;
  end_date?: Date | null;
  start_time: string;
  end_time: string;
  time_str: string;
  location: string;
  venue_name?: string | null;
  capacity: number;
  status: EventStatus;
  is_paid: boolean;
  ticket_price: number;
  currency: string;
  share_link_token: string;
  custom_questions: RegistrationQuestion[];
  payment_methods?: PaymentDestination[];
  banner_url?: string | null;
  poster_image_url?: string | null;
  requires_approval?: boolean;
  is_publicized?: boolean;
  created_at: Date;
  updated_at: Date;
  // Computed / Joined fields
  registered_count?: number;
  checked_in_count?: number;
  organizer_name?: string;
  organizer_email?: string;
}

export interface ICheckIn {
  id: string;
  registration_id: string;
  event_id: string;
  user_id: string;
  approved_by: string;
  approved_at: Date;
  voided_at?: Date | null;
  voided_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export type RegistrationStatus = 'registered' | 'cancelled';
export type RegistrationApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface IRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  approval_status?: RegistrationApprovalStatus;
  answers: Record<string, any>;
  payment_reference?: string | null;
  payment_status?: string | null;
  registered_at: Date;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  event?: IEvent;
  user?: IUserSafe;
}

export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED' | 'Valid' | 'Used' | 'Cancelled' | 'Expired';

export interface ITicket {
  id: string;
  ticket_code: string;
  registration_id: string;
  event_id: string;
  user_id: string;
  qr_token: string;
  qr_code_data_url?: string | null;
  status: TicketStatus;
  is_paid: boolean;
  ticket_price: number;
  currency: string;
  expires_at?: Date | null;
  checked_in_at?: Date | null;
  checked_in_by?: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  event?: IEvent;
  user?: IUserSafe;
}

export type BadgeCode = 'attended' | 'participant' | 'winner' | 'speaker';

export interface IBadgeAward {
  id: string;
  badge_code: BadgeCode;
  badge_label: string;
  event_id: string;
  user_id: string;
  awarded_by: string;
  awarded_at: Date;
  revoked_at?: Date | null;
  revoked_by?: string | null;
  revocation_reason?: string | null;
  organizer_note?: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  event_title?: string;
  event_type?: EventType;
  event_date?: string;
  event_location?: string;
  attendee_name?: string;
  attendee_email?: string;
  issuer_name?: string;
}

export interface IPayment {
  id: string;
  transaction_id: string;
  event_id: string;
  user_id: string;
  amount: number;
  commission_amount: number;
  organizer_payout: number;
  currency: string;
  status: 'SETTLED' | 'FAILED' | 'PENDING' | 'REFUNDED';
  created_at: Date;
  updated_at: Date;
  // Joined fields
  event_title?: string;
  attendee_email?: string;
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
  approvalStatus?: RegistrationApprovalStatus;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  notificationStatus?: 'pending' | 'sent' | 'failed' | 'retry';
  notificationError?: string | null;
}


export interface SponsorReportData {
  eventId: string;
  eventTitle: string;
  eventDescription: string;
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
  registrationsOverTime: Array<{ date: string; count: number }>;
  hourlyCheckIns?: Array<{ hour: string; count: number }>;
  attendees: AttendeeRosterItem[];
  rolesBreakdown?: Array<{ role: string; count: number; percentage: number }>;
  topOrganizations?: Array<{ name: string; count: number }>;
  goalsBreakdown?: Array<{ goal: string; count: number; percentage: number }>;
  interestsBreakdown?: Array<{ name: string; count: number; percentage: number }>;
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
  customNotes?: string;
  isCustomized?: boolean;
  updatedAt?: string;
}

export interface IJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  mustChangePassword?: boolean;
}

export interface IQrTicketPayload {
  ticketId: string;
  eventId: string;
  exp?: number;
  userId?: string;
  issuedAt?: number;
}

export interface AuthRequest extends Request {
  user?: IJwtPayload;
}

export interface ISponsorshipPackage {
  id?: string;
  name: string;
  amount: number;
  perks: string;
}

export type SponsorshipApplicationStatus = 'OPEN' | 'UNDER_REVIEW' | 'FUNDED' | 'CLOSED';

export interface IEventSpeaker {
  name: string;
  role?: string;
  social?: string;
}

export interface IEventCoOrganizer {
  name: string;
  social?: string;
}

export interface IEventPastSponsor {
  name: string;
  website?: string;
}

export interface IEventPartner {
  name: string;
  social?: string;
}

export interface IApplicationAffiliations {
  speakers?: IEventSpeaker[];
  co_organizers?: IEventCoOrganizer[];
  past_sponsors?: IEventPastSponsor[];
  partners?: IEventPartner[];
}

export interface ISponsorshipApplication {
  id: string;
  organizer_id: string;
  event_title: string;
  event_type: string;
  category: string;
  expected_date: string;
  location: string;
  expected_attendees: number;
  target_audience: string;
  funding_goal: number;
  currency: string;
  description: string;
  packages: ISponsorshipPackage[];
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_telegram?: string;
  pitch_deck_url?: string;
  socials?: Record<string, string>;
  affiliations?: IApplicationAffiliations;
  status: SponsorshipApplicationStatus;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  organizer_name?: string;
  organizer_organization?: string;
  organizer_avatar?: string;
  interested_sponsors_count?: number;
}

export type SponsorshipDealStatus = 'INTERESTED' | 'DECLINED';

export interface ISponsorshipDeal {
  id: string;
  application_id: string;
  sponsor_id: string;
  status: SponsorshipDealStatus;
  package_name?: string;
  pledged_amount?: number;
  sponsor_notes?: string;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  application?: ISponsorshipApplication;
  sponsor?: IUserSafe;
}

// --- EXHIBITOR MODULE TYPES ---
export interface IExhibitorRegistration {
  full_name: string;
  email: string;
  password: string;
  company_name: string;
  industry_category: string;
  company_phone: string;
  company_website?: string;
  exhibitor_description?: string;
}

export type ExhibitorCallStatus = 'draft' | 'open' | 'closed';

export interface IExhibitorCall {
  id: string;
  event_id: string;
  is_enabled: boolean;
  status: ExhibitorCallStatus;
  description?: string;
  total_space_sqm: number;
  price_per_sqm: number;
  sheeba_cut_percent: number;
  max_exhibitors: number;
  specifications?: string;
  application_deadline?: Date | string;
  has_booth_numbers: boolean;
  has_vendor_checkin: boolean;
  created_at: Date;
  updated_at: Date;
  confirmed_vendors_count?: number;
  total_space_allocated?: number;
  event_title?: string;
  event_date?: Date;
  event_location?: string;
}

export type VendorSource = 'applied' | 'manual' | 'sponsorship';
export type VendorStatus = 'pending' | 'accepted_awaiting_payment' | 'confirmed' | 'rejected' | 'cancelled';
export type VendorPaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface IEventVendor {
  id: string;
  event_id: string;
  exhibitor_call_id?: string;
  user_id?: string;
  source: VendorSource;
  business_name: string;
  category?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  showcase_description?: string;
  special_requirements?: string;
  space_sqm: number;
  organizer_price_per_sqm: number;
  sheeba_cut_percent: number;
  total_organizer_amount: number;
  total_cut_amount: number;
  total_final_amount: number;
  booth_number?: string;
  status: VendorStatus;
  rejection_reason?: string;
  payment_reference?: string;
  payment_status: VendorPaymentStatus;
  paid_at?: Date | string;
  logo_url?: string;
  website_url?: string;
  created_at: Date;
  updated_at: Date;
  event_title?: string;
  event_date?: Date;
  event_location?: string;
}

export interface IExhibitorBoothVisitor {
  id: string;
  vendor_id: string;
  visitor_name: string;
  visitor_email?: string;
  visitor_phone?: string;
  notes?: string;
  created_at: Date;
}
