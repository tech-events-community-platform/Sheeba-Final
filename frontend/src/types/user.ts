export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN' | 'SPONSOR' | 'EXHIBITOR';
export type ProfileVisibility = 'public' | 'private';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type OrganizerApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'more_info_needed';

export interface AttendeeStats {
  meetupsCount: number;
  workshopsCount: number;
  hackathonsCount: number;
  totalEventsAttended: number;
}

export interface OrganizerSocials {
  telegram?: string;
  x?: string;
  tiktok?: string;
  youtube?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  memberSince: string;
  bio?: string;
  visibility?: ProfileVisibility;
  phone?: string;
  organization?: string;
  companyName?: string;
  industryCategory?: string;
  companyWebsite?: string;
  companyPhone?: string;
  exhibitorDescription?: string;
  socials?: OrganizerSocials;
  approvalStatus?: ApprovalStatus;
  isOrganizer?: boolean;
  isExhibitor?: boolean;
  organizerApprovalStatus?: OrganizerApprovalStatus;
  applicantType?: 'Individual Organizer' | 'Organization / Institution';
  organizationType?: string;
  applicantPosition?: string;
  organizationDescription?: string;
  organizationWebsite?: string;
  organizationLogo?: string;
  personalIntroduction?: string;
  organizerRejectionReason?: string;
  organizerInfoRequestedNotes?: string;
  organizerAppliedAt?: string;
  hasExhibitorApplications?: boolean;
  roles?: UserRole[];
  isActive?: boolean;
  mustChangePassword?: boolean;
  hasPassword?: boolean;
  stats?: AttendeeStats;
  hasActiveScannerEvents?: boolean;
}

export interface OrganizerProfile {
  userId: string;
  organizationName: string;
  contactEmail: string;
  contactPhone?: string;
  bio?: string;
  socials?: OrganizerSocials;
}

