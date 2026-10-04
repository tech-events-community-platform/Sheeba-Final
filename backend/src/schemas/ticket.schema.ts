import { z } from 'zod';

/**
 * Route parameter schema for GET /api/tickets/:eventId
 * Accepts event UUID or share link token
 */
export const eventIdOrTokenParamSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID or share token parameter is required.'),
});

export type EventIdOrTokenParamInput = z.infer<typeof eventIdOrTokenParamSchema>;
