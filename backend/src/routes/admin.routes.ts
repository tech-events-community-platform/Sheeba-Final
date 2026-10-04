import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateParams } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/dashboard', AdminController.getDashboard);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/approve', validateParams(idParamSchema), AdminController.approveOrganizer);
router.patch('/users/:id/reject', validateParams(idParamSchema), AdminController.rejectOrganizer);
router.patch('/users/:id/approve-sponsor', validateParams(idParamSchema), AdminController.approveSponsor);
router.patch('/users/:id/reject-sponsor', validateParams(idParamSchema), AdminController.rejectSponsor);
router.patch('/users/:id/status', validateParams(idParamSchema), AdminController.toggleUserStatus);
router.get('/payments', AdminController.getPayments);

export default router;
