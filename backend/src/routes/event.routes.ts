import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateEvent } from '../middlewares/validate.middleware';
import { cacheResponse } from '../middlewares/cache.middleware';

const router = Router();

// Public & Share links
router.get('/', EventController.getEvents);
router.get('/share/:token', EventController.getEventByShareToken);
router.get('/:id', EventController.getEventById);
router.get('/', cacheResponse({ ttlSeconds: 30 }), EventController.getEvents);
router.get('/share/:token', cacheResponse({ ttlSeconds: 60 }), EventController.getEventByShareToken);
router.get('/:id', cacheResponse({ ttlSeconds: 60 }), EventController.getEventById);

// Organizer Event Management
router.post(
  '/',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateEvent,
  EventController.createEvent
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  EventController.updateEvent
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  EventController.deleteEvent
);

// Attendee Registration
router.post('/:id/register', authenticate, EventController.registerForEvent);
router.get('/:id/roster', authenticate, authorizeRoles('organizer', 'admin'), EventController.getEventRoster);
router.get('/:id/attendees', authenticate, authorizeRoles('organizer', 'admin'), EventController.getEventRoster);
router.get('/:id/roster', authenticate, authorizeRoles('organizer', 'admin'), cacheResponse({ ttlSeconds: 15, isPrivate: true }), EventController.getEventRoster);
router.get('/:id/attendees', authenticate, authorizeRoles('organizer', 'admin'), cacheResponse({ ttlSeconds: 15, isPrivate: true }), EventController.getEventRoster);
router.get('/:id/lookup', authenticate, authorizeRoles('organizer', 'admin'), EventController.lookupAttendee);

export default router;
