import { z } from 'zod';

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format.');

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .trim()
  .email('Please provide a valid email address.');

/**
 * Password validation schema (min 6 characters)
 */
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long.');

/**
 * Pagination query schema
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Safe string schema with trimming
 */
export const trimmedStringSchema = z.string().trim();

/**
 * Route parameter schemas
 */
export const idParamSchema = z.object({
  id: z.string().trim().min(1, 'ID parameter is required.'),
});

export const tokenParamSchema = z.object({
  token: z.string().trim().min(1, 'Token parameter is required.'),
});
