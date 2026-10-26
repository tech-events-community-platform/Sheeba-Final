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

  /**
   * Exhibitor: Submit booth application for an event
   */
  static async applyForBooth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = String(req.params.eventId);
      const userId = req.user?.userId;

      if (!userId) {
        sendError(res, 'Authentication required. Please log in as an exhibitor to apply.', 401);
        return;
      }

      const application = await ExhibitorService.applyForBooth(userId, eventId, req.body);
      sendSuccess(res, application, 'Exhibitor application submitted successfully. Status: Under Review.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Retrieve all booth applications & confirmed booths
   */
  static async getMyBooths(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const booths = await ExhibitorService.getMyBooths(userId);
      sendSuccess(res, booths, 'Exhibitor booths retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Process platform payment for an accepted booth
   */
  static async payForBooth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const vendorId = String(req.params.vendorId);
      const paidVendor = await ExhibitorService.payForBooth(userId, vendorId, req.body);
      sendSuccess(res, paidVendor, 'Booth payment processed and confirmed successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Get logged booth visitors
   */
  static async getBoothVisitors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const vendorId = String(req.params.vendorId);
      const visitors = await ExhibitorService.getBoothVisitors(userId, vendorId);
      sendSuccess(res, visitors, 'Booth visitors retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Add a visitor who stopped by the booth
   */
  static async addBoothVisitor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const vendorId = String(req.params.vendorId);
      const visitor = await ExhibitorService.addBoothVisitor(userId, vendorId, req.body);
      sendSuccess(res, visitor, 'Booth visitor logged successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Delete a logged booth visitor
   */
  static async deleteBoothVisitor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const vendorId = String(req.params.vendorId);
      const visitorId = String(req.params.visitorId);
      await ExhibitorService.deleteBoothVisitor(userId, vendorId, visitorId);
      sendSuccess(res, null, 'Booth visitor deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Submit offline bank-transfer receipt for an accepted booth
   */
  static async submitBoothReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const vendorId = String(req.params.vendorId);
      const result = await ExhibitorService.submitBoothReceipt(userId, vendorId, req.body);
      sendSuccess(res, result, 'Payment receipt submitted successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exhibitor: Get receipt submission history for own booth booking
   */
  static async getBoothReceiptHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const vendorId = String(req.params.vendorId);
      const history = await ExhibitorService.getBoothReceiptHistory(userId, vendorId);
      sendSuccess(res, history, 'Booth receipt history retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer: Get receipt submission history for an exhibitor booth in an event
   */
  static async getVendorReceiptHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const vendorId = String(req.params.vendorId);
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      const history = await ExhibitorService.getVendorReceiptHistory(organizerId, eventId, vendorId, isAdmin);
      sendSuccess(res, history, 'Vendor receipt history retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer: Verify and confirm offline bank transfer receipt
   */
  static async verifyBoothReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const vendorId = String(req.params.vendorId);
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      const result = await ExhibitorService.verifyBoothReceipt(organizerId, eventId, vendorId, req.body, isAdmin);
      sendSuccess(res, result, 'Booth payment receipt verified and booth confirmed successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer: Reject invalid offline bank transfer receipt
   */
  static async rejectBoothReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const eventId = String(req.params.eventId);
      const vendorId = String(req.params.vendorId);
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';

      const result = await ExhibitorService.rejectBoothReceipt(organizerId, eventId, vendorId, req.body, isAdmin);
      sendSuccess(res, result, 'Booth payment receipt rejected successfully.');
    } catch (error) {
      next(error);
    }
  }
}
