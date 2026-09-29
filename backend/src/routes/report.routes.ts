import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';

const router = Router();

router.get(
  ['/events/:id', '/:id'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  ReportController.getEventReport
);

router.get(
  ['/events/:id/export', '/:id/export'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  ReportController.exportEventReportCsv
);

router.put(
  ['/events/:id', '/:id'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  ReportController.updateEventReport
);

router.post(
  ['/events/:id/reset', '/:id/reset'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  ReportController.resetEventReport
);

export default router;

