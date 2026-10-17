import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { CheckinService } from '../services/checkin.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest } from '../types';

export class EventController {
  static async createEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user!.userId;
      const {
        title,
        description,
        type,
        date,
        startTime,
        endTime,
        location,
        venueName,
        capacity,
        isPaid,
        isPublicized,
        ticketPrice,
        requiresApproval,
        requires_approval,
        customQuestions,
        bannerUrl,
        posterImageUrl,
      } = req.body;

      const event = await EventService.createEvent(organizerId, {
        title,
        description,
        type,
        date,
        startTime,
        endTime,
        location,
        venueName,
        capacity,
        isPaid,
        isPublicized,
        ticketPrice,
        requiresApproval: requiresApproval ?? requires_approval ?? false,
        customQuestions,
        bannerUrl: bannerUrl || posterImageUrl,
        posterImageUrl: posterImageUrl || bannerUrl,
      });

      return sendSuccess(res, event, 'Event created successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, type, status, organizerId, isPublicized } = req.query;

      const isPublicizedQuery = String(isPublicized).toLowerCase() === 'true';
      const isPrivilegedUser = Boolean(req.user && ['admin', 'organizer'].includes(req.user.role?.toLowerCase() || ''));

      let filterPublicized: boolean | undefined = undefined;
      // If not organizer/admin or explicitly querying discovery feed, return publicized events only
      if (!organizerId && !isPrivilegedUser) {
        filterPublicized = true;
      } else if (isPublicizedQuery) {
        filterPublicized = true;
      }

      const events = await EventService.getEvents({
        search: search as string,
        type: type as string,
        status: status as string,
        organizerId: organizerId as string,
        isPublicized: filterPublicized,
      });

      return sendSuccess(res, events, 'Events retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const identifier = (req.params.id || req.params.token) as string;
      const event = await EventService.getEventById(identifier);

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      return sendSuccess(res, event, 'Event details retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async getEventByShareToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      const event = await EventService.getEventById(token);

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      return sendSuccess(res, event, 'Event retrieved by share link.');
    } catch (error) {
      next(error);
    }
  }

  static async updateEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const updatedEvent = await EventService.updateEvent(
        eventId,
        userId,
        userRole,
        req.body
      );

      return sendSuccess(res, updatedEvent, 'Event updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async deleteEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      await EventService.deleteEvent(eventId, userId, userRole);

      return sendSuccess(res, null, 'Event deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async registerForEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const userId = req.user?.userId || req.body.attendee?.id;
      const answers = req.body.answers || {};
      const paymentReference = req.body.paymentReference;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required to register.' });
      }

      const result = await EventService.registerForEvent({
        eventId,
        userId,
        answers,
        paymentReference,
      });

      return sendSuccess(
        res,
        result,
        result.isPaymentRequired
          ? 'Payment required. Redirecting to Chapa checkout.'
          : 'Successfully registered for event. QR Ticket issued.',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async getEventRoster(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const roster = await EventService.getEventRoster(eventId, req.user?.userId, req.user?.role);

      return sendSuccess(res, roster, 'Event attendee roster retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async lookupAttendee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const queryText = (req.query.q || req.query.query || '') as string;
      const attendee = await CheckinService.lookupAttendee(eventId, queryText, req.user?.userId, req.user?.role);

      return sendSuccess(res, attendee, attendee ? 'Attendee record found.' : 'No matching record.');
    } catch (error) {
      next(error);
    }
  }

  static async removeAttendee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const targetId = (req.params.attendeeId || req.params.registrationId || req.params.targetId) as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      await EventService.removeAttendeeFromEvent(eventId, targetId, userId, userRole);

      return sendSuccess(res, null, 'Attendee removed from event successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async approveRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const registrationId = (req.params.registrationId || req.params.attendeeId) as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const result = await EventService.approveAttendeeRegistration(eventId, registrationId, userId, userRole);
      return sendSuccess(res, result, 'Attendee application approved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async rejectRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const registrationId = (req.params.registrationId || req.params.attendeeId) as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const reason = req.body?.reason;

      const result = await EventService.rejectAttendeeRegistration(eventId, registrationId, userId, userRole, reason);
      return sendSuccess(res, result, 'Attendee application rejected.');
    } catch (error) {
      next(error);
    }
  }

  static async bulkApproveRegistrations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const registrationIds = (req.body?.registrationIds || []) as string[];

      const result = await EventService.bulkApproveRegistrations(eventId, userId, userRole, registrationIds);
      return sendSuccess(res, result, `Successfully approved ${result.approvedCount} applicant(s).`);
    } catch (error) {
      next(error);
    }
  }
}
