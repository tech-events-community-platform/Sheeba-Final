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
  applyExhibitorSchema,
  createVisitorSchema,
  payBoothSchema,
  submitBoothReceiptSchema,
  verifyBoothReceiptSchema,
  rejectBoothReceiptSchema,
} from '../schemas/exhibitor.schema';

const router = Router();

// Exhibitor: Get authenticated exhibitor's applications & booths
router.get(
  '/my-booths',
  authenticate,
  ExhibitorController.getMyBooths
);

// Exhibitor: Pay for an accepted booth
router.post(
  '/booths/:vendorId/pay',
  authenticate,
  validateBody(payBoothSchema),
  ExhibitorController.payForBooth
);

// Exhibitor: Submit offline bank-transfer receipt for an accepted booth
router.post(
  '/booths/:vendorId/receipt',
  authenticate,
  validateBody(submitBoothReceiptSchema),
  ExhibitorController.submitBoothReceipt
);

// Exhibitor: Get receipt submission history for own booth booking
router.get(
  '/booths/:vendorId/receipts',
  authenticate,
  ExhibitorController.getBoothReceiptHistory
);

// Exhibitor: Lead Capture - Get visitors logged for a booth
router.get(
  '/booths/:vendorId/visitors',
  authenticate,
  ExhibitorController.getBoothVisitors
);

// Exhibitor: Lead Capture - Log a visitor who stopped by
router.post(
  '/booths/:vendorId/visitors',
  authenticate,
  validateBody(createVisitorSchema),
  ExhibitorController.addBoothVisitor
);

// Exhibitor: Lead Capture - Delete a logged visitor
router.delete(
  '/booths/:vendorId/visitors/:visitorId',
  authenticate,
  ExhibitorController.deleteBoothVisitor
);

// Exhibitor: Apply for booth space at an open event call
router.post(
  '/events/:eventId/apply',
  authenticate,
  validateBody(applyExhibitorSchema),
  ExhibitorController.applyForBooth
);

// Public: View confirmed exhibitors for public event page
router.get(
  '/events/:eventId/public',
  optionalAuthenticate,
  ExhibitorController.getPublicEventExhibitors
);

// Exhibitor: Explore events with open booth calls
router.get(
  '/explore',
  optionalAuthenticate,
  ExhibitorController.exploreOpenCalls
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

// Organizer: View receipt history for an exhibitor booth in an event
router.get(
  '/events/:eventId/vendors/:vendorId/receipts',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  ExhibitorController.getVendorReceiptHistory
);

// Organizer: Verify offline bank-transfer receipt and confirm booth booking
router.post(
  '/events/:eventId/vendors/:vendorId/verify-receipt',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(verifyBoothReceiptSchema),
  ExhibitorController.verifyBoothReceipt
);

// Organizer: Reject invalid offline bank-transfer receipt
router.post(
  '/events/:eventId/vendors/:vendorId/reject-receipt',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(rejectBoothReceiptSchema),
  ExhibitorController.rejectBoothReceipt
);

export default router;
