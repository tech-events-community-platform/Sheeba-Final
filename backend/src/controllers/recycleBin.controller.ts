import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { RecycleBinService, RecycleBinEntityType } from '../services/recycleBin.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class RecycleBinController {
  /**
   * Get items in the user's authorized Recycle Bin
   */
  static async getItems(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const entityType = req.query.entityType as string | undefined;
      const search = req.query.search as string | undefined;

      const items = await RecycleBinService.getRecycleBinItems(userId, userRole, {
        entityType,
        search,
      });

      sendSuccess(res, items, 'Recycle Bin items retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Recycle Bin statistics and breakdown for current user
   */
  static async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const stats = await RecycleBinService.getStats(userId, userRole);
      sendSuccess(res, stats, 'Recycle Bin stats retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore an item from the Recycle Bin
   */
  static async restoreItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const entityType = req.params.entityType as RecycleBinEntityType;
      const entityId = String(req.params.id);

      const result = await RecycleBinService.restoreItem(userId, userRole, entityType, entityId);
      sendSuccess(res, result.restoredItem, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Permanently delete an item from the Recycle Bin
   */
  static async permanentlyDeleteItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const entityType = req.params.entityType as RecycleBinEntityType;
      const entityId = String(req.params.id);

      const result = await RecycleBinService.permanentlyDeleteItem(userId, userRole, entityType, entityId);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger retention policy purge of items older than 30 days (Admin only)
   */
  static async purgeExpired(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role?.toLowerCase();
      if (userRole !== 'admin') {
        sendError(res, 'Administrator access required to perform retention purge.', 403);
        return;
      }

      const result = await RecycleBinService.purgeExpiredItems();
      sendSuccess(
        res,
        result,
        `Retention purge executed. Successfully removed ${result.purgedCount} expired item(s).`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Recycle Bin audit trail logs (Admin only)
   */
  static async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role?.toLowerCase();
      if (userRole !== 'admin') {
        sendError(res, 'Administrator access required to view audit trail logs.', 403);
        return;
      }

      const limit = parseInt(req.query.limit as string || '50', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);

      const logs = await RecycleBinService.getAuditLogs({ limit, offset });
      sendSuccess(res, logs, 'Recycle Bin audit logs retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
}
