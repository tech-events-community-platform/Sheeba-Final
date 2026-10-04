import { z } from 'zod';

/**
 * Query schema for GET /api/checkin/verify-ticket
 * Requires at least one of token or code.
 */
export const verifyTicketQuerySchema = z
  .object({
    token: z.string().trim().optional(),
    code: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const hasToken = data.token && data.token.length > 0;
    const hasCode = data.code && data.code.length > 0;
    if (!hasToken && !hasCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ticket token or code is required.',
        path: ['token'],
      });
    }
  });

/**
 * Body schema for POST /api/checkin/verify-ticket
 */
export const verifyTicketBodySchema = z
  .object({
    tokenOrCode: z.string().trim().optional(),
    token: z.string().trim().optional(),
    code: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const hasTarget =
      (data.tokenOrCode && data.tokenOrCode.length > 0) ||
      (data.token && data.token.length > 0) ||
      (data.code && data.code.length > 0);
    if (!hasTarget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ticket token or code is required.',
        path: ['tokenOrCode'],
      });
    }
  });

/**
 * Scanner verification schema for POST /api/checkin/verify
 */
export const verifyScannerTicketSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID is required.'),
  tokenOrCode: z.string().trim().min(1, 'Ticket token or code is required.'),
});

/**
 * Attendee search schema for POST /api/checkin/search
 */
export const searchAttendeeSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID is required.'),
  query: z.string().trim().optional().default(''),
});

/**
 * Single attendee lookup schema for POST /api/checkin/lookup
 */
export const lookupAttendeeSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID is required.'),
  query: z.string().trim().min(1, 'Search query is required.'),
});

/**
 * Mark attended schema for POST /api/checkin/mark-attended and POST /api/checkin/approve
 */
export const markAttendedSchema = z
  .object({
    eventId: z.string().trim().min(1, 'Event ID is required.'),
    attendeeId: z.string().trim().optional(),
    attendeeRosterId: z.string().trim().optional(),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.').optional(),
    organizerNote: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters.').optional(),
  })
  .superRefine((data, ctx) => {
    const hasAttendee =
      (data.attendeeId && data.attendeeId.length > 0) ||
      (data.attendeeRosterId && data.attendeeRosterId.length > 0);
    if (!hasAttendee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Attendee ID is required.',
        path: ['attendeeId'],
      });
    }
  });

/**
 * Undo check-in schema for POST /api/checkin/undo
 */
export const undoCheckInSchema = z
  .object({
    eventId: z.string().trim().min(1, 'Event ID is required.'),
    attendeeId: z.string().trim().optional(),
    attendeeRosterId: z.string().trim().optional(),
    reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters.').optional(),
  })
  .superRefine((data, ctx) => {
    const hasAttendee =
      (data.attendeeId && data.attendeeId.length > 0) ||
      (data.attendeeRosterId && data.attendeeRosterId.length > 0);
    if (!hasAttendee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Attendee ID is required.',
        path: ['attendeeId'],
      });
    }
  });

/**
 * Manual attendee creation schema for POST /api/checkin/manual-attendee
 */
export const manualAttendeeSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID is required.'),
  name: z.string().trim().min(1, 'Attendee name is required.'),
  email: z.string().trim().email('Please provide a valid email address.'),
  phone: z.string().trim().optional(),
});

export type VerifyTicketQueryInput = z.infer<typeof verifyTicketQuerySchema>;
export type VerifyTicketBodyInput = z.infer<typeof verifyTicketBodySchema>;
export type VerifyScannerTicketInput = z.infer<typeof verifyScannerTicketSchema>;
export type SearchAttendeeInput = z.infer<typeof searchAttendeeSchema>;
export type LookupAttendeeInput = z.infer<typeof lookupAttendeeSchema>;
export type MarkAttendedInput = z.infer<typeof markAttendedSchema>;
export type UndoCheckInInput = z.infer<typeof undoCheckInSchema>;
export type ManualAttendeeInput = z.infer<typeof manualAttendeeSchema>;
