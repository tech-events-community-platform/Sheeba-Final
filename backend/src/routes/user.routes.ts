import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';
import {
  updateProfileSchema,
  updateVisibilitySchema,
  exportUserDataQuerySchema,
} from '../schemas/user.schema';

const router = Router();

router.get('/profile', authenticate, UserController.getProfile);
router.get('/me', authenticate, UserController.getProfile);
router.patch('/me', authenticate, validateBody(updateProfileSchema), UserController.updateProfile);
router.patch('/me/visibility', authenticate, validateBody(updateVisibilitySchema), UserController.updateVisibility);
router.delete('/me', authenticate, UserController.deleteAccount);
router.get('/me/export', authenticate, validateQuery(exportUserDataQuerySchema), UserController.exportUserData);
router.get('/me/tickets', authenticate, UserController.getMyTickets);
router.get('/me/attendance', authenticate, UserController.getAttendanceHistory);

// Public profile (optionalAuth detects if the viewer is the profile owner or admin)
router.get(
  ['/:id/public', '/public'],
  optionalAuthenticate,
  validateParams(idParamSchema),
  UserController.getPublicProfile
);

export default router;
