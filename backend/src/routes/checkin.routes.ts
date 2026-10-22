import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CheckinController } from '../controllers/checkin.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  verifyTicketQuerySchema,
  verifyTicketBodySchema,
  verifyScannerTicketSchema,
  searchAttendeeSchema,
  lookupAttendeeSchema,
  markAttendedSchema,
  undoCheckInSchema,
  manualAttendeeSchema,
  resendManualNotificationSchema,
} from '../schemas/checkin.schema';

const router = Router();

const resendNotificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Max 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many notification resend requests. Please slow down and try again shortly.',
  },
});

// Public / Semi-Public ticket verification (scanned by camera or browser)
router.get(
  '/verify-ticket',
  optionalAuthenticate,
  validateQuery(verifyTicketQuerySchema),
  CheckinController.getTicketVerification
);
router.post(
  '/verify-ticket',
  optionalAuthenticate,
  validateBody(verifyTicketBodySchema),
  CheckinController.getTicketVerification
);

router.post(
  '/verify',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(verifyScannerTicketSchema),
  CheckinController.verify
);

router.post(
  '/search',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(searchAttendeeSchema),
  CheckinController.search
);

router.post(
  '/lookup',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(lookupAttendeeSchema),
  CheckinController.lookup
);

router.post(
  '/mark-attended',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(markAttendedSchema),
  CheckinController.markAttended
);

router.post(
  '/undo',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(undoCheckInSchema),
  CheckinController.undo
);

router.post(
  '/approve',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(markAttendedSchema),
  CheckinController.approve
);

router.post(
  '/manual-attendee',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(manualAttendeeSchema),
  CheckinController.addManualAttendee
);

router.post(
  '/resend-manual-notification',
  resendNotificationLimiter,
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateBody(resendManualNotificationSchema),
  CheckinController.resendManualNotification
);

export default router;
