import { z } from 'zod';

export const badgeCodeEnum = z.enum(['participant', 'winner', 'speaker'], {
  message: 'Badge code must be one of: participant, winner, speaker.',
});

/**
 * Route parameter schema for /api/badges/user/:userId
 */
export const userParamSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required.'),
});

/**
 * Route parameter schema for /api/badges/event/:eventId/attended
 */
export const eventParamSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID is required.'),
});

/**
 * Schema for POST /api/badges/award
 */
export const awardBadgeSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID is required.'),
  attendeeId: z.string().trim().min(1, 'Attendee ID is required.'),
  badgeCode: badgeCodeEnum,
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.').optional(),
  organizerNote: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.').optional(),
});

/**
 * Schema for POST /api/badges/bulk-award
 */
export const bulkAwardBadgeSchema = z
  .object({
    eventId: z.string().trim().min(1, 'Event ID is required.'),
    attendeeUserIds: z
      .array(z.string().trim().min(1, 'Attendee ID cannot be empty.'))
      .optional(),
    attendeeRosterIds: z
      .array(z.string().trim().min(1, 'Attendee ID cannot be empty.'))
      .optional(),
    badgeCode: badgeCodeEnum,
  })
  .superRefine((data, ctx) => {
    const userIds = data.attendeeUserIds || data.attendeeRosterIds;
    if (!userIds || userIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one attendee ID is required.',
        path: ['attendeeUserIds'],
      });
    }
  });

/**
 * Schema for DELETE /api/badges/:id and POST /api/badges/:id/revoke
 */
export const revokeBadgeSchema = z.object({
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters.').optional(),
});

export type AwardBadgeInput = z.infer<typeof awardBadgeSchema>;
export type BulkAwardBadgeInput = z.infer<typeof bulkAwardBadgeSchema>;
export type RevokeBadgeInput = z.infer<typeof revokeBadgeSchema>;
