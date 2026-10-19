import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { sendError } from '../utils/apiResponse';
import { query } from '../config/db';

export const authorizeRoles = (...allowedRoles: (UserRole | string)[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Unauthorized. Please log in first.', 401);
      return;
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    // Dynamic verification: If 'organizer' is allowed, verify whether the user has an approved organizer profile in DB
    if (normalizedAllowed.includes('organizer') && req.user.userId) {
      try {
        const userCheck = await query(
          'SELECT role, is_organizer, organizer_approval_status, approval_status FROM users WHERE id = $1',
          [req.user.userId]
        );
        if (userCheck.rowCount && userCheck.rowCount > 0) {
          const row = userCheck.rows[0];
          const isApprovedOrg =
            row.role?.toLowerCase() === 'organizer' ||
            row.role?.toLowerCase() === 'admin' ||
            (Boolean(row.is_organizer) && row.organizer_approval_status === 'approved');

          if (isApprovedOrg) {
            req.user.role = row.role?.toLowerCase() === 'admin' ? 'admin' : 'organizer';
            return next();
          }
        }
      } catch (err) {
        // Fall through to 403
      }
    }

    sendError(
      res,
      `Forbidden. Access restricted to: ${allowedRoles.join(', ')}`,
      403
    );
  };
};
