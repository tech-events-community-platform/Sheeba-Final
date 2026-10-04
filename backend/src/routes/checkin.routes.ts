import { Router } from 'express';
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
} from '../schemas/checkin.schema';

const router = Router();

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

export default router;
