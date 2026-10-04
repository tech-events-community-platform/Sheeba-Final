import { z } from 'zod';

export const eventIdOrTokenParamSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID or share token parameter is required.'),
});

export type EventIdOrTokenParamInput = z.infer<typeof eventIdOrTokenParamSchema>;
