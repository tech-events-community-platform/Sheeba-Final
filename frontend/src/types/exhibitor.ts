export type ExhibitorCallStatus = 'draft' | 'open' | 'closed';

export interface IExhibitorCall {
  id: string;
  eventId: string;
  isEnabled: boolean;
  status: ExhibitorCallStatus;
  description?: string;
  totalSpaceSqm: number;
  pricePerSqm: number;
  sheebaCutPercent: number;
  maxExhibitors: number;
  specifications?: string;
  applicationDeadline?: string;
  hasBoothNumbers: boolean;
  hasVendorCheckin: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed / joined fields
  confirmedVendorsCount?: number;
  totalSpaceAllocated?: number;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventType?: string;
}

export type VendorSource = 'applied' | 'manual' | 'sponsorship';
export type VendorStatus = 'pending' | 'accepted_awaiting_payment' | 'confirmed' | 'rejected' | 'cancelled';
export type VendorPaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface IEventVendor {
  id: string;
  eventId: string;
  exhibitorCallId?: string;
  userId?: string;
  source: VendorSource;
  businessName: string;
  category?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  showcaseDescription?: string;
  specialRequirements?: string;
  spaceSqm: number;
  organizerPricePerSqm: number;
  sheebaCutPercent: number;
  totalOrganizerAmount: number;
  totalCutAmount: number;
  totalFinalAmount: number;
  boothNumber?: string;
  status: VendorStatus;
  rejectionReason?: string;
  paymentReference?: string;
  paymentStatus: VendorPaymentStatus;
  paidAt?: string;
  logoUrl?: string;
  websiteUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}

export interface IExhibitorBoothVisitor {
  id: string;
  vendorId: string;
  visitorName: string;
  visitorEmail?: string;
  visitorPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface IExhibitorCallUpsertPayload {
  isEnabled: boolean;
  status: ExhibitorCallStatus;
  description?: string;
  totalSpaceSqm: number;
  pricePerSqm: number;
  maxExhibitors?: number;
  specifications?: string;
  applicationDeadline?: string;
  hasBoothNumbers?: boolean;
  hasVendorCheckin?: boolean;
}

export interface IManualVendorPayload {
  businessName: string;
  category?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  showcaseDescription?: string;
  spaceSqm: number;
  boothNumber?: string;
  source: 'manual' | 'sponsorship';
  logoUrl?: string;
  websiteUrl?: string;
}

export interface IExhibitorApplicationPayload {
  spaceSqm: number;
  businessName: string;
  category: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  showcaseDescription: string;
  specialRequirements?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

