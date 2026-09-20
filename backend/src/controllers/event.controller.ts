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
        ticketPrice,
        customQuestions,
        bannerUrl,
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
        ticketPrice,
        customQuestions,
        bannerUrl,
      });

      return sendSuccess(res, event, 'Event created successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, type, status, organizerId } = req.query;

      const events = await EventService.getEvents({
        search: search as string,
        type: type as string,
        status: status as string,
        organizerId: organizerId as string,
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
}
