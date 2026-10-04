import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

export interface FormattedZodError {
  field: string;
  message: string;
}

/**
 * Formats Zod validation issues into an array of structured field-message objects.
 */
export const formatZodIssues = (error: ZodError): FormattedZodError[] => {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
};

/**
 * Middleware factory that validates req.body against a Zod schema.
 * Replaces req.body with the parsed/transformed data on success.
 */
export const validateBody = (schema: ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formatted = formatZodIssues(result.error);
      const firstMessage = formatted[0]?.message || 'Validation failed.';

      res.status(400).json({
        success: false,
        message: firstMessage,
        error: 'VALIDATION_ERROR',
        errors: formatted,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};

/**
 * Middleware factory that validates req.query against a Zod schema.
 */
export const validateQuery = (schema: ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const formatted = formatZodIssues(result.error);
      const firstMessage = formatted[0]?.message || 'Invalid query parameters.';

      res.status(400).json({
        success: false,
        message: firstMessage,
        error: 'VALIDATION_ERROR',
        errors: formatted,
      });
      return;
    }

    try {
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      (req as any).query = result.data;
    }
    next();
  };
};

/**
 * Middleware factory that validates req.params against a Zod schema.
 */
export const validateParams = (schema: ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const formatted = formatZodIssues(result.error);
      const firstMessage = formatted[0]?.message || 'Invalid path parameters.';

      res.status(400).json({
        success: false,
        message: firstMessage,
        error: 'VALIDATION_ERROR',
        errors: formatted,
      });
      return;
    }

    try {
      Object.defineProperty(req, 'params', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      req.params = result.data;
    }
    next();
  };
};

/**
 * Middleware factory that validates any combination of body, query, and params.
 */
export const validateRequest = (schemas: {
  body?: ZodType<any>;
  query?: ZodType<any>;
  params?: ZodType<any>;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: FormattedZodError[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        allErrors.push(...formatZodIssues(result.error));
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        allErrors.push(...formatZodIssues(result.error));
      } else {
        try {
          Object.defineProperty(req, 'query', {
            value: result.data,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        } catch {
          (req as any).query = result.data;
        }
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        allErrors.push(...formatZodIssues(result.error));
      } else {
        try {
          Object.defineProperty(req, 'params', {
            value: result.data,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        } catch {
          req.params = result.data;
        }
      }
    }

    if (allErrors.length > 0) {
      const firstMessage = allErrors[0]?.message || 'Validation failed.';

      res.status(400).json({
        success: false,
        message: firstMessage,
        error: 'VALIDATION_ERROR',
        errors: allErrors,
      });
      return;
    }

    next();
  };
};

// Legacy manual validators kept for backward compatibility until subsequent phases
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


