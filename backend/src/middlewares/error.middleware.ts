import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Unhandled Error:', err);

  // PostgreSQL unique constraint error
  if (err.code === '23505') {
    if (err.constraint === 'unique_event_user_registration') {
      sendError(res, 'You are already registered for this event.', 409);
      return;
    }
    if (err.detail && err.detail.includes('email')) {
      sendError(res, 'An account with this email already exists.', 409);
      return;
    }
    sendError(res, 'Duplicate record already exists.', 409);
    return;
  }

  // PostgreSQL foreign key error
  if (err.code === '23503') {
    sendError(res, 'Referenced resource not found.', 404);
    return;
  }

  // PostgreSQL invalid syntax / UUID format error
  if (err.code === '22P02') {
    sendError(res, 'Invalid request parameter or resource identifier format.', 400);
    return;
  }

  // PostgreSQL string value too long
  if (err.code === '22001') {
    sendError(res, 'Input value exceeds the maximum allowed length.', 400);
    return;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid authentication token provided.', 401);
    return;
  }
  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Your session has expired. Please log in again.', 401);
    return;
  }

  // Malformed JSON payload in HTTP request
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    sendError(res, 'Malformed JSON payload in request.', 400);
    return;
  }

  // Bcrypt argument error fallback
  if (err.message && typeof err.message === 'string' && err.message.includes('Illegal arguments')) {
    sendError(res, 'Invalid credentials provided.', 400);
    return;
  }

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // In production, mask unhandled 500 internal errors so database queries or internal traces never leak
  const clientMessage =
    isProd && statusCode === 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  if (err.isPendingApproval) {
    res.status(statusCode).json({
      success: false,
      message: clientMessage,
      isPendingApproval: true,
      approvalStatus: err.approvalStatus || 'pending',
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    code: isProd && statusCode === 500 ? undefined : (err.code || undefined),
    error: isProd && statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : (err.code || err.message),
    data: err.data || undefined,
    isPendingApproval: err.isPendingApproval,
    ...(!isProd && { stack: err.stack }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

