import { Router } from 'express';
import { BadgeController } from '../controllers/badge.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';
import {
  userParamSchema,
  eventParamSchema,
  awardBadgeSchema,
  bulkAwardBadgeSchema,
  revokeBadgeSchema,
} from '../schemas/badge.schema';

const router = Router();

// Public / Attendee badge inspection
router.get('/', BadgeController.getAllBadges);
router.get('/event/:eventId/attended', validateParams(eventParamSchema), BadgeController.getAttendedBadgeHolders);
router.get('/:id', validateParams(idParamSchema), BadgeController.getBadgeById);
router.get('/user/:userId', validateParams(userParamSchema), BadgeController.getAttendeeBadges);

// Organizer Single Shared Badge Award (Section 7)
router.post(
  '/award',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(awardBadgeSchema),
  BadgeController.awardBadge
);

// Organizer Bulk Award
router.post(
  '/bulk-award',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(bulkAwardBadgeSchema),
  BadgeController.bulkAwardBadges
);

// Admin-Only Revocation
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  validateParams(idParamSchema),
  validateBody(revokeBadgeSchema),
  BadgeController.revokeBadge
);

router.post(
  '/:id/revoke',
  authenticate,
  authorizeRoles('admin'),
  validateParams(idParamSchema),
  validateBody(revokeBadgeSchema),
  BadgeController.revokeBadge
);

export default router;
