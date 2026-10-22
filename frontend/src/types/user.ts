export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN' | 'SPONSOR';
export type ProfileVisibility = 'public' | 'private';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type OrganizerApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

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
  socials?: OrganizerSocials;
  approvalStatus?: ApprovalStatus;
  isOrganizer?: boolean;
  organizerApprovalStatus?: OrganizerApprovalStatus;
  roles?: UserRole[];
  isActive?: boolean;
  mustChangePassword?: boolean;
  stats?: AttendeeStats;
}

export interface OrganizerProfile {
  userId: string;
  organizationName: string;
  contactEmail: string;
  contactPhone?: string;
  bio?: string;
  socials?: OrganizerSocials;
}

