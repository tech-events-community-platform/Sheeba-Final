import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AdminService } from '../services/admin.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class AdminController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getDashboardMetrics();
      return sendSuccess(res, stats, 'Admin dashboard metrics retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const usersData = await AdminService.getUsersList();
      return sendSuccess(res, usersData, 'Platform users retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async getSponsorDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const details = await AdminService.getSponsorDetails(id);
      return sendSuccess(res, details, 'Sponsor details retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async approveOrganizer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = await AdminService.approveOrganizer(id);
      return sendSuccess(res, updated, 'Organizer approved and activated successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async rejectOrganizer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const reason = req.body?.reason || req.body?.rejectionReason;
      const updated = await AdminService.rejectOrganizer(id, reason);
      return sendSuccess(res, updated, 'Organizer registration rejected.');
    } catch (error) {
      next(error);
    }
  }

  static async requestOrganizerInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const notes = req.body?.notes || req.body?.message;
      const updated = await AdminService.requestOrganizerInfo(id, notes);
      return sendSuccess(res, updated, 'Additional information request dispatched to organizer.');
    } catch (error) {
      next(error);
    }
  }

  static async getOrganizerDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const details = await AdminService.getOrganizerDetails(id);
      return sendSuccess(res, details, 'Organizer details retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async approveSponsor(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = await AdminService.approveSponsor(id);
      return sendSuccess(res, updated, 'Sponsor approved and activated successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async rejectSponsor(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = await AdminService.rejectSponsor(id);
      return sendSuccess(res, updated, 'Sponsor registration rejected.');
    } catch (error) {
      next(error);
    }
  }

  static async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = await AdminService.toggleUserStatus(id);
      return sendSuccess(res, updated, 'User status updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await AdminService.getPaymentIssues();
      return sendSuccess(res, payments, 'Payment issues & split logs retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage 2: Admin queries formal sponsorship applications
   */
  static async getSponsorshipApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query as any;
      const data = await AdminService.getSponsorshipApplications(filters);
      return sendSuccess(res, data, 'Sponsorship applications retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage 2: Admin queries single sponsorship application details
   */
  static async getSponsorshipApplicationDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const detail = await AdminService.getSponsorshipApplicationDetail(id);
      return sendSuccess(res, detail, 'Sponsorship application detail retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage 2: Admin approves a sponsorship application
   */
  static async approveSponsorshipApplication(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adminId = req.user?.userId;
      if (!adminId) {
        return sendError(res, 'Authentication required.', 401);
      }
      const notes = req.body?.notes;
      const approved = await AdminService.approveSponsorshipApplication(id, adminId, notes);
      return sendSuccess(res, approved, 'Sponsorship application approved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage 2: Admin rejects a sponsorship application with mandatory reason
   */
  static async rejectSponsorshipApplication(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adminId = req.user?.userId;
      if (!adminId) {
        return sendError(res, 'Authentication required.', 401);
      }
      const { rejection_reason } = req.body;
      const rejected = await AdminService.rejectSponsorshipApplication(id, adminId, rejection_reason);
      return sendSuccess(res, rejected, 'Sponsorship application rejected.');
    } catch (error) {
      next(error);
    }
  }
}
