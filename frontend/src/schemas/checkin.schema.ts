import { z } from 'zod';

/**
 * Manual attendee creation schema for CheckInPage
 */
export const manualAttendeeFormSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required.'),
  email: z.string().trim().min(1, 'Email address is required.').email('Please provide a valid email address.'),
  phone: z.string().trim().optional(),
});

/**
 * Check-in organizer note schema for CheckInPage
 */
export const checkinNoteFormSchema = z.object({
  organizerNote: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.').optional(),
});

export type ManualAttendeeFormData = z.infer<typeof manualAttendeeFormSchema>;
export type CheckinNoteFormData = z.infer<typeof checkinNoteFormSchema>;
