import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { TicketService } from '../services/ticket.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest } from '../types';

export class UserController {
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await UserService.getUserProfile(userId);

      return sendSuccess(res, user, 'Profile retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async getPublicProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const viewerId = req.user?.userId;
      const viewerRole = req.user?.role;
      const data = await UserService.getPublicProfile(id, viewerId, viewerRole);

      return sendSuccess(res, data, 'Public profile retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { full_name, phone, bio, organization, visibility, avatar_url } = req.body;
      const updatedUser = await UserService.updateUserProfile(userId, {
        full_name,
        phone,
        bio,
        organization,
        visibility,
        avatar_url,
      });

      return sendSuccess(res, updatedUser, 'Profile updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async updateVisibility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { visibility } = req.body;
      await UserService.updateVisibility(userId, visibility);

      return sendSuccess(res, { visibility }, 'Profile visibility updated.');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await UserService.deleteAccount(userId);

      return sendSuccess(res, null, 'Account deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async exportUserData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';
      const data = await UserService.exportUserData(userId, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="sheba-data-export-${userId}.csv"`);
        return res.send(data);
      }

      return sendSuccess(res, data, 'User data export generated.');
    } catch (error) {
      next(error);
    }
  }

  static async getMyTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tickets = await TicketService.getAttendeeTickets(userId);

      return sendSuccess(res, tickets, 'Attendee tickets retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async getAttendanceHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const history = await UserService.getUserAttendanceHistory(userId);

      return sendSuccess(
        res,
        history,
        'Attendance and verified participation history retrieved.'
      );
    } catch (error) {
      next(error);
    }
  }
}
