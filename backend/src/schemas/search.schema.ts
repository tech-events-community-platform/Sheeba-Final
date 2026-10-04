import { z } from 'zod';

/**
 * Public search query schema
 * Validates search term parameters (q or query)
 */
export const searchQuerySchema = z.object({
  q: z.string().trim().max(100, 'Search query cannot exceed 100 characters.').optional(),
  query: z.string().trim().max(100, 'Search query cannot exceed 100 characters.').optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
