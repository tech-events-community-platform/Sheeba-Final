import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rateLimit.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyRegistrationOtpSchema,
  resendRegistrationOtpSchema,
  verifyForgotPasswordOtpSchema,
  googleAuthSchema,
  applyOrganizerSchema,
  switchRoleSchema,
  sponsorRegisterSchema,
  sponsorGoogleAuthSchema,
  sponsorOtpRequestSchema,
  sponsorVerifyOtpSchema,
  sponsorResetPasswordOtpSchema,
} from '../schemas/auth.schema';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/verify-registration-otp', authLimiter, validateBody(verifyRegistrationOtpSchema), AuthController.verifyRegistrationOtp);
router.post('/resend-registration-otp', authLimiter, validateBody(resendRegistrationOtpSchema), AuthController.resendRegistrationOtp);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/verify-otp', authLimiter, validateBody(verifyForgotPasswordOtpSchema), AuthController.verifyForgotPasswordOtp);
router.post('/resend-forgot-password-otp', authLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/google', authLimiter, validateBody(googleAuthSchema), AuthController.googleLogin);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);
router.get('/me', authenticate, AuthController.getMe);
router.post('/apply-organizer', authenticate, validateBody(applyOrganizerSchema), AuthController.applyForOrganizer);
router.post('/switch-role', authenticate, validateBody(switchRoleSchema), AuthController.switchRole);
router.post('/logout', authenticate, AuthController.logout);

// Sponsor Auth Endpoints (Completely decoupled role & portal)
router.post('/sponsor/register', authLimiter, validateBody(sponsorRegisterSchema), AuthController.registerSponsor);
router.post('/sponsor/login', authLimiter, validateBody(loginSchema), AuthController.loginSponsor);
router.post('/sponsor/google', authLimiter, validateBody(sponsorGoogleAuthSchema), AuthController.googleSponsorLogin);
router.post('/sponsor/forgot-password/otp', authLimiter, validateBody(sponsorOtpRequestSchema), AuthController.sendSponsorOtp);
router.post('/sponsor/verify-otp', authLimiter, validateBody(sponsorVerifyOtpSchema), AuthController.verifySponsorOtp);
router.post('/sponsor/reset-password/otp', authLimiter, validateBody(sponsorResetPasswordOtpSchema), AuthController.resetSponsorPasswordWithOtp);

export default router;
