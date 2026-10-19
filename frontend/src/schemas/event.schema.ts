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
    isPublicized: z.boolean().default(false),
    ticketPrice: z.coerce.number().min(0, 'Ticket price cannot be negative').max(1000000, 'Ticket price exceeds safe limit of 1,000,000 ETB').default(0),
    paymentMethods: z.array(paymentDestinationSchema).optional().default([]),
    requiresApproval: z.boolean().optional().default(false),
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

    if (data.isPaid) {
      if (data.ticketPrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Paid tickets must specify a price in ETB (e.g. 150)',
          path: ['ticketPrice'],
        });
      }

      if (!data.paymentMethods || data.paymentMethods.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Paid events require at least one payment receiving method (e.g. CBE, Telebirr)',
          path: ['paymentMethods'],
        });
      } else {
        const seen = new Set<string>();
        for (const dest of data.paymentMethods) {
          const key = `${dest.provider.toLowerCase()}_${dest.accountNumber.trim().replace(/\s+/g, '')}`;
          if (seen.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate account for ${dest.provider}: ${dest.accountNumber}`,
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
 * Edit Event modal schema (used in EditEventModal)
 */
export const editEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Event Title is required.'),
    isPublicized: z.boolean().optional().default(false),
    location: z.string().trim().min(1, 'Event Place/Location is required.'),
    date: z.string().trim().min(1, 'Event Date is required.'),
    capacity: z.coerce.number().int('Capacity must be an integer.').min(1, 'Capacity must be at least 1.').default(100),
    isPaid: z.boolean().default(false),
    ticketPrice: z.coerce.number().min(0).max(1000000).default(0),
    paymentMethods: z.array(paymentDestinationSchema).optional().default([]),
    requiresApproval: z.boolean().optional().default(false),
    description: z.string().trim().optional(),
    venueName: z.string().trim().optional(),
    startTime: z.string().trim().optional(),
    endTime: z.string().trim().optional(),
    posterImageUrl: z.string().trim().optional(),
    bannerUrl: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isPaid) {
      if (data.ticketPrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Paid tickets must specify a price in ETB (e.g. 150)',
          path: ['ticketPrice'],
        });
      }

      if (data.paymentMethods && data.paymentMethods.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Paid events require at least one payment receiving method (e.g. CBE, Telebirr)',
          path: ['paymentMethods'],
        });
      }
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
