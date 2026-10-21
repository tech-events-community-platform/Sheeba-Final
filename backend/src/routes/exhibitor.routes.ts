import { Router } from 'express';
import { ExhibitorController } from '../controllers/exhibitor.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  upsertExhibitorCallSchema,
  addManualVendorSchema,
  updateVendorSchema,
  vendorQuerySchema,
} from '../schemas/exhibitor.schema';

const router = Router();

// Public: View confirmed exhibitors for public event page
router.get(
  '/events/:eventId/public',
  optionalAuthenticate,
  ExhibitorController.getPublicEventExhibitors
);

// Organizer: Get exhibitor call config & stats
router.get(
  '/events/:eventId/call',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  ExhibitorController.getExhibitorCall
);

// Organizer: Upsert exhibitor call config (turn on/off, price, space, specifications)
router.put(
  '/events/:eventId/call',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(upsertExhibitorCallSchema),
  ExhibitorController.upsertExhibitorCall
);

// Organizer: List event vendors with search & filtering
router.get(
  '/events/:eventId/vendors',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateQuery(vendorQuerySchema),
  ExhibitorController.getEventVendors
);

// Organizer: Add vendor manually (manual or sponsorship)
router.post(
  '/events/:eventId/vendors',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(addManualVendorSchema),
  ExhibitorController.addManualVendor
);

// Organizer: Update vendor record (booth #, details, status)
router.put(
  '/events/:eventId/vendors/:vendorId',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(updateVendorSchema),
  ExhibitorController.updateVendor
);

// Organizer: Remove vendor from event roster
router.delete(
  '/events/:eventId/vendors/:vendorId',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  ExhibitorController.deleteVendor
);

export default router;

