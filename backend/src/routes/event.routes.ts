import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware';
import { cacheResponse } from '../middlewares/cache.middleware';
import { idParamSchema, tokenParamSchema } from '../schemas/common.schema';
import {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
  registerEventSchema,
  lookupAttendeeQuerySchema,
} from '../schemas/event.schema';

const router = Router();

// Events & Share links
router.get(
  '/',
  optionalAuthenticate,
  validateQuery(eventQuerySchema),
  cacheResponse({ ttlSeconds: 15, isPrivate: true }),
  EventController.getEvents
);

router.get(
  '/share/:token',
  validateParams(tokenParamSchema),
  cacheResponse({ ttlSeconds: 60 }),
  EventController.getEventByShareToken
);

router.get(
  '/:id',
  optionalAuthenticate,
  validateParams(idParamSchema),
  cacheResponse({ ttlSeconds: 60 }),
  EventController.getEventById
);

// Organizer Event Management
router.post(
  '/',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(createEventSchema),
  EventController.createEvent
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  validateBody(updateEventSchema),
  EventController.updateEvent
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  EventController.deleteEvent
);

// Attendee Registration
router.post(
  '/:id/register',
  authenticate,
  validateParams(idParamSchema),
  validateBody(registerEventSchema),
  EventController.registerForEvent
);

router.get(
  '/:id/roster',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  cacheResponse({ ttlSeconds: 15, isPrivate: true }),
  EventController.getEventRoster
);

router.get(
  '/:id/attendees',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  cacheResponse({ ttlSeconds: 15, isPrivate: true }),
  EventController.getEventRoster
);

router.get(
  '/:id/lookup',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  validateQuery(lookupAttendeeQuerySchema),
  EventController.lookupAttendee
);

export default router;
