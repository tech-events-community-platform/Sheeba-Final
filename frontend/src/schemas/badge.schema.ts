import { z } from 'zod';

export const badgeCodeEnum = z.enum(['participant', 'winner', 'speaker'], {
  message: 'Badge code must be one of: participant, winner, speaker.',
});

/**
 * Single badge award form schema
 */
export const awardBadgeFormSchema = z.object({
  eventId: z.string().trim().min(1, 'Event selection is required.'),
  attendeeId: z.string().trim().min(1, 'Attendee selection is required.'),
  selectedBadgeCode: badgeCodeEnum,
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.').optional(),
});

/**
 * Bulk badge award form schema
 */
export const bulkAwardBadgeFormSchema = z.object({
  eventId: z.string().trim().min(1, 'Event selection is required.'),
  selectedIds: z.array(z.string().trim().min(1, 'Attendee ID cannot be empty.')).min(1, 'At least one attendee must be selected.'),
  selectedBadgeCode: badgeCodeEnum,
});

export type AwardBadgeFormData = z.infer<typeof awardBadgeFormSchema>;
export type BulkAwardBadgeFormData = z.infer<typeof bulkAwardBadgeFormSchema>;
