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
  created_at: string;
  updated_at: string;
  organizer_name?: string;
  organizer_organization?: string;
  organizer_avatar?: string;
  interested_sponsors_count?: number;
}

export type SponsorshipDealStatus = 'INTERESTED' | 'DECLINED' | 'DEAL_ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface ISponsorshipDeal {
  id: string;
  application_id: string;
  sponsor_id: string;
  status: SponsorshipDealStatus;
  package_name?: string;
  pledged_amount?: number;
  sponsor_notes?: string;
  allow_attendee_sharing?: boolean;
  created_at: string;
  updated_at: string;
  application?: ISponsorshipApplication;
  sponsor?: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
    companyPhone?: string;
  };
}

export interface ISponsorPublicProfile {
  id: string;
  name: string;
  representativeName: string;
  email: string;
  companyName?: string;
  industryCategory?: string;
  website?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  memberSince?: string;
}

export interface ISponsorRelationshipItem {
  deal_id: string;
  application_id: string;
  sponsor_id: string;
  deal_status: SponsorshipDealStatus;
  package_name?: string | null;
  pledged_amount?: number | null;
  sponsor_notes?: string | null;
  allow_attendee_sharing?: boolean;
  interest_expressed_at: string;
  deal_updated_at: string;
  application: {
    id: string;
    event_title: string;
    event_type?: string;
    category?: string;
    expected_date: string;
    location: string;
    expected_attendees?: number;
    funding_goal?: number;
    currency?: string;
    status?: string;
  };
  sponsor: {
    id: string;
    name: string;
    representative_name: string;
    email: string;
    phone?: string;
    company_name?: string;
    industry_category?: string;
    company_website?: string;
    company_phone?: string;
    avatar_url?: string;
    bio?: string;
  };
}

export interface ISponsorEventItem {
  deal_id: string;
  application_id: string;
  event_title: string;
  event_type?: string;
  category?: string;
  expected_date: string;
  location: string;
  expected_attendees?: number;
  funding_goal?: number;
  currency?: string;
  package_name?: string | null;
  pledged_amount?: number | null;
  deal_status: SponsorshipDealStatus;
  allow_attendee_sharing: boolean;
  checked_in_count?: number;
  organizer?: {
    name: string;
    organization?: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ISponsorCheckedInAttendeeItem {
  attendee_id: string;
  attendee_name: string;
  checked_in_at: string;
  record_status?: 'NOT_RECORDED' | 'RECORDED';
}
