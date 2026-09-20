import { Request, Response, NextFunction } from 'express';
import { BadgeService } from '../services/badge.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest, BadgeCode } from '../types';

export class BadgeController {
  static async getAllBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const badges = await BadgeService.getAllBadgeAwards();
      return sendSuccess(res, badges, 'Badge awards retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async getBadgeById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const badge = await BadgeService.getBadgeById(id);
      return sendSuccess(res, badge, 'Badge details retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async getAttendeeBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const badges = await BadgeService.getAttendeeBadges(userId);
      return sendSuccess(res, badges, 'Attendee badges retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async getAttendedBadgeHolders(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.eventId as string;
      const attendees = await BadgeService.getAttendedBadgeHolders(eventId);
      return sendSuccess(res, attendees, 'Attended badge holders retrieved.');
    } catch (error) {
      next(error);
    }
  }

  // Section 7: Single shared badge-award controller
  static async awardBadge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, event_id, attendeeId, attendee_id, badgeCode, badge_type, notes, organizerNote, organizer_note } = req.body;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const targetEventId = eventId || event_id;
      const targetAttendeeId = attendeeId || attendee_id;
      const targetBadgeCode = (badgeCode || badge_type) as BadgeCode;

      if (!targetEventId || !targetAttendeeId || !targetBadgeCode) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: eventId, attendeeId, badgeCode (Participant, Winner, Speaker).',
        });
      }

      const badge = await BadgeService.awardBadge({
        eventId: targetEventId,
        attendeeId: targetAttendeeId,
        badgeCode: targetBadgeCode,
        awardedByOrganizerId: organizerId,
        userRole,
        notes: notes || organizerNote || organizer_note,
      });

      return sendSuccess(res, badge, `Badge "${targetBadgeCode}" awarded successfully.`);
    } catch (error) {
      next(error);
    }
  }

  static async bulkAwardBadges(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { eventId, attendeeRosterIds, attendeeUserIds, badgeCode } = req.body;
      const organizerId = req.user!.userId;
      const userRole = req.user!.role;

      const userIds = attendeeUserIds || attendeeRosterIds || [];
      const result = await BadgeService.bulkAwardBadges({
        eventId,
        attendeeUserIds: userIds,
        badgeCode: badgeCode as BadgeCode,
        awardedByOrganizerId: organizerId,
        userRole,
      });

      return sendSuccess(res, result, `Successfully awarded ${result.awardedCount} badge(s).`);
    } catch (error) {
      next(error);
    }
  }

  static async revokeBadge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const badgeId = req.params.id as string;
      const revokedBy = req.user!.userId;
      const reason = req.body.reason;

      await BadgeService.adminRevokeBadge(badgeId, revokedBy, reason);
      return sendSuccess(res, null, 'Badge revoked successfully.');
    } catch (error) {
      next(error);
    }
  }
}
