import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ScannerService } from '../services/scanner.service';
import { sendSuccess } from '../utils/apiResponse';
import { query } from '../config/db';
import { EventService } from '../services/event.service';
import { EmailService } from '../services/email.service';
import { ScannerPrivacyUtil } from '../utils/scannerPrivacy.util';

export class ScannerController {
  /**
   * Organizer: Assign one or more scanners to an event by email.
   */
  static async assignScanners(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;
      const { emails } = req.body;

      const result = await ScannerService.assignScanners({
        eventId,
        organizerId,
        emails: Array.isArray(emails) ? emails : [emails],
        userRole,
      });

      return sendSuccess(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer: Get list of active scanners assigned to this event.
   */
  static async getEventScanners(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await ScannerService.getEventScanners(eventId, organizerId, userRole);
      return sendSuccess(res, result, 'Event scanners retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer: Immediately revoke an individual scanner.
   */
  static async removeScanner(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const scannerUserId = req.params.scannerId as string;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await ScannerService.removeScanner({
        eventId,
        organizerId,
        scannerUserId,
        userRole,
      });

      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer: Toggle requires_scanners for an event.
   * Disabling immediately revokes all assignments. Re-enabling starts with fresh empty list.
   */
  static async toggleScanners(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;
      const { enabled } = req.body;

      const result = await ScannerService.toggleScanners({
        eventId,
        organizerId,
        enabled: Boolean(enabled),
        userRole,
      });

      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer: Resend invitation email to an assigned scanner.
   */
  static async resendScannerInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const scannerUserId = req.params.scannerId as string;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const event = await EventService.getEventById(eventId);
      if (!event) {
        const err: any = new Error('Event not found.');
        err.statusCode = 404;
        throw err;
      }

      if (event.organizerId !== organizerId && userRole !== 'admin') {
        const err: any = new Error('Unauthorized.');
        err.statusCode = 403;
        throw err;
      }

      const userRes = await query('SELECT email, full_name FROM users WHERE id = $1', [scannerUserId]);
      if (!userRes.rowCount || userRes.rowCount === 0) {
        const err: any = new Error('Scanner user not found.');
        err.statusCode = 404;
        throw err;
      }

      const targetUser = userRes.rows[0];
      const formattedEventDate = ScannerPrivacyUtil.toLocalDayString(event.date);

      await EmailService.sendScannerAssignmentExistingUserEmail({
        toEmail: targetUser.email,
        fullName: targetUser.full_name,
        eventTitle: event.title,
        organizerName: (event as any).organizerName || 'The Organizer',
        eventDate: formattedEventDate || event.date,
        location: event.location,
      });

      return sendSuccess(res, null, `Invitation email resent to ${targetUser.email}.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scanner Portal: Get all active events assigned to the logged-in user.
   */
  static async getMyAssignedEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const events = await ScannerService.getMyAssignedEvents(userId);
      return sendSuccess(res, events, `Found ${events.length} assigned event(s).`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scanner Portal: Get attendance for a specific event with Timezone-Aware Privacy redaction.
   */
  static async getScannerEventAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const eventId = req.params.id as string;

      const attendance = await ScannerService.getScannerEventAttendance(userId, eventId);
      return sendSuccess(res, attendance, 'Scanner event attendance retrieved.');
    } catch (error) {
      next(error);
    }
  }
}

