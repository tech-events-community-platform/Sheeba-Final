import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { SponsorMatchingService } from '../services/matching/sponsorMatching.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class MatchingController {
  /**
   * Protected endpoint for sponsors to retrieve their personalized Top 10 matching events
   * GET /api/sponsorship/recommendations
   */
  static async getRecommendations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const limit = req.query.limit ? Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10))) : 10;
      const objective = req.query.objective ? String(req.query.objective) : undefined;
      const category = req.query.category ? String(req.query.category) : undefined;
      const location = req.query.location ? String(req.query.location) : undefined;

      const overridePrefs: any = {};
      if (objective) overridePrefs.sponsorshipObjectives = [objective];
      if (category) overridePrefs.targetInterests = [category];
      if (location) overridePrefs.preferredLocations = [location];

      const recommendations = await SponsorMatchingService.getRecommendationsForSponsor(sponsorId, {
        limit,
        preferences: Object.keys(overridePrefs).length > 0 ? overridePrefs : undefined,
      });

      sendSuccess(
        res,
        recommendations,
        'Personalized sponsor event recommendations retrieved successfully.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Protected endpoint to get current sponsor matching preferences
   * GET /api/sponsorship/preferences
   */
  static async getPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const data = await SponsorMatchingService.getSponsorPreferences(sponsorId);
      sendSuccess(res, data, 'Sponsor matching preferences retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Protected endpoint to update sponsor matching preferences
   * PUT /api/sponsorship/preferences
   */
  static async updatePreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sponsorId = req.user?.userId;
      if (!sponsorId) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const updated = await SponsorMatchingService.updateSponsorPreferences(sponsorId, req.body);
      sendSuccess(res, updated, 'Sponsor matching preferences updated successfully.');
    } catch (error) {
      next(error);
    }
  }
}
