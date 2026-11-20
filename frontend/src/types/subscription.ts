export type SubscriptionPlanName =
  | 'Starter (1 Event)'
  | 'Growth (3 Events)'
  | 'Enterprise (5 Events)'
  | 'Custom Agreement'
  | string;

export type SubscriptionPaymentStatus = 'paid' | 'pending' | 'waived' | 'overdue';
export type SubscriptionStatus = 'active' | 'suspended' | 'expired' | 'depleted';
export type AllowanceChangeType =
  | 'INITIAL_ASSIGNMENT'
  | 'ALLOWANCE_INCREASE'
  | 'ALLOWANCE_DECREASE'
  | 'CREDIT_GRANT'
  | 'PLAN_CHANGE'
  | 'STATUS_CHANGE';

export interface OrganizerSubscription {
  id: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string;
  organization: string;
  planName: SubscriptionPlanName;
  maxEvents: number;
  eventsUsed: number;
  remainingEvents: number;
  paymentStatus: SubscriptionPaymentStatus;
  subscriptionStatus: SubscriptionStatus;
  agreementReference?: string;
  notes?: string;
  assignedByName?: string;
  validUntil?: string;
  approvalStatus?: string;
  isActive: boolean;
  registeredAt: string;
  updatedAt: string;
}

export interface OrganizerAllowanceHistory {
  id: string;
  organizerId: string;
  changedBy?: string;
  changedByName?: string;
  changedByEmail?: string;
  previousMaxEvents: number;
  newMaxEvents: number;
  previousPlan?: string;
  newPlan?: string;
  changeType: AllowanceChangeType;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PlatformAttendee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  isActive: boolean;
  registrationsCount: number;
  checkInsCount: number;
  badgesCount: number;
  registeredAt: string;
}

export interface AttendeeRegistrationRecord {
  registrationId: string;
  registeredAt: string;
  registrationStatus: string;
  approvalStatus: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventType: string;
  location: string;
  organizerName: string;
  ticketCode?: string;
  ticketStatus?: string;
  isCheckedIn: boolean;
  checkInTime?: string;
}
