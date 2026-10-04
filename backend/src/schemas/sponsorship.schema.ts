import { z } from 'zod';

/**
 * Deal status enum for sponsorship deals pipeline
 */
export const dealStatusEnum = z.enum(['INTERESTED', 'DECLINED'], {
  message: "Status must be either 'INTERESTED' or 'DECLINED'.",
});

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
 * Schema for POST /api/sponsorships/deals (B-48)
 */
export const createDealSchema = z.object({
  applicationId: z.string().trim().min(1, { message: 'Application ID is required.' }),
  status: dealStatusEnum,
  package_name: z.string().trim().optional().nullable(),
  pledged_amount: z.coerce
    .number({ message: 'Pledged amount must be a number.' })
    .min(0, { message: 'Pledged amount must be greater than or equal to 0.' })
    .optional()
    .nullable(),
  sponsor_notes: z.string({ message: 'Sponsor notes must be a string.' }).optional().nullable(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

/**
 * Schema for GET /api/sponsorships/sponsor/my-deals query parameters (B-49)
 */
export const sponsorDealsQuerySchema = z.object({
  status: dealStatusEnum.optional(),
});

export type SponsorDealsQueryInput = z.infer<typeof sponsorDealsQuerySchema>;

/**
 * Schema for PATCH /api/sponsorships/deals/:id (B-50)
 */
export const updateDealSchema = z.object({
  status: dealStatusEnum,
  sponsor_notes: z.string({ message: 'Sponsor notes must be a string.' }).optional().nullable(),
});

export type UpdateDealInput = z.infer<typeof updateDealSchema>;
