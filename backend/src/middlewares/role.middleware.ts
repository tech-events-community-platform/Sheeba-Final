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

    // Admin always passes without DB hit (admin can't be demoted via normal flow)
    if (userRole === 'admin' && normalizedAllowed.includes('admin')) {
      return next();
    }

    // If organizer is not in allowed roles, normal role check applies
    if (!normalizedAllowed.includes('organizer')) {
      if (normalizedAllowed.includes(userRole)) {
        return next();
      }
    } else {
      // Route allows organizer. If the user has another matching allowed role (e.g. attendee), pass through
      if (userRole !== 'organizer' && normalizedAllowed.includes(userRole)) {
        return next();
      }
    }

    // Dynamic verification: If 'organizer' is allowed, verify whether the user has an active, approved organizer profile in DB
    if (normalizedAllowed.includes('organizer') && req.user.userId) {
      try {
        const userCheck = await query(
          'SELECT role, is_organizer, organizer_approval_status, approval_status, is_active FROM users WHERE id = $1',
          [req.user.userId]
        );
        if (userCheck.rowCount && userCheck.rowCount > 0) {
          const row = userCheck.rows[0];
          if (row.role?.toLowerCase() === 'admin') {
            req.user.role = 'admin';
            return next();
          }

          const isApprovedOrg =
            row.is_active !== false &&
            (row.organizer_approval_status === 'approved' ||
              (row.role?.toLowerCase() === 'organizer' && row.approval_status === 'approved'));

          if (isApprovedOrg) {
            req.user.role = 'organizer';
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
