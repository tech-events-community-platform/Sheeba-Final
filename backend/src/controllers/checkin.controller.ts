import { Response, NextFunction } from 'express';
import { CheckinService } from '../services/checkin.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest } from '../types';

export class CheckinController {
  static async getTicketVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tokenOrCode = (req.query.token as string) || (req.query.code as string) || (req.body?.tokenOrCode as string) || (req.params?.token as string);
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const result = await CheckinService.getTicketVerification({
        tokenOrCode,
        userId,
        userRole,
      });

      return sendSuccess(res, result, 'Ticket verification details retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async verify(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, tokenOrCode } = req.body;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await CheckinService.verifyTicketForScanner({
        eventId,
        tokenOrCode,
        organizerId,
        userRole,
      });

      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, query: queryText } = req.body;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await CheckinService.searchAttendees(eventId, queryText || '', organizerId, userRole);

      return sendSuccess(res, result, `Found ${result.length} matching attendees.`);
    } catch (error) {
      next(error);
    }
  }

  static async lookup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, query: queryText } = req.body;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await CheckinService.lookupAttendee(eventId, queryText, organizerId, userRole);

      return sendSuccess(res, result, result ? 'Attendee record found.' : 'No attendee record found.');
    } catch (error) {
      next(error);
    }
  }

  static async markAttended(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, attendeeRosterId, attendeeId, notes, organizerNote } = req.body;
      const approvedByOrganizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await CheckinService.markAttended({
        eventId,
        attendeeId: attendeeId || attendeeRosterId,
        approvedByOrganizerId,
        userRole,
        notes: notes || organizerNote,
      });

      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async undo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, attendeeRosterId, attendeeId, reason } = req.body;
      const undoneByOrganizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await CheckinService.undoCheckIn({
        eventId,
        attendeeId: attendeeId || attendeeRosterId,
        undoneByOrganizerId,
        userRole,
        reason,
      });

      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async addManualAttendee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, name, email, phone } = req.body;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await CheckinService.addManualAttendee({
        eventId,
        organizerId,
        name,
        email,
        phone,
        userRole,
      });

      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: AuthRequest, res: Response, next: NextFunction) {
    return CheckinController.markAttended(req, res, next);
  }
}
