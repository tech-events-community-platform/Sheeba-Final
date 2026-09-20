import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export const validateRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name) {
    sendError(res, 'Email, password, and full name are required.', 400);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    sendError(res, 'Please provide a valid email address.', 400);
    return;
  }

  if (password.length < 6) {
    sendError(res, 'Password must be at least 6 characters long.', 400);
    return;
  }

  if (role) {
    const normalized = String(role).toLowerCase();
    if (normalized === 'admin') {
      sendError(res, 'Administrator accounts cannot be created via public registration.', 403);
      return;
    }
    if (!['attendee', 'organizer'].includes(normalized)) {
      sendError(res, 'Role must be either ATTENDEE or ORGANIZER.', 400);
      return;
    }
  }

  next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    sendError(res, 'Email and password are required.', 400);
    return;
  }

  next();
};

export const validateEvent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { title, description, event_date, date, location, capacity } = req.body;
  const targetDate = event_date || date;

  if (!title || !description || !targetDate || !location || capacity === undefined) {
    sendError(
      res,
      'Title, description, date, location, and capacity are required.',
      400
    );
    return;
  }

  const parsedDate = new Date(targetDate);
  if (isNaN(parsedDate.getTime())) {
    sendError(res, 'Invalid date format. Use YYYY-MM-DD or ISO 8601 string.', 400);
    return;
  }

  const parsedCapacity = parseInt(capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    sendError(res, 'Capacity must be a positive integer.', 400);
    return;
  }

  next();
};

export const validateCheckIn = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { qr_token, event_id, eventId, attendeeId, attendeeRosterId } = req.body;

  if (!qr_token && !attendeeId && !attendeeRosterId) {
    sendError(res, 'QR token or attendee ID is required.', 400);
    return;
  }

  next();
};
