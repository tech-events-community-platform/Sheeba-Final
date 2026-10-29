import { Router } from 'express';
import { RecycleBinController } from '../controllers/recycleBin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateParams } from '../middlewares/validate.middleware';
import { recycleBinItemParamSchema } from '../schemas/common.schema';

const router = Router();

// Recycle Bin requires authentication for all actions
router.use(authenticate);

// Get items in Recycle Bin for current user (role-scoped)
router.get('/', RecycleBinController.getItems);

// Get Recycle Bin statistics
router.get('/stats', RecycleBinController.getStats);

// Restore an item from Recycle Bin
router.post('/:entityType/:id/restore', validateParams(recycleBinItemParamSchema), RecycleBinController.restoreItem);

// Permanently delete an item from Recycle Bin
router.delete('/:entityType/:id/permanent', validateParams(recycleBinItemParamSchema), RecycleBinController.permanentlyDeleteItem);

// Retention policy purge of items older than 30 days (Admin only)
router.post('/purge', authorizeRoles('admin'), RecycleBinController.purgeExpired);

// Audit trail logs (Admin only)
router.get('/audit', authorizeRoles('admin'), RecycleBinController.getAuditLogs);

export default router;
