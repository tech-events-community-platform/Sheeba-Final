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
  approved_sponsors_count?: number;
}

export type SponsorshipDealStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INTERESTED' | 'DECLINED';

export interface ISponsorshipDeal {
  id: string;
  application_id: string;
  sponsor_id: string;
  status: SponsorshipDealStatus;
  package_name?: string;
  pledged_amount?: number;
  sponsor_notes?: string;
  proposal_message?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  application?: ISponsorshipApplication;
  sponsor?: {
    id: string;
    representative?: string;
    full_name?: string;
    email: string;
    phone?: string;
    company_name?: string;
    company_phone?: string;
    company_website?: string;
    company_description?: string;
    industry_category?: string;
    logo?: string;
    avatar_url?: string;
  };
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface IApprovedPitchSponsor {
  dealId: string;
  packageName?: string;
  pledgedAmount: number;
  proposalMessage?: string;
  reviewedAt?: string;
  applicationDate?: string;
  sponsor: {
    id: string;
    representativeName: string;
    contactEmail: string;
    phone?: string;
    companyName: string;
    companyWebsite?: string;
    companyDescription?: string;
    companyLogo?: string;
    industryCategory?: string;
  };
  deliverables?: ISponsorDeliverable | null;
}

export interface ISponsorDeliverable {
  id?: string;
  dealId?: string | null;
  sponsorId?: string;
  companyName: string;
  website?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  mediaKitUrl?: string;
  bio?: string;
  boothPreference?: string;
  avRequirements?: string;
  ticketVouchersNeeded?: string;
  repName: string;
  repTitle: string;
  repPhone: string;
  repEmail: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'FULFILLED';
  packageName?: string;
  dealStatus?: string;
  pitchTitle?: string;
  isDefaultTemplate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
