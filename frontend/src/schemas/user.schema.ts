import { z } from 'zod';

/**
 * Profile visibility enum ('public' | 'private')
 */
export const profileVisibilityEnum = z.enum(['public', 'private'], {
  message: "Visibility must be either 'public' or 'private'.",
});

/**
 * Attendee profile edit form schema (AttendeeSettingsPage)
 */
export const attendeeProfileFormSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name cannot be empty.' }),
  phone: z.string().optional(),
  bio: z.string().optional(),
  visibility: profileVisibilityEnum.optional(),
});

export type AttendeeProfileFormData = z.infer<typeof attendeeProfileFormSchema>;

/**
 * Organizer profile edit form schema (AccountSettingsPage)
 */
export const organizerProfileFormSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name cannot be empty.' }),
  organization: z.string().optional(),
});

export type OrganizerProfileFormData = z.infer<typeof organizerProfileFormSchema>;

/**
 * Update visibility form schema
 */
export const updateVisibilityFormSchema = z.object({
  visibility: profileVisibilityEnum,
});

export type UpdateVisibilityFormData = z.infer<typeof updateVisibilityFormSchema>;

/**
 * User data export form schema
 */
export const exportUserDataFormSchema = z.object({
  format: z.enum(['json', 'csv'], {
    message: "Format must be either 'json' or 'csv'.",
  }),
});

export type ExportUserDataFormData = z.infer<typeof exportUserDataFormSchema>;

/**
 * Password change form schema
 */
export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }),
    newPassword: z.string().min(6, { message: 'New password must be at least 6 characters long.' }),
    confirmPassword: z.string().min(1, { message: 'Password confirmation is required.' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;
