import { Router } from 'express';
import { ScannerController } from '../controllers/scanner.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateParams } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';

const router = Router();

// Dedicated Scanner Portal Endpoints
router.get(
  '/my-events',
  authenticate,
  ScannerController.getMyAssignedEvents
);

router.get(
  '/events/:id/attendance',
  authenticate,
  validateParams(idParamSchema),
  ScannerController.getScannerEventAttendance
);

export default router;

