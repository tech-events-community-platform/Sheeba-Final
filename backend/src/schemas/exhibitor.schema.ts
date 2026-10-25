import { z } from 'zod';
import { registrationQuestionSchema, paymentDestinationSchema } from './event.schema';

export const exhibitorCallStatusEnum = z.enum(['draft', 'open', 'closed'], {
  message: "Status must be 'draft', 'open', or 'closed'.",
});

export const exhibitorPricingModeEnum = z.enum(['per_sqm', 'fixed'], {
  message: "Pricing mode must be 'per_sqm' or 'fixed'.",
});

export const exhibitorPaymentConfigSchema = z
  .object({
    destinations: z.array(paymentDestinationSchema).optional().default([]),
    instructions: z.string().trim().optional().nullable(),
    allowChapa: z.boolean().optional().default(true),
    allowManual: z.boolean().optional().default(false),
  })
  .optional()
  .default({
    destinations: [],
    allowChapa: true,
    allowManual: false,
  });

export const upsertExhibitorCallSchema = z
  .object({
    isEnabled: z.boolean({ message: 'isEnabled must be a boolean.' }).optional(),
    is_enabled: z.boolean().optional(),
    status: exhibitorCallStatusEnum.default('draft'),
    description: z.string().optional().nullable(),
    pricingMode: exhibitorPricingModeEnum.optional().default('per_sqm'),
    pricing_mode: exhibitorPricingModeEnum.optional(),
    totalSpaceSqm: z.coerce
      .number({ message: 'Total space must be a number.' })
      .min(0, { message: 'Total space cannot be negative.' })
      .default(0),
    total_space_sqm: z.coerce.number().optional(),
    pricePerSqm: z.coerce
      .number({ message: 'Price per sqm must be a number.' })
      .min(0, { message: 'Price cannot be negative.' })
      .default(0),
    price_per_sqm: z.coerce.number().optional(),
    fixedFee: z.coerce
      .number({ message: 'Fixed fee must be a number.' })
      .min(0, { message: 'Fixed fee cannot be negative.' })
      .default(0),
    fixed_fee: z.coerce.number().optional(),
    sheebaCutPercent: z.coerce.number().min(0).max(100).optional().default(30),
    sheeba_cut_percent: z.coerce.number().optional(),
    maxExhibitors: z.coerce.number().int().min(1).optional().default(10),
    max_exhibitors: z.coerce.number().optional(),
    specifications: z.string().optional().nullable(),
    customQuestions: z.array(registrationQuestionSchema).optional().default([]),
    custom_questions: z.array(registrationQuestionSchema).optional(),
    paymentConfig: exhibitorPaymentConfigSchema,
    payment_config: exhibitorPaymentConfigSchema,
    applicationDeadline: z.string().optional().nullable(),
    application_deadline: z.string().optional().nullable(),
    hasBoothNumbers: z.boolean().optional().default(false),
    has_booth_numbers: z.boolean().optional(),
    hasVendorCheckin: z.boolean().optional().default(false),
    has_vendor_checkin: z.boolean().optional(),
  })
  .transform((data) => {
    const isEnabled = data.isEnabled ?? data.is_enabled ?? false;
    const pricingMode = data.pricingMode || data.pricing_mode || 'per_sqm';
    const totalSpaceSqm = data.totalSpaceSqm ?? data.total_space_sqm ?? 0;
    const pricePerSqm = data.pricePerSqm ?? data.price_per_sqm ?? 0;
    const fixedFee = data.fixedFee ?? data.fixed_fee ?? 0;
    const sheebaCutPercent = data.sheebaCutPercent ?? data.sheeba_cut_percent ?? 30;
    const maxExhibitors = data.maxExhibitors ?? data.max_exhibitors ?? 10;
    const customQuestions =
      data.customQuestions && data.customQuestions.length > 0
        ? data.customQuestions
        : data.custom_questions || [];
    const paymentConfig = data.paymentConfig || data.payment_config || {};
    const applicationDeadline = data.applicationDeadline || data.application_deadline || null;
    const hasBoothNumbers = data.hasBoothNumbers ?? data.has_booth_numbers ?? false;
    const hasVendorCheckin = data.hasVendorCheckin ?? data.has_vendor_checkin ?? false;

    return {
      ...data,
      isEnabled,
      pricingMode,
      totalSpaceSqm,
      pricePerSqm,
      fixedFee,
      sheebaCutPercent,
      maxExhibitors,
      customQuestions,
      paymentConfig,
      applicationDeadline,
      hasBoothNumbers,
      hasVendorCheckin,
    };
  });

export const addManualVendorSchema = z.object({
  businessName: z.string().trim().min(1, { message: 'Business name is required.' }),
  category: z.string().trim().optional().nullable(),
  contactName: z.string().trim().min(1, { message: 'Contact person name is required.' }),
  contactEmail: z.string().trim().email({ message: 'Valid contact email is required.' }),
  contactPhone: z.string().trim().optional().nullable(),
  showcaseDescription: z.string().optional().nullable(),
  specialRequirements: z.string().optional().nullable(),
  spaceSqm: z.coerce.number().min(0.5, { message: 'Space must be at least 0.5 sqm.' }).default(1),
  boothNumber: z.string().trim().optional().nullable(),
  source: z.enum(['manual', 'sponsorship']).default('manual'),
  logoUrl: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
});

export const updateVendorSchema = addManualVendorSchema.partial().extend({
  status: z.enum(['pending', 'accepted_awaiting_payment', 'confirmed', 'rejected', 'cancelled']).optional(),
  rejectionReason: z.string().optional().nullable(),
});

export const vendorQuerySchema = z.object({
  search: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
});

export const applyExhibitorSchema = z
  .object({
    businessName: z.string().trim().min(1, { message: 'Business name is required.' }),
    category: z.string().trim().optional().nullable(),
    contactName: z.string().trim().min(1, { message: 'Contact person name is required.' }),
    contactEmail: z.string().trim().email({ message: 'Valid contact email is required.' }),
    contactPhone: z.string().trim().optional().nullable(),
    showcaseDescription: z.string().trim().min(1, { message: 'Showcase description is required.' }),
    specialRequirements: z.string().trim().optional().nullable(),
    spaceSqm: z.coerce.number().min(0.5, { message: 'Requested space must be at least 0.5 sqm.' }),
    logoUrl: z.string().trim().optional().nullable(),
    websiteUrl: z.string().trim().optional().nullable(),
    pricingMode: exhibitorPricingModeEnum.optional(),
    pricing_mode: exhibitorPricingModeEnum.optional(),
    questionAnswers: z.record(z.string(), z.any()).optional().default({}),
    question_answers: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    ...data,
    pricingMode: data.pricingMode || data.pricing_mode,
    questionAnswers:
      data.questionAnswers && Object.keys(data.questionAnswers).length > 0
        ? data.questionAnswers
        : data.question_answers || {},
  }));

export const createVisitorSchema = z.object({
  visitorName: z.string().trim().min(1, { message: 'Visitor name is required.' }),
  visitorEmail: z.string().trim().email({ message: 'Valid visitor email is required.' }).optional().nullable().or(z.literal('')),
  visitorPhone: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const payBoothSchema = z.object({
  paymentMethod: z.string().trim().optional().default('cbe'),
  paymentReference: z.string().trim().optional(),
  screenshotUrl: z.string().trim().optional().nullable(),
  screenshotBase64: z.string().trim().optional().nullable(),
  transactionId: z.string().trim().optional(),
});

export const submitBoothReceiptSchema = z.object({
  receiptUrl: z.string().trim().url({ message: 'Valid receipt URL is required.' }),
  transactionReference: z.string().trim().min(2, { message: 'Transaction reference is required (min 2 chars).' }).max(100),
  paymentMethod: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const verifyBoothReceiptSchema = z.object({
  confirmedCleared: z.literal(true, {
    message: 'You must independently verify and confirm that funds have cleared in your account.',
  }),
  paymentId: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const rejectBoothReceiptSchema = z.object({
  rejectionReason: z.string().trim().min(3, { message: 'Rejection reason must be at least 3 characters.' }).max(500),
  paymentId: z.string().trim().optional().nullable(),
});

