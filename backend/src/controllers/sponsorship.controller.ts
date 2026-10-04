import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { SponsorshipService } from '../services/sponsorship.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class SponsorshipController {
  /**
   * Organizer submits upcoming event sponsorship pitch
   */
  static async createApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const application = await SponsorshipService.createApplication(organizerId, req.body);
      sendSuccess(res, application, 'Sponsorship application published successfully to the marketplace.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer fetches all pitches they have created
   */
  static async getMyApplications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const applications = await SponsorshipService.getOrganizerApplications(organizerId);
      sendSuccess(res, applications, 'Organizer applications retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sponsors explore open applications in the marketplace
   */
  static async exploreApplications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, search, minBudget, maxBudget } = req.query;
      const applications = await SponsorshipService.getAllOpenApplications({
        category: category as string,
        search: search as string,
        minBudget: minBudget ? Number(minBudget) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
      });

      sendSuccess(res, applications, 'Open applications retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get application details by ID
   */
  static async getApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const application = await SponsorshipService.getApplicationById(id);
      sendSuccess(res, application, 'Application details retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sponsor marks an application as INTERESTED or DECLINED
   */
  static async expressInterestOrDecline(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const { applicationId, status, package_name, pledged_amount, sponsor_notes } = req.body;

      const deal = await SponsorshipService.expressInterestOrDecline(sponsorId, applicationId, status, {
        package_name,
        pledged_amount,
        sponsor_notes,
      });

      const message = status === 'INTERESTED'
        ? 'Application added to your Deals & Pledges as Interested.'
        : 'Application marked as Declined.';

      sendSuccess(res, deal, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sponsor views their deals pipeline (Deals & Pledges tab)
   */
  static async getMyDeals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const status = req.query.status as any;
      const deals = await SponsorshipService.getSponsorDeals(sponsorId, status);
      sendSuccess(res, deals, 'Sponsor deals retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sponsor updates deal status (e.g. toggle between INTERESTED and DECLINED)
   */
  static async updateDeal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const dealId = req.params.id as string;
      const { status, sponsor_notes } = req.body;

      const deal = await SponsorshipService.updateDealStatus(dealId, sponsorId, status, sponsor_notes);
      sendSuccess(res, deal, `Deal status updated to ${status}.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Organizer deletes or closes their pitch
   */
  static async deleteApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const id = req.params.id as string;
      const deleted = await SponsorshipService.deleteApplication(id, organizerId);
      if (!deleted) {
        sendError(res, 'Application not found or you do not have permission to delete it.', 404);
        return;
      }

      sendSuccess(res, { deleted: true }, 'Application deleted successfully.');
    } catch (error) {
      next(error);
    }
  }
}
