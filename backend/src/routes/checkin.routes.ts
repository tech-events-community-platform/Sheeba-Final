import { Router } from 'express';
import { CheckinController } from '../controllers/checkin.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';

const router = Router();

// Public / Semi-Public ticket verification (scanned by camera or browser)
router.get(
  '/verify-ticket',
  optionalAuthenticate,
  CheckinController.getTicketVerification
);
router.post(
  '/verify-ticket',
  optionalAuthenticate,
  CheckinController.getTicketVerification
);

router.post(
  '/verify',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  CheckinController.verify
);

router.post(
  '/search',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  CheckinController.search
);

router.post(
  '/lookup',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  CheckinController.lookup
);

router.post(
  '/mark-attended',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  CheckinController.markAttended
);

router.post(
  '/undo',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  CheckinController.undo
);

router.post(
  '/approve',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  CheckinController.approve
);

router.post(
  '/manual-attendee',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  CheckinController.addManualAttendee
);

export default router;
