import type { RegistrationQuestion, PaymentDestination } from './event';

export type ExhibitorCallStatus = 'draft' | 'open' | 'closed';
export type ExhibitorPricingMode = 'per_sqm' | 'fixed';

export interface IExhibitorPaymentConfig {
  destinations?: PaymentDestination[];
  instructions?: string;
  allowChapa?: boolean;
  allowManual?: boolean;
}

export interface IExhibitorCall {
  id: string;
  eventId: string;
  isEnabled: boolean;
  status: ExhibitorCallStatus;
  description?: string;
  pricingMode: ExhibitorPricingMode;
  totalSpaceSqm: number;
  pricePerSqm: number;
  fixedFee: number;
  sheebaCutPercent: number;
  maxExhibitors: number;
  specifications?: string;
  customQuestions?: RegistrationQuestion[];
  paymentConfig?: IExhibitorPaymentConfig;
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
  // Dual-key snake_case support for network payload tolerance
  event_id?: string;
  is_enabled?: boolean;
  pricing_mode?: ExhibitorPricingMode;
  total_space_sqm?: number;
  price_per_sqm?: number;
  fixed_fee?: number;
  sheeba_cut_percent?: number;
  max_exhibitors?: number;
  custom_questions?: RegistrationQuestion[];
  payment_config?: IExhibitorPaymentConfig;
  application_deadline?: string;
  has_booth_numbers?: boolean;
  has_vendor_checkin?: boolean;
  created_at?: string;
  updated_at?: string;
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
  pricingMode?: ExhibitorPricingMode;
  spaceSqm: number;
  organizerPricePerSqm: number;
  sheebaCutPercent: number;
  totalOrganizerAmount: number;
  totalCutAmount: number;
  totalFinalAmount: number;
  questionAnswers?: Record<string, any>;
  boothNumber?: string;
  status: VendorStatus;
  rejectionReason?: string;
  paymentReference?: string;
  paymentStatus: VendorPaymentStatus;
  paidAt?: string;
  logoUrl?: string;
  websiteUrl?: string;
  latestReceipt?: IBoothReceipt | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}

export interface IBoothReceipt {
  id: string;
  transactionId: string;
  status: 'PENDING' | 'SETTLED' | 'FAILED' | 'REFUNDED';
  screenshotUrl: string;
  receiptUrl?: string;
  amount?: number;
  failureReason?: string | null;
  rejectionReason?: string | null;
  paymentMethod?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  transactionReference?: string | null;
  notes?: string | null;
}

export interface ISubmitBoothReceiptPayload {
  receiptUrl: string;
  transactionReference: string;
  paymentMethod?: string;
  notes?: string;
}

export interface IVerifyBoothReceiptPayload {
  confirmedCleared: true;
  paymentId?: string;
  notes?: string;
}

export interface IRejectBoothReceiptPayload {
  rejectionReason: string;
  paymentId?: string;
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
  pricingMode?: ExhibitorPricingMode;
  totalSpaceSqm: number;
  pricePerSqm: number;
  fixedFee?: number;
  maxExhibitors?: number;
  specifications?: string;
  customQuestions?: RegistrationQuestion[];
  paymentConfig?: IExhibitorPaymentConfig;
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
  specialRequirements?: string;
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
  pricingMode?: ExhibitorPricingMode;
  questionAnswers?: Record<string, any>;
}

export interface IBoothVisitorPayload {
  visitorName: string;
  visitorEmail?: string;
  visitorPhone?: string;
  notes?: string;
}

export interface IExhibitorBooth extends IEventVendor {
  venueName?: string;
  bannerUrl?: string;
  paymentConfig?: IExhibitorPaymentConfig | null;
  turnout?: {
    totalRegistered: number;
    totalCheckedIn: number;
    totalVisitorsLogged: number;
  };
}

