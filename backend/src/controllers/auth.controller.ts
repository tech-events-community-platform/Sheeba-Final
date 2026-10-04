import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest } from '../types';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, full_name, role, phone, bio, organization } = req.body;
      const result = await AuthService.registerUser({
        email,
        password,
        full_name,
        role,
        phone,
        bio,
        organization,
      });

      const statusCode = result.requireOtp ? 200 : 201;
      return sendSuccess(res, result, result.message || 'User registered successfully.', statusCode);
    } catch (error) {
      next(error);
    }
  }

  static async verifyRegistrationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyRegistrationOtp({ email, otp });
      sendSuccess(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  }

  static async resendRegistrationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.resendRegistrationOtp(email);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, role } = req.body;
      const result = await AuthService.loginUser({ email, password, role });

      return sendSuccess(res, result, 'Login successful.');
    } catch (error) {
      next(error);
    }
  }

  static async applyForOrganizer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { organization, bio, phone, password, socials } = req.body;
      const result = await AuthService.applyForOrganizer(userId, {
        organization,
        bio,
        phone,
        password,
        socials,
      });

      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async switchRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { targetRole, password } = req.body;
      const result = await AuthService.switchRole(userId, { targetRole, password });

      return sendSuccess(res, result, 'Role switched successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await AuthService.getCurrentUser(userId);

      return sendSuccess(res, user, 'Current user profile retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response) {
    return sendSuccess(
      res,
      null,
      'Logged out successfully. Please clear the session token from client storage.'
    );
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async verifyForgotPasswordOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyForgotPasswordOtp(email, otp);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, email, otp, newPassword } = req.body;
      const result = await AuthService.resetPassword({ token, email, otp, newPassword });
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { credential, role, mode } = req.body;
      const result = await AuthService.loginWithGoogle(credential, role, mode || 'login');
      return sendSuccess(res, result, 'Google authentication successful.');
    } catch (error) {
      next(error);
    }
  }

  // --- SPONSOR AUTH METHODS ---

  static async registerSponsor(req: Request, res: Response, next: NextFunction) {
    try {
      const { full_name, email, password, company_name, industry_category, company_phone, company_website } = req.body;
      const result = await AuthService.registerSponsor({
        full_name,
        email,
        password,
        company_name,
        industry_category,
        company_phone,
        company_website,
      });

      return sendSuccess(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  }

  static async loginSponsor(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginUser({ email, password, role: 'sponsor' });
      return sendSuccess(res, result, 'Sponsor login successful.');
    } catch (error) {
      next(error);
    }
  }

  static async googleSponsorLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { credential, mode, company_name, industry_category, company_phone, company_website } = req.body;
      const result = await AuthService.loginSponsorWithGoogle(credential, mode || 'login', {
        company_name,
        industry_category,
        company_phone,
        company_website,
      });
      return sendSuccess(res, result, 'Sponsor Google authentication successful.');
    } catch (error) {
      next(error);
    }
  }

  static async sendSponsorOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.sendPasswordResetOtp(email);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async verifySponsorOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifySponsorOtp(email, otp);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async resetSponsorPasswordWithOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await AuthService.verifyOtpAndResetPassword(email, otp, newPassword);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
