import { z } from 'zod';

/**
 * Question draft validation schema (used for custom event questions)
 */
export const eventQuestionDraftSchema = z
  .object({
    id: z.string().trim().min(1, 'Question ID is required.'),
    questionText: z.string().trim().min(1, 'Question prompt cannot be empty.'),
    type: z.enum(['text', 'choice', 'multi_choice', 'select', 'radio', 'checkbox']).default('text'),
    options: z.array(z.string().trim()).optional().default([]),
    isRequired: z.boolean().default(false),
    order: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
    const isChoice = ['choice', 'multi_choice', 'select', 'radio', 'checkbox'].includes(data.type);
    if (isChoice) {
      const validOptions = (data.options || []).filter((opt) => opt.trim().length > 0);
      if (validOptions.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Choice question "${data.questionText}" requires at least 2 choice options.`,
          path: ['options'],
        });
      }
    }
  });

/**
 * Event creation form schema (used in CreateEventPage)
 */
export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Event title is required'),
    selectedTypeOption: z.string().trim().min(1, 'Event type is required'),
    customTypeInput: z.string().trim().optional(),
    date: z.string().trim().min(1, 'Event date is required'),
    location: z.string().trim().min(1, 'Venue or location is required'),
    description: z.string().trim().min(1, 'Description is required'),
    capacity: z.coerce.number().int('Capacity must be an integer').min(1, 'Capacity must be at least 1'),
    isPaid: z.boolean().default(false),
    ticketPrice: z.coerce.number().min(0, 'Ticket price cannot be negative').default(0),
    posterImageUrl: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.selectedTypeOption === 'other' && (!data.customTypeInput || !data.customTypeInput.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify what type of event this is',
        path: ['customType'],
      });
    }

    if (data.isPaid && data.ticketPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Paid tickets must specify a price in ETB (e.g. 150)',
        path: ['ticketPrice'],
      });
    }
  });

/**
 * Edit Event modal schema (used in EditEventModal)
 */
export const editEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Event Title is required.'),
    location: z.string().trim().min(1, 'Event Place/Location is required.'),
    date: z.string().trim().min(1, 'Event Date is required.'),
    capacity: z.coerce.number().int('Capacity must be an integer.').min(1, 'Capacity must be at least 1.').default(100),
    isPaid: z.boolean().default(false),
    ticketPrice: z.coerce.number().min(0).default(0),
    description: z.string().trim().optional(),
    venueName: z.string().trim().optional(),
    startTime: z.string().trim().optional(),
    endTime: z.string().trim().optional(),
    posterImageUrl: z.string().trim().optional(),
    bannerUrl: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isPaid && data.ticketPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Paid tickets must specify a price in ETB (e.g. 150)',
        path: ['ticketPrice'],
      });
    }
  });

/**
 * Event registration guest validation schema (used in EventRegistrationCheckoutPage)
 */
export const eventRegistrationCheckoutSchema = z
  .object({
    isAuthenticated: z.boolean(),
    guestName: z.string().trim().optional(),
    guestEmail: z.string().trim().optional(),
    guestPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isAuthenticated) {
      if (!data.guestName || data.guestName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter your full name.',
          path: ['guestName'],
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.guestEmail || !emailRegex.test(data.guestEmail.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid email address.',
          path: ['guestEmail'],
        });
      }

      if (!data.guestPassword || data.guestPassword.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a password with at least 6 characters for your attendee account.',
          path: ['guestPassword'],
        });
      }
    }
  });

export type EventQuestionDraftInput = z.infer<typeof eventQuestionDraftSchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;
export type EditEventInput = z.infer<typeof editEventSchema>;
export type EventRegistrationCheckoutInput = z.infer<typeof eventRegistrationCheckoutSchema>;
