import { z } from 'zod';

const isValidDateString = (val: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const parsed = new Date(val);
  return !isNaN(parsed.getTime());
};

/**
 * Supported question types in Sheeba event registration forms:
 * - text: free text answer
 * - choice / select / radio: single option selection from options list
 * - multi_choice / checkbox: multiple selection from options list
 */
export const questionTypeEnum = z.enum([
  'text',
  'choice',
  'multi_choice',
  'select',
  'radio',
  'checkbox',
]);

/**
 * Strict schema for individual custom event registration questions
 */
export const registrationQuestionSchema = z
  .object({
    id: z.string().trim().min(1, 'Question ID is required.'),
    questionText: z.string().trim().min(1, 'Question prompt cannot be empty.'),
    type: questionTypeEnum.default('text'),
    options: z.array(z.string().trim()).optional().default([]),
    isRequired: z.boolean().default(false),
    order: z.number().int().optional(),
    eventId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isChoiceType = ['choice', 'multi_choice', 'select', 'radio', 'checkbox'].includes(data.type);
    if (isChoiceType) {
      const validOptions = (data.options || []).filter((opt) => opt.trim().length > 0);
      if (validOptions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Choice question "${data.questionText}" must contain at least one option.`,
          path: ['options'],
        });
      }
    }
  });

/**
 * Event creation schema for POST /api/events
 */
export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Event title is required.').max(255, 'Title exceeds 255 characters.'),
    description: z.string().trim().min(1, 'Event description is required.'),
    type: z.string().trim().min(1, 'Event type is required.').default('workshop'),
    date: z.string().trim().optional(),
    event_date: z.string().trim().optional(),
    startTime: z.string().trim().optional().default('09:00 AM'),
    endTime: z.string().trim().optional().default('05:00 PM'),
    time: z.string().trim().optional(),
    time_str: z.string().trim().optional(),
    location: z.string().trim().min(1, 'Location or venue is required.'),
    venueName: z.string().trim().optional(),
    venue_name: z.string().trim().optional(),
    capacity: z.coerce.number().int('Capacity must be an integer.').positive('Capacity must be at least 1.'),
    isPaid: z.boolean().optional().default(false),
    is_paid: z.boolean().optional(),
    ticketPrice: z.coerce.number().min(0, 'Ticket price cannot be negative.').optional().default(0),
    ticket_price: z.coerce.number().optional(),
    currency: z.string().trim().optional().default('ETB'),
    customQuestions: z.array(registrationQuestionSchema).optional().default([]),
    custom_questions: z.array(registrationQuestionSchema).optional(),
    includeDefaultQuestions: z.boolean().optional().default(true),
    bannerUrl: z.string().trim().url('Invalid banner URL.').or(z.literal('')).optional(),
    posterImageUrl: z.string().trim().url('Invalid poster image URL.').or(z.literal('')).optional(),
    poster_image_url: z.string().trim().url('Invalid poster image URL.').or(z.literal('')).optional(),
    banner_url: z.string().trim().url('Invalid banner URL.').or(z.literal('')).optional(),
  })
  .transform((data) => {
    const rawDate = data.date || data.event_date || '';
    const isPaid = data.isPaid ?? data.is_paid ?? false;
    const ticketPrice = data.ticketPrice ?? data.ticket_price ?? 0;
    const banner = data.posterImageUrl || data.poster_image_url || data.bannerUrl || data.banner_url || '';
    const venue = data.venueName || data.venue_name || data.location;
    const questions = data.customQuestions.length > 0 ? data.customQuestions : (data.custom_questions || []);

    return {
      ...data,
      date: rawDate,
      event_date: rawDate,
      isPaid,
      ticketPrice: isPaid ? ticketPrice : 0,
      bannerUrl: banner || undefined,
      posterImageUrl: banner || undefined,
      venueName: venue,
      customQuestions: questions,
    };
  })
  .superRefine((data, ctx) => {
    if (!data.date || !isValidDateString(data.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date format. Use YYYY-MM-DD or ISO 8601 string.',
        path: ['date'],
      });
    }

    if (data.isPaid && (!data.ticketPrice || data.ticketPrice <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Paid events must specify a ticket price greater than 0 ETB.',
        path: ['ticketPrice'],
      });
    }
  });

/**
 * Event partial update schema for PATCH /api/events/:id
 */
export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Event title cannot be empty.').max(255).optional(),
    description: z.string().trim().min(1, 'Event description cannot be empty.').optional(),
    type: z.string().trim().min(1, 'Event type cannot be empty.').optional(),
    event_type: z.string().trim().min(1).optional(),
    date: z.string().trim().min(1).optional(),
    event_date: z.string().trim().min(1).optional(),
    startTime: z.string().trim().optional(),
    start_time: z.string().trim().optional(),
    endTime: z.string().trim().optional(),
    end_time: z.string().trim().optional(),
    time: z.string().trim().optional(),
    time_str: z.string().trim().optional(),
    location: z.string().trim().min(1, 'Location cannot be empty.').optional(),
    venueName: z.string().trim().optional(),
    venue_name: z.string().trim().optional(),
    capacity: z.coerce.number().int('Capacity must be an integer.').positive('Capacity must be at least 1.').optional(),
    status: z.enum(['open', 'closed', 'completed', 'canceled', 'postponed', 'draft', 'published']).optional(),
    isPaid: z.boolean().optional(),
    is_paid: z.boolean().optional(),
    ticketPrice: z.coerce.number().min(0, 'Ticket price cannot be negative.').optional(),
    ticket_price: z.coerce.number().optional(),
    currency: z.string().trim().optional(),
    customQuestions: z.array(registrationQuestionSchema).optional(),
    custom_questions: z.array(registrationQuestionSchema).optional(),
    bannerUrl: z.string().trim().url('Invalid banner URL.').or(z.literal('')).optional(),
    banner_url: z.string().trim().url('Invalid banner URL.').or(z.literal('')).optional(),
    posterImageUrl: z.string().trim().url('Invalid poster image URL.').or(z.literal('')).optional(),
    poster_image_url: z.string().trim().url('Invalid poster image URL.').or(z.literal('')).optional(),
  })
  .superRefine((data, ctx) => {
    const targetDate = data.date || data.event_date;
    if (targetDate && !isValidDateString(targetDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date format. Use YYYY-MM-DD or ISO 8601 string.',
        path: ['date'],
      });
    }

    const isPaid = data.isPaid ?? data.is_paid;
    const ticketPrice = data.ticketPrice ?? data.ticket_price;
    if (isPaid === true && ticketPrice !== undefined && ticketPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Paid events must specify a ticket price greater than 0 ETB.',
        path: ['ticketPrice'],
      });
    }
  });

/**
 * Query schema for GET /api/events
 */
export const eventQuerySchema = z.object({
  search: z.string().trim().optional(),
  type: z.string().trim().optional(),
  status: z.string().trim().optional(),
  organizerId: z.string().trim().optional(),
});

/**
 * Event registration schema for POST /api/events/:id/register
 */
export const registerEventSchema = z.object({
  answers: z.record(z.string(), z.any()).optional().default({}),
  paymentReference: z.string().trim().optional(),
  attendee: z
    .object({
      id: z.string().optional(),
      email: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

/**
 * Query schema for GET /api/events/:id/lookup
 */
export const lookupAttendeeQuerySchema = z.object({
  q: z.string().trim().optional(),
  query: z.string().trim().optional(),
});

export type RegistrationQuestionInput = z.infer<typeof registrationQuestionSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type RegisterEventInput = z.infer<typeof registerEventSchema>;
export type LookupAttendeeQueryInput = z.infer<typeof lookupAttendeeQuerySchema>;
