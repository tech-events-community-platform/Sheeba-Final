import { z } from 'zod';
import { emailSchema } from './common.schema';

export const contactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(100, 'Name must be at most 100 characters.'),
  email: emailSchema,
  subject: z
    .string()
    .trim()
    .max(200)
    .optional()
    .default('General Inquiry'),
  category: z
    .string()
    .trim()
    .max(100)
    .optional()
    .default('General Inquiry'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters.')
    .max(5000, 'Message must be at most 5000 characters.'),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
