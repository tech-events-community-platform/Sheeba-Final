import { z } from 'zod';

export const updateSponsorPreferencesSchema = z.object({
  targetInterests: z.array(z.string().trim().min(1)).optional(),
  targetSkills: z.array(z.string().trim().min(1)).optional(),
  sponsorshipObjectives: z.array(z.string().trim().min(1)).optional(),
  preferredEventTypes: z.array(z.string().trim().min(1)).optional(),
  preferredLocations: z.array(z.string().trim().min(1)).optional(),
  maxBudget: z.coerce.number().positive().optional(),
});

export const sponsorRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10).optional(),
  objective: z.string().trim().optional(),
  category: z.string().trim().optional(),
  location: z.string().trim().optional(),
});

export type UpdateSponsorPreferencesInput = z.infer<typeof updateSponsorPreferencesSchema>;
export type SponsorRecommendationsQueryInput = z.infer<typeof sponsorRecommendationsQuerySchema>;
