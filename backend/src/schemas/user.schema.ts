import { z } from 'zod';

/**
 * Profile visibility enum ('public' | 'private')
 */
export const profileVisibilityEnum = z.enum(['public', 'private'], {
  message: "Visibility must be either 'public' or 'private'.",
});

export type ProfileVisibility = z.infer<typeof profileVisibilityEnum>;

/**
 * Schema for updating user profile (PATCH /api/users/me)
 * Accepts partial fields. Empty strings are allowed to clear phone, bio, organization, avatar.
 */
export const updateProfileSchema = z
  .object({
    full_name: z
      .string({ message: 'Full name must be a string.' })
      .trim()
      .min(1, { message: 'Full name cannot be empty.' })
      .optional(),
    name: z
      .string({ message: 'Name must be a string.' })
      .trim()
      .min(1, { message: 'Name cannot be empty.' })
      .optional(),
    phone: z.string({ message: 'Phone must be a string.' }).optional(),
    bio: z.string({ message: 'Bio must be a string.' }).optional(),
    organization: z.string({ message: 'Organization must be a string.' }).optional(),
    visibility: profileVisibilityEnum.optional(),
    avatar_url: z
      .string({ message: 'Avatar URL must be a string.' })
      .trim()
      .url({ message: 'Avatar URL must be a valid URL.' })
      .or(z.literal(''))
      .optional()
      .nullable(),
    avatarUrl: z
      .string({ message: 'Avatar URL must be a string.' })
      .trim()
      .url({ message: 'Avatar URL must be a valid URL.' })
      .or(z.literal(''))
      .optional()
      .nullable(),
  })
  .transform((data) => {
    return {
      full_name: data.full_name !== undefined ? data.full_name : data.name,
      phone: data.phone,
      bio: data.bio,
      organization: data.organization,
      visibility: data.visibility,
      avatar_url: data.avatar_url !== undefined ? data.avatar_url : data.avatarUrl,
    };
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Schema for updating profile visibility (PATCH /api/users/me/visibility)
 */
export const updateVisibilitySchema = z.object({
  visibility: profileVisibilityEnum,
});

export type UpdateVisibilityInput = z.infer<typeof updateVisibilitySchema>;

/**
 * Query schema for user data export (GET /api/users/me/export)
 */
export const exportUserDataQuerySchema = z.object({
  format: z.enum(['json', 'csv'], {
    message: "Export format must be either 'json' or 'csv'.",
  }).optional(),
});

export type ExportUserDataQueryInput = z.infer<typeof exportUserDataQuerySchema>;

/**
 * Password change schema for user accounts
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }),
    newPassword: z.string().min(6, { message: 'New password must be at least 6 characters long.' }),
    confirmPassword: z.string().min(1, { message: 'Password confirmation is required.' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
