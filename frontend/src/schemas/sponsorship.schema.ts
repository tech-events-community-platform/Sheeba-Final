import { z } from 'zod';

/**
 * Deal status enum for sponsorship pipeline
 */
export const dealStatusEnum = z.enum(['INTERESTED', 'DECLINED'], {
  message: "Status must be either 'INTERESTED' or 'DECLINED'.",
});

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
 * Express interest schema for SponsorApplicationDetailPage
 */
export const sponsorExpressInterestSchema = z.object({
  applicationId: z.string().trim().min(1, { message: 'Application ID is required.' }),
  status: dealStatusEnum,
  package_name: z.string().trim().optional().nullable(),
  pledged_amount: z.coerce
    .number({ message: 'Pledged amount must be a number.' })
    .min(0, { message: 'Pledged amount must be greater than or equal to 0.' })
    .optional()
    .nullable(),
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
