import { z } from 'zod';

/**
 * Deal status enum for sponsorship deals pipeline and formal applications
 */
export const dealStatusEnum = z.enum(
  ['INTERESTED', 'DECLINED', 'DEAL_ACCEPTED', 'REJECTED', 'WITHDRAWN', 'PENDING', 'APPROVED'],
  {
    message: "Status must be 'INTERESTED', 'DECLINED', 'DEAL_ACCEPTED', 'REJECTED', 'WITHDRAWN', 'PENDING', or 'APPROVED'.",
  }
);

export type DealStatusInput = z.infer<typeof dealStatusEnum>;

/**
 * Sponsorship package tier schema
 */
export const sponsorshipPackageSchema = z.object({
  name: z.string().trim().min(1, { message: 'Package name is required.' }),
  amount: z.coerce
    .number({ message: 'Package amount must be a number.' })
    .positive({ message: 'Package amount must be greater than 0.' }),
  perks: z.string().trim().min(1, { message: 'Package perks are required.' }),
});

export type SponsorshipPackageInput = z.infer<typeof sponsorshipPackageSchema>;

/**
 * Social link item schema (array format)
 */
export const socialsItemSchema = z.object({
  platform: z.string().trim().min(1, { message: 'Social platform name cannot be empty.' }),
  url: z.string({ message: 'Social link must be a string.' }),
});

/**
 * Socials record schema (key-value format)
 */
export const socialsRecordSchema = z.record(
  z.string().trim().min(1, { message: 'Social platform name cannot be empty.' }),
  z.string({ message: 'Social link must be a string.' })
);

/**
 * Flexible socials schema supporting both Record<string, string> and Array<{platform, url}>
 */
export const socialsSchema = z
  .union([
    socialsRecordSchema,
    z.array(socialsItemSchema).transform((arr) => {
      const rec: Record<string, string> = {};
      arr.forEach((item) => {
        if (item.platform && item.url) {
          rec[item.platform] = item.url;
        }
      });
      return rec;
    }),
  ])
  .optional();

/**
 * Schema for POST /api/sponsorships/applications (B-44)
 */
export const createApplicationSchema = z.object({
  event_title: z.string().trim().min(1, { message: 'Event title is required.' }),
  event_type: z.string().trim().optional(),
  category: z.string().trim().optional(),
  expected_date: z.string().trim().min(1, { message: 'Expected date is required.' }),
  location: z.string().trim().min(1, { message: 'Location is required.' }),
  expected_attendees: z.coerce
    .number({ message: 'Expected attendees must be a number.' })
    .int({ message: 'Expected attendees must be an integer.' })
    .positive({ message: 'Expected attendees must be a positive integer.' })
    .optional(),
  target_audience: z.string().trim().optional(),
  funding_goal: z.coerce
    .number({ message: 'Funding goal must be a number.' })
    .positive({ message: 'Funding goal must be greater than 0.' }),
  currency: z.string().trim().optional(),
  description: z.string().trim().optional(),
  contact_name: z.string().trim().min(1, { message: 'Contact name is required.' }),
  contact_phone: z.string().trim().min(1, { message: 'Contact phone is required.' }),
  contact_email: z.string().trim().email({ message: 'Please provide a valid contact email address.' }),
  contact_telegram: z.string().trim().optional().nullable(),
  pitch_deck_url: z
    .string()
    .trim()
    .url({ message: 'Pitch deck URL must be a valid URL.' })
    .or(z.literal(''))
    .optional()
    .nullable(),
  packages: z.array(sponsorshipPackageSchema).optional(),
  socials: socialsSchema,
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

/**
 * Schema for GET /api/sponsorships/explore query parameters (B-46)
 */
export const exploreApplicationsQuerySchema = z.object({
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  minBudget: z.coerce
    .number({ message: 'minBudget must be a valid number.' })
    .min(0, { message: 'minBudget must be greater than or equal to 0.' })
    .optional(),
  maxBudget: z.coerce
    .number({ message: 'maxBudget must be a valid number.' })
    .min(0, { message: 'maxBudget must be greater than or equal to 0.' })
    .optional(),
});

export type ExploreApplicationsQueryInput = z.infer<typeof exploreApplicationsQuerySchema>;

/**
 * Schema for POST /api/sponsorships/deals (Formal application or legacy interest)
 */
export const createDealSchema = z.object({
  applicationId: z.string().trim().min(1, { message: 'Application ID is required.' }),
  status: dealStatusEnum.optional().default('PENDING'),
  package_name: z.string().trim().optional().nullable(),
  pledged_amount: z.coerce
    .number({ message: 'Pledged amount must be a number.' })
    .min(0, { message: 'Pledged amount must be greater than or equal to 0.' })
    .optional()
    .nullable(),
  proposal_message: z.string().trim().optional().nullable(),
  sponsor_notes: z.string({ message: 'Sponsor notes must be a string.' }).optional().nullable(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

/**
 * Strict schema for formal sponsor application submission
 */
export const submitSponsorshipApplicationSchema = z.object({
  applicationId: z.string().trim().min(1, { message: 'Sponsorship pitch ID is required.' }),
  package_name: z.string().trim().min(1, { message: 'Sponsorship package name is required.' }),
  pledged_amount: z.coerce
    .number({ message: 'Proposed amount must be a number.' })
    .positive({ message: 'Proposed amount must be greater than 0.' }),
  proposal_message: z
    .string()
    .trim()
    .min(10, { message: 'Proposal message must be at least 10 characters long explaining your interest.' })
    .max(2000, { message: 'Proposal message cannot exceed 2000 characters.' }),
  sponsor_notes: z.string().trim().optional().nullable(),
});

export type SubmitSponsorshipApplicationInput = z.infer<typeof submitSponsorshipApplicationSchema>;

/**
 * Schema for admin rejecting a sponsorship application
 */
export const adminRejectApplicationSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(5, { message: 'A rejection reason of at least 5 characters is required.' })
    .max(1000, { message: 'Rejection reason cannot exceed 1000 characters.' }),
});

export type AdminRejectApplicationInput = z.infer<typeof adminRejectApplicationSchema>;

/**
 * Schema for admin approving a sponsorship application
 */
export const adminApproveApplicationSchema = z.object({
  notes: z.string().trim().optional().nullable(),
});

export type AdminApproveApplicationInput = z.infer<typeof adminApproveApplicationSchema>;

/**
 * Schema for admin querying sponsorship applications
 */
export const adminApplicationsQuerySchema = z.object({
  status: dealStatusEnum.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type AdminApplicationsQueryInput = z.infer<typeof adminApplicationsQuerySchema>;

/**
 * Schema for GET /api/sponsorships/sponsor/my-deals query parameters (B-49)
 */
export const sponsorDealsQuerySchema = z.object({
  status: dealStatusEnum.optional(),
});

export type SponsorDealsQueryInput = z.infer<typeof sponsorDealsQuerySchema>;

/**
 * Sponsor-updatable deal status enum: Only INTERESTED or DECLINED
 * Sponsors must NEVER be able to set PENDING, APPROVED, or REJECTED.
 */
export const sponsorUpdatableDealStatusEnum = z.enum(['INTERESTED', 'DECLINED'], {
  message: "Sponsors may only set status to 'INTERESTED' or 'DECLINED'. 'PENDING', 'APPROVED', and 'REJECTED' are forbidden.",
});

export type SponsorUpdatableDealStatusInput = z.infer<typeof sponsorUpdatableDealStatusEnum>;

/**
 * Schema for PATCH /api/sponsorships/deals/:id (B-50)
 */
export const updateDealSchema = z.object({
  status: sponsorUpdatableDealStatusEnum.optional(),
  sponsor_notes: z.string({ message: 'Sponsor notes must be a string.' }).optional().nullable(),
  proposal_message: z.string().trim().optional().nullable(),
});

export type UpdateDealInput = z.infer<typeof updateDealSchema>;

/**
/**
 * Phase 3: Sponsor Questionnaire Schemas
 */
export const sponsorQuestionTypeEnum = z.enum([
  'SHORT_TEXT',
  'LONG_TEXT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'RATING',
]);

export const sponsorQuestionSchema = z.object({
  id: z.string().trim().min(1).default(() => `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
  question: z.string().trim().min(1, { message: 'Question prompt cannot be empty.' }),
  type: sponsorQuestionTypeEnum,
  options: z.array(z.string().trim()).optional().default([]),
  required: z.boolean().default(false),
});

export const saveSponsorQuestionnaireSchema = z.object({
  title: z.string().trim().min(1).optional().default('Attendee Engagement Questionnaire'),
  questions: z.array(sponsorQuestionSchema).min(1, { message: 'At least one question is required.' }),
});

export type SaveSponsorQuestionnaireInput = z.infer<typeof saveSponsorQuestionnaireSchema>;

/**
 * Phase 3: Record Attendee Questionnaire Response Schema
 */
export const recordAttendeeResponseSchema = z.object({
  answers: z.record(z.string(), z.any()),
  status: z.enum(['COMPLETED', 'DRAFT']).optional().default('COMPLETED'),
});

export type RecordAttendeeResponseInput = z.infer<typeof recordAttendeeResponseSchema>;

/**
 * Deliverables Schemas (Stage 4)
 */
export const deliverableStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'FULFILLED']);

export const saveDeliverableSchema = z.object({
  deal_id: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  company_name: z.string().trim().min(1, { message: 'Company name is required.' }).optional(),
  companyName: z.string().trim().min(1, { message: 'Company name is required.' }).optional(),
  website: z.string().trim().url({ message: 'Website must be a valid URL.' }).optional().or(z.literal('')).nullable(),
  tagline: z.string().trim().max(255).optional().nullable(),
  primary_color: z.string().trim().max(50).optional().nullable(),
  primaryColor: z.string().trim().max(50).optional().nullable(),
  secondary_color: z.string().trim().max(50).optional().nullable(),
  secondaryColor: z.string().trim().max(50).optional().nullable(),
  media_kit_url: z.string().trim().url({ message: 'Media kit URL must be a valid URL.' }).optional().or(z.literal('')).nullable(),
  mediaKitUrl: z.string().trim().url({ message: 'Media kit URL must be a valid URL.' }).optional().or(z.literal('')).nullable(),
  bio: z.string().trim().optional().nullable(),
  booth_preference: z.string().trim().optional().nullable(),
  boothPreference: z.string().trim().optional().nullable(),
  av_requirements: z.string().trim().optional().nullable(),
  avRequirements: z.string().trim().optional().nullable(),
  ticket_vouchers_needed: z.string().trim().optional().nullable(),
  ticketVouchersNeeded: z.string().trim().optional().nullable(),
  rep_name: z.string().trim().min(1, { message: 'Representative name is required.' }).optional(),
  repName: z.string().trim().min(1, { message: 'Representative name is required.' }).optional(),
  rep_title: z.string().trim().min(1, { message: 'Representative title is required.' }).optional(),
  repTitle: z.string().trim().min(1, { message: 'Representative title is required.' }).optional(),
  rep_phone: z.string().trim().min(1, { message: 'Representative phone is required.' }).optional(),
  repPhone: z.string().trim().min(1, { message: 'Representative phone is required.' }).optional(),
  rep_email: z.string().trim().email({ message: 'Representative email must be valid.' }).optional(),
  repEmail: z.string().trim().email({ message: 'Representative email must be valid.' }).optional(),
  status: deliverableStatusEnum.optional().default('SUBMITTED'),
});

export type SaveDeliverableInput = z.infer<typeof saveDeliverableSchema>;
