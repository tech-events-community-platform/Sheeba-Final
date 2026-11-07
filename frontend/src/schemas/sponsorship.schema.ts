import { z } from 'zod';

/**
 * Deal status enum for sponsorship pipeline and formal applications
 */
export const dealStatusEnum = z.enum(
  ['PENDING', 'APPROVED', 'REJECTED', 'INTERESTED', 'DECLINED'],
  {
    message: "Status must be 'PENDING', 'APPROVED', 'REJECTED', 'INTERESTED', or 'DECLINED'.",
  }
);

/**
 * Sponsorship package tier form schema
 */
export const sponsorshipPackageFormSchema = z.object({
  name: z.string().trim().min(1, { message: 'Package name is required.' }),
  amount: z.coerce
    .number({ message: 'Package amount must be a number.' })
    .positive({ message: 'Package amount must be greater than 0.' }),
  perks: z.string().trim().min(1, { message: 'Package perks are required.' }),
});

export type SponsorshipPackageFormData = z.infer<typeof sponsorshipPackageFormSchema>;

/**
 * Social media item schema
 */
export const socialItemFormSchema = z.object({
  platform: z.string().trim().optional(),
  url: z.string().trim().optional(),
});

/**
 * Schema for ApplyToSponsorsPage pitch submission
 */
export const applyToSponsorsFormSchema = z.object({
  event_title: z.string().trim().min(1, { message: 'Please provide an event title.' }),
  event_type: z.string().trim().optional(),
  category: z.string().trim().optional(),
  expected_date: z.string().trim().min(1, { message: 'Expected date is required.' }),
  location: z.string().trim().min(1, { message: 'Location is required.' }),
  expected_attendees: z.coerce
    .number({ message: 'Expected attendees must be a number.' })
    .int({ message: 'Expected attendees must be an integer.' })
    .positive({ message: 'Expected attendees must be a positive integer.' }),
  target_audience: z.string().trim().optional(),
  funding_goal: z.coerce
    .number({ message: 'Funding goal must be a number.' })
    .positive({ message: 'Funding goal must be greater than 0.' }),
  currency: z.string().trim().optional(),
  description: z.string().trim().optional(),
  contact_name: z.string().trim().optional(),
  contact_phone: z.string().trim().min(1, { message: 'Direct phone number is required.' }),
  contact_email: z.string().trim().email({ message: 'Please provide a valid contact email address.' }),
  contact_telegram: z.string().trim().optional().nullable(),
  pitch_deck_url: z
    .string()
    .trim()
    .url({ message: 'Pitch deck URL must be a valid URL.' })
    .or(z.literal(''))
    .optional()
    .nullable(),
  packages: z.array(sponsorshipPackageFormSchema).optional(),
  socials: z
    .union([
      z.array(socialItemFormSchema),
      z.record(z.string(), z.string()),
    ])
    .optional(),
});

export type ApplyToSponsorsFormData = z.infer<typeof applyToSponsorsFormSchema>;

/**
 * Filter schema for SponsorExplorePage
 */
export const sponsorExploreFilterSchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  minBudget: z.coerce
    .number({ message: 'minBudget must be a valid number.' })
    .min(0, { message: 'minBudget must be greater than or equal to 0.' })
    .optional(),
  maxBudget: z.coerce
    .number({ message: 'maxBudget must be a valid number.' })
    .min(0, { message: 'maxBudget must be greater than or equal to 0.' })
    .optional(),
});

export type SponsorExploreFilterData = z.infer<typeof sponsorExploreFilterSchema>;

/**
 * Formal sponsorship application schema for SponsorApplicationDetailPage
 */
export const submitFormalSponsorshipApplicationSchema = z.object({
  applicationId: z.string().trim().min(1, { message: 'Sponsorship pitch ID is required.' }),
  package_name: z.string().trim().min(1, { message: 'Please select a sponsorship package.' }),
  pledged_amount: z.coerce
    .number({ message: 'Proposed amount must be a number.' })
    .positive({ message: 'Proposed amount must be greater than 0 ETB.' }),
  proposal_message: z
    .string()
    .trim()
    .min(10, { message: 'Proposal message must be at least 10 characters long explaining your interest.' })
    .max(2000, { message: 'Proposal message cannot exceed 2000 characters.' }),
  sponsor_notes: z.string().trim().optional().nullable(),
});

export type SubmitFormalSponsorshipApplicationData = z.infer<typeof submitFormalSponsorshipApplicationSchema>;

/**
 * Express interest schema for legacy fallback
 */
export const sponsorExpressInterestSchema = z.object({
  applicationId: z.string().trim().min(1, { message: 'Application ID is required.' }),
  status: dealStatusEnum.optional().default('PENDING'),
  package_name: z.string().trim().optional().nullable(),
  pledged_amount: z.coerce
    .number({ message: 'Pledged amount must be a number.' })
    .min(0, { message: 'Pledged amount must be greater than or equal to 0.' })
    .optional()
    .nullable(),
  proposal_message: z.string().trim().optional().nullable(),
});

export type SponsorExpressInterestData = z.infer<typeof sponsorExpressInterestSchema>;

/**
 * Update deal schema for SponsorDealsPage
 */
export const sponsorDealNotesSchema = z.object({
  status: dealStatusEnum,
  sponsor_notes: z.string({ message: 'Sponsor notes must be a string.' }).optional().nullable(),
});

export type SponsorDealNotesData = z.infer<typeof sponsorDealNotesSchema>;

/**
 * Admin reject application schema
 */
export const adminRejectApplicationSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(5, { message: 'A rejection reason of at least 5 characters is required.' })
    .max(1000, { message: 'Rejection reason cannot exceed 1000 characters.' }),
});

export type AdminRejectApplicationData = z.infer<typeof adminRejectApplicationSchema>;

/**
 * Admin approve application schema
 */
export const adminApproveApplicationSchema = z.object({
  notes: z.string().trim().optional().nullable(),
});

export type AdminApproveApplicationData = z.infer<typeof adminApproveApplicationSchema>;
