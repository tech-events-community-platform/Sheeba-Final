import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ReviewService } from '../services/review.service';
import { sendSuccess } from '../utils/apiResponse';

export class ReviewController {
  static async getEventReviews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = String(req.params.eventId);
      const currentUserId = req.user?.userId;
      const result = await ReviewService.getEventReviews(eventId, currentUserId);
      return sendSuccess(res, result, 'Reviews retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async getUserReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = String(req.params.eventId);
      const userId = req.user!.userId;
      const review = await ReviewService.getUserReview(eventId, userId);
      return sendSuccess(res, review, 'User review retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async submitReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = String(req.params.eventId);
      const userId = req.user!.userId;
      const { rating, comment, isAnonymous } = req.body;
      const review = await ReviewService.upsertReview(eventId, userId, { rating, comment, isAnonymous });
      return sendSuccess(res, review, 'Review submitted successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reviewId = String(req.params.reviewId);
      const userId = req.user!.userId;
      const { rating, comment, isAnonymous } = req.body;
      const review = await ReviewService.updateReview(reviewId, userId, { rating, comment, isAnonymous });
      return sendSuccess(res, review, 'Review updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  static async deleteReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reviewId = String(req.params.reviewId);
      const userId = req.user!.userId;
      const userRole = req.user?.role;
      await ReviewService.deleteReview(reviewId, userId, userRole);
      return sendSuccess(res, { deleted: true }, 'Review deleted successfully.');
    } catch (error) {
      next(error);
    }
  }
}
