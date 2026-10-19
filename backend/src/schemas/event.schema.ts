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
 * Strict schema for individual receiving payment destinations (e.g. CBE, Telebirr)
 */
export const paymentDestinationSchema = z
  .object({
    id: z.string().optional(),
    provider: z.string().trim().min(1, 'Payment provider is required.').max(50),
    accountNumber: z.string().trim().min(1, 'Account or receiving phone number is required.').max(100),
    accountHolder: z.string().trim().max(100).optional(),
    label: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    const p = data.provider.toLowerCase();
    const acc = data.accountNumber.trim().replace(/\s+/g, '');
    if (p.includes('telebirr')) {
      const validPhone = /^(09|07)\d{8}$|^(\+?251)(9|7)\d{8}$/.test(acc);
      if (!validPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Telebirr number must be a valid 10-digit Ethiopian phone number (e.g. 0987654321, 07...) or 251...',
          path: ['accountNumber'],
        });
      }
    } else if (p.includes('cbe') && !p.includes('birr')) {
      const validCbe = /^\d{10,16}$/.test(acc);
      if (!validCbe) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CBE account number should be 10-16 numeric digits (e.g. 100098765432).',
          path: ['accountNumber'],
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
    isPublicized: z.boolean().optional().default(false),
    is_publicized: z.boolean().optional(),
    ticketPrice: z.coerce.number().min(0, 'Ticket price cannot be negative.').max(1000000, 'Ticket price exceeds safe limit of 1,000,000 ETB.').optional().default(0),
    ticket_price: z.coerce.number().optional(),
    currency: z.string().trim().optional().default('ETB'),
    paymentMethods: z.array(paymentDestinationSchema).optional().default([]),
    payment_methods: z.array(paymentDestinationSchema).optional(),
    requiresApproval: z.boolean().optional().default(false),
    requires_approval: z.boolean().optional(),
    customQuestions: z.array(registrationQuestionSchema).optional().default([]),
    custom_questions: z.array(registrationQuestionSchema).optional(),
    includeDefaultQuestions: z.boolean().optional().default(true),
    bannerUrl: z.string().trim().optional(),
    posterImageUrl: z.string().trim().optional(),
    poster_image_url: z.string().trim().optional(),
    banner_url: z.string().trim().optional(),
  })
  .transform((data) => {
    const rawDate = data.date || data.event_date || '';
    const isPaid = data.isPaid ?? data.is_paid ?? false;
    const isPublicized = data.isPublicized ?? data.is_publicized ?? false;
    const ticketPrice = data.ticketPrice ?? data.ticket_price ?? 0;
    const requiresApproval = data.requiresApproval ?? data.requires_approval ?? false;
    const banner = data.posterImageUrl || data.poster_image_url || data.bannerUrl || data.banner_url || '';
    const venue = data.venueName || data.venue_name || data.location;
    const questions = data.customQuestions.length > 0 ? data.customQuestions : (data.custom_questions || []);
    const paymentDestinations = data.paymentMethods.length > 0 ? data.paymentMethods : (data.payment_methods || []);

    return {
      ...data,
      date: rawDate,
      event_date: rawDate,
      isPaid,
      isPublicized,
      ticketPrice: isPaid ? ticketPrice : 0,
      paymentMethods: isPaid ? paymentDestinations : [],
      requiresApproval,
      requires_approval: requiresApproval,
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

    if (data.isPaid) {
      if (!data.ticketPrice || data.ticketPrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Paid events must specify a ticket price greater than 0 ETB.',
          path: ['ticketPrice'],
        });
      }

      if (!data.paymentMethods || data.paymentMethods.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Paid events require at least one configured receiving payment destination (e.g. CBE or Telebirr).',
          path: ['paymentMethods'],
        });
      } else {
        // Prevent duplicate payment methods for the same provider and account
        const seen = new Set<string>();
        for (const dest of data.paymentMethods) {
          const key = `${dest.provider.toLowerCase()}_${dest.accountNumber.trim().replace(/\s+/g, '')}`;
          if (seen.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate payment account for provider ${dest.provider}: ${dest.accountNumber}.`,
              path: ['paymentMethods'],
            });
            break;
          }
          seen.add(key);
        }
      }
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
    isPublicized: z.boolean().optional(),
    is_publicized: z.boolean().optional(),
    ticketPrice: z.coerce.number().min(0, 'Ticket price cannot be negative.').optional(),
    ticket_price: z.coerce.number().optional(),
    requiresApproval: z.boolean().optional(),
    requires_approval: z.boolean().optional(),
    currency: z.string().trim().optional(),
    paymentMethods: z.array(paymentDestinationSchema).optional(),
    payment_methods: z.array(paymentDestinationSchema).optional(),
    customQuestions: z.array(registrationQuestionSchema).optional(),
    custom_questions: z.array(registrationQuestionSchema).optional(),
    bannerUrl: z.string().trim().optional(),
    banner_url: z.string().trim().optional(),
    posterImageUrl: z.string().trim().optional(),
    poster_image_url: z.string().trim().optional(),
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

    const pMethods = data.paymentMethods ?? data.payment_methods;
    if (isPaid === true && pMethods !== undefined) {
      if (pMethods.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Paid events require at least one configured receiving payment destination (e.g. CBE or Telebirr).',
          path: ['paymentMethods'],
        });
      } else {
        const seen = new Set<string>();
        for (const dest of pMethods) {
          const key = `${dest.provider.toLowerCase()}_${dest.accountNumber.trim().replace(/\s+/g, '')}`;
          if (seen.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate payment account for provider ${dest.provider}: ${dest.accountNumber}.`,
              path: ['paymentMethods'],
            });
            break;
          }
          seen.add(key);
        }
      }
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
  isPublicized: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
});

/**
 * Event registration schema for POST /api/events/:id/register
 */
export const registerEventSchema = z.object({
  answers: z.record(z.string(), z.any()).optional().default({}),
  paymentReference: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  screenshotUrl: z.string().trim().optional(),
  screenshotBase64: z.string().optional(),
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

export const bulkApproveRegistrationsSchema = z.object({
  registrationIds: z.array(z.string().trim().min(1)).min(1, 'Please select at least one registration to approve.'),
});

export type RegistrationQuestionInput = z.infer<typeof registrationQuestionSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type RegisterEventInput = z.infer<typeof registerEventSchema>;
export type LookupAttendeeQueryInput = z.infer<typeof lookupAttendeeQuerySchema>;
export type BulkApproveRegistrationsInput = z.infer<typeof bulkApproveRegistrationsSchema>;
