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
   * Stage 2: Sponsor submits formal sponsorship application to a pitch
   */
  static async submitFormalApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const deal = await SponsorshipService.submitFormalApplication(sponsorId, req.body);
      sendSuccess(res, deal, 'Sponsorship application submitted successfully. It is now pending administrator review.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sponsor marks an application as INTERESTED or DECLINED (or submits deal via legacy endpoint)
   */
  static async expressInterestOrDecline(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const { applicationId, status = 'PENDING', package_name, pledged_amount, sponsor_notes, proposal_message } = req.body;

      if (proposal_message && proposal_message.trim()) {
        // Handle as formal application
        const deal = await SponsorshipService.submitFormalApplication(sponsorId, {
          applicationId,
          package_name: package_name || 'Standard',
          pledged_amount: pledged_amount ? Number(pledged_amount) : 0,
          proposal_message: proposal_message.trim(),
          sponsor_notes,
        });
        sendSuccess(res, deal, 'Formal sponsorship application submitted and pending review.', 201);
        return;
      }

      const deal = await SponsorshipService.expressInterestOrDecline(sponsorId, applicationId, status, {
        package_name,
        pledged_amount,
        proposal_message,
        sponsor_notes,
      });

      const message = status === 'INTERESTED'
        ? 'Application added to your Deals & Pledges as Interested.'
        : status === 'PENDING'
          ? 'Application submitted for review.'
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
   * Sponsor updates deal notes or status
   */
  static async updateDeal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const dealId = req.params.id as string;
      const { status, sponsor_notes, proposal_message } = req.body;

      const deal = await SponsorshipService.updateDealStatus(dealId, sponsorId, status, sponsor_notes, proposal_message);
      sendSuccess(res, deal, `Deal status updated to ${status}.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage 2: Organizer views approved sponsors for a specific pitch
   */
  static async getApprovedSponsorsForPitch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const pitchId = req.params.id as string;
      const userRole = req.user?.role;
      const data = await SponsorshipService.getApprovedSponsorsForPitch(pitchId, organizerId, userRole);
      sendSuccess(res, data, 'Approved sponsors for pitch retrieved successfully.');
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
      const success = await SponsorshipService.deleteApplication(id, organizerId);

      if (!success) {
        sendError(res, 'Application not found or unauthorized to delete.', 404);
        return;
      }

      sendSuccess(res, { id }, 'Sponsorship application deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save or update a deliverable (Sponsor)
   */
  static async saveDeliverable(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const data = await SponsorshipService.saveDeliverable(sponsorId, req.body);
      sendSuccess(res, data, 'Deliverable saved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all deliverables for current sponsor
   */
  static async getMyDeliverables(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const data = await SponsorshipService.getDeliverablesForSponsor(sponsorId);
      sendSuccess(res, data, 'Sponsor deliverables retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deliverable for a specific deal
   */
  static async getDealDeliverable(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role || '';
      if (!userId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const dealId = (req.params.dealId || req.params.id) as string;
      const data = await SponsorshipService.getDeliverableForDeal(dealId, userId, userRole);
      sendSuccess(res, data, 'Deal deliverable retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete deliverable
   */
  static async deleteDeliverable(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }
      const id = req.params.id as string;
      await SponsorshipService.deleteDeliverable(id, sponsorId);
      sendSuccess(res, { id }, 'Deliverable deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

}
