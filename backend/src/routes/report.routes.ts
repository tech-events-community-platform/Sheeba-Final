import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateParams, validateQuery, validateBody } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';
import { reportQuerySchema, updateReportSchema } from '../schemas/report.schema';

const router = Router();

// Subresource routes first to avoid route shadowing by /:id or /events/:id
router.get(
  ['/events/:id/export', '/events/export', '/:id/export'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  ReportController.exportEventReportCsv
);

router.post(
  ['/events/:id/reset', '/events/reset', '/:id/reset'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  ReportController.resetEventReport
);

// General event report routes
router.get(
  ['/events/:id', '/events', '/:id'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  validateQuery(reportQuerySchema),
  ReportController.getEventReport
);

router.put(
  ['/events/:id', '/events', '/:id'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  validateBody(updateReportSchema),
  ReportController.updateEventReport
);

export default router;
