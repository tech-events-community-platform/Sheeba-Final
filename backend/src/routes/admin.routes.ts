import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { SponsorshipController } from '../controllers/sponsorship.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateParams, validateQuery, validateBody } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';
import {
  adminApplicationsQuerySchema,
  adminApproveApplicationSchema,
  adminRejectApplicationSchema,
} from '../schemas/sponsorship.schema';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/dashboard', AdminController.getDashboard);
router.get('/users', AdminController.getUsers);
router.get('/users/:id/sponsor-details', validateParams(idParamSchema), AdminController.getSponsorDetails);
router.get('/users/:id/organizer-details', validateParams(idParamSchema), AdminController.getOrganizerDetails);
router.patch('/users/:id/approve', validateParams(idParamSchema), AdminController.approveOrganizer);
router.patch('/users/:id/reject', validateParams(idParamSchema), AdminController.rejectOrganizer);
router.patch('/users/:id/request-info', validateParams(idParamSchema), AdminController.requestOrganizerInfo);
router.patch('/users/:id/request-additional-info', validateParams(idParamSchema), AdminController.requestOrganizerInfo);
router.patch('/users/:id/approve-sponsor', validateParams(idParamSchema), AdminController.approveSponsor);
router.patch('/users/:id/reject-sponsor', validateParams(idParamSchema), AdminController.rejectSponsor);
router.patch('/users/:id/status', validateParams(idParamSchema), AdminController.toggleUserStatus);
router.get('/payments', AdminController.getPayments);

// Sponsorship Pitch Moderation & Take-down
router.get('/sponsorship-pitches', SponsorshipController.getApplicationsForAdmin);
router.delete('/sponsorship-pitches/:id', validateParams(idParamSchema), SponsorshipController.deleteApplication);

// Stage 2: Admin Sponsorship Applications Review
router.get(
  '/sponsorship-applications',
  validateQuery(adminApplicationsQuerySchema),
  AdminController.getSponsorshipApplications
);

router.get(
  ['/sponsorship-applications/:id', '/sponsorship-applications'],
  validateParams(idParamSchema),
  AdminController.getSponsorshipApplicationDetail
);

router.patch(
  ['/sponsorship-applications/:id/approve', '/sponsorship-applications/approve'],
  validateParams(idParamSchema),
  validateBody(adminApproveApplicationSchema),
  AdminController.approveSponsorshipApplication
);

router.patch(
  ['/sponsorship-applications/:id/reject', '/sponsorship-applications/reject'],
  validateParams(idParamSchema),
  validateBody(adminRejectApplicationSchema),
  AdminController.rejectSponsorshipApplication
);

export default router;
