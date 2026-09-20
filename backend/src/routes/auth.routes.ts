import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRegistration, validateLogin } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post('/register', authLimiter, validateRegistration, AuthController.register);
router.post('/login', authLimiter, validateLogin, AuthController.login);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/google', authLimiter, AuthController.googleLogin);
router.post('/reset-password', authLimiter, AuthController.resetPassword);
router.get('/me', authenticate, AuthController.getMe);
router.post('/apply-organizer', authenticate, AuthController.applyForOrganizer);
router.post('/switch-role', authenticate, AuthController.switchRole);
router.post('/logout', authenticate, AuthController.logout);

// Sponsor Auth Endpoints (Completely decoupled role & portal)
router.post('/sponsor/register', authLimiter, AuthController.registerSponsor);
router.post('/sponsor/login', authLimiter, validateLogin, AuthController.loginSponsor);
router.post('/sponsor/google', authLimiter, AuthController.googleSponsorLogin);
router.post('/sponsor/forgot-password/otp', authLimiter, AuthController.sendSponsorOtp);
router.post('/sponsor/verify-otp', authLimiter, AuthController.verifySponsorOtp);
router.post('/sponsor/reset-password/otp', authLimiter, AuthController.resetSponsorPasswordWithOtp);

export default router;

