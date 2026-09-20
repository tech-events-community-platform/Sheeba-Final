import { Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest } from '../types';

export class TicketController {
  static async getMyTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tickets = await TicketService.getAttendeeTickets(userId);

      return sendSuccess(res, tickets, 'Attendee tickets retrieved.');
    } catch (error) {
      next(error);
    }
  }

  static async getTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.eventId as string;
      const userId = req.user!.userId;

      const ticket = await TicketService.getTicketByEventAndUser(eventId, userId);

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found for this event.' });
      }

      return sendSuccess(res, ticket, 'Ticket retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async getTicketById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ticketId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const ticket = await TicketService.getTicketById(ticketId, userId, userRole);

      return sendSuccess(res, ticket, 'Ticket details retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
}
