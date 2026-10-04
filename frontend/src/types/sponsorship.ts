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

export type SponsorshipDealStatus = 'INTERESTED' | 'DECLINED';

export interface ISponsorshipDeal {
  id: string;
  application_id: string;
  sponsor_id: string;
  status: SponsorshipDealStatus;
  package_name?: string;
  pledged_amount?: number;
  sponsor_notes?: string;
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
