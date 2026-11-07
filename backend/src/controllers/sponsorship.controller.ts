import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { SponsorshipService } from '../services/sponsorship.service';
import { CacheService } from '../services/cache.service';
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
   * Admin retrieves all marketplace sponsorship pitches for oversight and take-down
   */
  static async getApplicationsForAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        sendError(res, 'Admin authorization required.', 403);
        return;
      }
      const applications = await SponsorshipService.getAllApplicationsForAdmin();
      sendSuccess(res, applications, 'Sponsorship pitches retrieved for admin.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sponsors explore open applications in the marketplace
   */
  static async exploreApplications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, search, minBudget, maxBudget, refresh } = req.query;
      if (refresh === 'true') {
        await CacheService.delPattern('sponsorship:explore*');
      }

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

      const id = String(req.params.id || req.body?.id || '').trim();
      const isAdmin = req.user?.role === 'admin';
      const deleted = await SponsorshipService.deleteApplication(id, organizerId, isAdmin);
      if (!deleted) {
        sendError(res, 'Application not found or you do not have permission to delete it.', 404);
        return;
      }

      sendSuccess(res, { deleted: true }, 'Application deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 1: Organizer views incoming sponsors and deals across their pitches/events
   */
  static async getOrganizerMySponsors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const sponsors = await SponsorshipService.getOrganizerMySponsors(organizerId);
      sendSuccess(res, sponsors, 'Organizer sponsors and deals retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 1: Retrieve real public profile of a sponsor
   */
  static async getSponsorProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.params.sponsorId as string;
      if (!sponsorId) {
        sendError(res, 'Sponsor ID is required.', 400);
        return;
      }

      const profile = await SponsorshipService.getSponsorProfile(sponsorId);
      sendSuccess(res, profile, 'Sponsor profile retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 1: Organizer accepts a deal (green Deal action)
   */
  static async acceptDeal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      const dealId = req.params.id as string;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const deal = await SponsorshipService.acceptDeal(dealId, organizerId);
      sendSuccess(res, deal, 'Sponsorship deal accepted successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 1: Organizer rejects a sponsor deal
   */
  static async rejectDeal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      const dealId = req.params.id as string;
      const reason = req.body?.reason;
      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const deal = await SponsorshipService.rejectDeal(dealId, organizerId, reason);
      sendSuccess(res, deal, 'Sponsorship interest rejected.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 1: Sponsor withdraws unfinalized interest
   */
  static async withdrawDeal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      const dealId = req.params.id as string;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const deal = await SponsorshipService.withdrawDeal(dealId, sponsorId);
      sendSuccess(res, deal, 'Sponsorship interest withdrawn successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Organizer explicitly toggles attendee-information sharing for an accepted deal
   */
  static async toggleAttendeeSharing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user?.userId;
      const dealId = req.params.id as string;
      const allowSharing = Boolean(req.body?.allow_sharing);

      if (!organizerId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const result = await SponsorshipService.toggleAttendeeSharing(dealId, organizerId, allowSharing);
      const msg = allowSharing
        ? 'Attendee-information sharing successfully enabled for this sponsor.'
        : 'Attendee-information sharing revoked for this sponsor.';
      sendSuccess(res, result, msg);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Sponsor retrieves events they expressed interest in, with deal status & sharing permissions
   */
  static async getSponsorMyEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const events = await SponsorshipService.getSponsorMyEvents(sponsorId);
      sendSuccess(res, events, 'Sponsor events retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Sponsor retrieves checked-in attendees ONLY (data minimization: names only)
   */
  static async getSponsorCheckedInAttendees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      const dealId = req.params.id as string;

      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const result = await SponsorshipService.getSponsorCheckedInAttendees(dealId, sponsorId);
      sendSuccess(res, result, 'Checked-in attendees retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 3: Retrieve current active questionnaire definition for a sponsorship deal
   */
  static async getSponsorQuestionnaire(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      const dealId = String(req.params.dealId || req.params.id);

      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const questionnaire = await SponsorshipService.getSponsorQuestionnaire(dealId, sponsorId);
      sendSuccess(res, questionnaire, 'Sponsor questionnaire retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 3: Save or update sponsor questionnaire definition
   */
  static async saveSponsorQuestionnaire(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      const dealId = String(req.params.dealId || req.params.id);
      const { title, questions } = req.body;

      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const saved = await SponsorshipService.saveSponsorQuestionnaire(dealId, sponsorId, title, questions);
      sendSuccess(res, saved, 'Sponsor questionnaire saved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 3: Record an attendee's questionnaire answers
   */
  static async recordAttendeeResponse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      const dealId = String(req.params.dealId || req.params.id);
      const attendeeId = String(req.params.attendeeId);
      const { answers, status } = req.body;

      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const recorded = await SponsorshipService.recordAttendeeResponse(
        dealId,
        sponsorId,
        attendeeId,
        answers,
        sponsorId,
        status || 'COMPLETED'
      );
      sendSuccess(res, recorded, 'Attendee response recorded successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 3: Get an attendee's questionnaire response
   */
  static async getAttendeeResponse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      const dealId = String(req.params.dealId || req.params.id);
      const attendeeId = String(req.params.attendeeId);

      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const response = await SponsorshipService.getAttendeeResponse(dealId, sponsorId, attendeeId);
      sendSuccess(res, response, 'Attendee response retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 4: Retrieve sponsor reports summary (genuine counts only)
   */
  static async getSponsorReportsSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const summary = await SponsorshipService.getSponsorReportsSummary(sponsorId);
      sendSuccess(res, summary, 'Sponsor reports summary retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }
}
