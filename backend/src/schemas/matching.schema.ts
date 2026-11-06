import { z } from 'zod';

export const updateSponsorPreferencesSchema = z.object({
  companyDescription: z.string().trim().max(2000).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  companyLogo: z
    .string()
    .trim()
    .url({ message: 'Company logo must be a valid URL' })
    .or(z.string().trim().length(0))
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .trim()
    .url({ message: 'Avatar URL must be a valid URL' })
    .or(z.string().trim().length(0))
    .optional()
    .nullable(),
  companyWebsite: z
    .string()
    .trim()
    .url({ message: 'Company website must be a valid URL' })
    .or(z.string().trim().length(0))
    .optional()
    .nullable(),
  companyPhone: z.string().trim().max(50).optional().nullable(),
  companyName: z.string().trim().min(2).max(150).optional().nullable(),
  targetInterests: z.array(z.string().trim().min(1)).optional(),
  targetSkills: z.array(z.string().trim().min(1)).optional(),
  sponsorshipObjectives: z.array(z.string().trim().min(1)).optional(),
  targetAudience: z.array(z.string().trim().min(1)).optional(),
  preferredEventCategories: z.array(z.string().trim().min(1)).optional(),
  preferredEventTypes: z.array(z.string().trim().min(1)).optional(),
  preferredLocations: z.array(z.string().trim().min(1)).optional(),
  maxBudget: z.coerce.number().min(0).optional().nullable(),
  preferredBenefits: z.array(z.string().trim().min(1)).optional(),
  additionalPreferences: z.record(z.string(), z.any()).optional().nullable(),
});

export const sponsorRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10).optional(),
  objective: z.string().trim().optional(),
  category: z.string().trim().optional(),
  location: z.string().trim().optional(),
});

export type UpdateSponsorPreferencesInput = z.infer<typeof updateSponsorPreferencesSchema>;
export type SponsorRecommendationsQueryInput = z.infer<typeof sponsorRecommendationsQuerySchema>;
