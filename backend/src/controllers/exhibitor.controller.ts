import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ExhibitorService } from '../services/exhibitor.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class ExhibitorController {
  /**
   * Get exhibitor call config and stats for an event
   */
  static async getExhibitorCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = String(req.params.eventId);
      const call = await ExhibitorService.getExhibitorCall(eventId);
      sendSuccess(res, call, 'Exhibitor call settings retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save or update exhibitor call settings for an event (Organizer only)
   */
  static async upsertExhibitorCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      const call = await ExhibitorService.upsertExhibitorCall(organizerId, eventId, req.body, isAdmin);
      sendSuccess(res, call, 'Exhibitor call settings updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all vendors / exhibitors for an event with search & filters (Organizer only)
   */
  static async getEventVendors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const { search, source, status } = req.query as { search?: string; source?: string; status?: string };
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      const result = await ExhibitorService.getEventVendors(organizerId, eventId, { search, source, status }, isAdmin);
      sendSuccess(res, result, 'Event vendors retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer manually adds a vendor (manual or via sponsorship)
   */
  static async addManualVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      const vendor = await ExhibitorService.addManualVendor(organizerId, eventId, req.body, isAdmin);
      sendSuccess(res, vendor, 'Vendor added to event roster successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer updates a vendor record
   */
  static async updateVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const vendorId = String(req.params.vendorId);
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      const vendor = await ExhibitorService.updateVendor(organizerId, eventId, vendorId, req.body, isAdmin);
      sendSuccess(res, vendor, 'Vendor details updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer deletes a vendor record
   */
  static async deleteVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const vendorId = String(req.params.vendorId);
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      await ExhibitorService.deleteVendor(organizerId, eventId, vendorId, isAdmin);
      sendSuccess(res, null, 'Vendor removed from event successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public: Retrieve confirmed exhibitors for event page
   */
  static async getPublicEventExhibitors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = String(req.params.eventId);
      const exhibitors = await ExhibitorService.getPublicEventExhibitors(eventId);
      sendSuccess(res, exhibitors, 'Public exhibitors retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Explore events with open booth calls
   */
  static async exploreOpenCalls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, search } = req.query as { category?: string; search?: string };
      const calls = await ExhibitorService.exploreOpenCalls({ category, search });
      sendSuccess(res, calls, 'Open exhibitor calls retrieved.');
    } catch (error) {
      next(error);
    }
  }
}

