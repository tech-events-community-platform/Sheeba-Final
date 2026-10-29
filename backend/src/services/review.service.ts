import { query } from '../config/db';
import { CacheService } from './cache.service';
import { RecycleBinService } from './recycleBin.service';
import { UserRole } from '../types';

export interface EventReviewItem {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  isVerifiedAttendee: boolean;
  isMyReview?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventReviewsSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  reviews: EventReviewItem[];
  myReview?: EventReviewItem | null;
}

export class ReviewService {
  /**
   * Get all reviews and aggregated satisfaction metrics for an event.
   */
  static async getEventReviews(eventId: string, currentUserId?: string): Promise<EventReviewsSummary> {
    const queryText = `
      SELECT 
        r.id,
        r.event_id,
        r.user_id,
        r.rating,
        r.comment,
        r.is_anonymous,
        r.created_at,
        r.updated_at,
        u.full_name,
        u.email,
        u.avatar_url,
        (
          EXISTS(
            SELECT 1 FROM badge_awards b 
            WHERE b.event_id = r.event_id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
          ) 
          OR EXISTS(
            SELECT 1 FROM check_ins ci 
            WHERE ci.event_id = r.event_id AND ci.user_id = r.user_id AND ci.voided_at IS NULL
          )
        ) AS is_verified_attendee
      FROM event_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `;

    const result = await query(queryText, [eventId]);
    const rows = result.rows;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRating = 0;
    let myReview: EventReviewItem | null = null;

    const reviews: EventReviewItem[] = rows.map((row) => {
      const isOwner = Boolean(currentUserId && currentUserId === row.user_id);
      const rating = Number(row.rating);
      sumRating += rating;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      }

      const item: EventReviewItem = {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        userName: row.is_anonymous && !isOwner ? 'Verified Participant' : row.full_name,
        userAvatar: row.is_anonymous && !isOwner ? undefined : row.avatar_url,
        rating,
        comment: row.comment,
        isAnonymous: Boolean(row.is_anonymous),
        isVerifiedAttendee: Boolean(row.is_verified_attendee),
        isMyReview: isOwner,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      if (isOwner) {
        myReview = item;
      }

      return item;
    });

    const totalReviews = rows.length;
    const averageRating = totalReviews > 0 ? parseFloat((sumRating / totalReviews).toFixed(1)) : 0;

    return {
      averageRating,
      totalReviews,
      ratingDistribution,
      reviews,
      myReview,
    };
  }

  /**
   * Get the logged-in attendee's own review for this event (if any).
   */
  static async getUserReview(eventId: string, userId: string): Promise<EventReviewItem | null> {
    const res = await query(
      `SELECT r.*, u.full_name, u.avatar_url
       FROM event_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1 AND r.user_id = $2 AND r.deleted_at IS NULL`,
      [eventId, userId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      userName: row.full_name,
      userAvatar: row.avatar_url,
      rating: Number(row.rating),
      comment: row.comment,
      isAnonymous: Boolean(row.is_anonymous),
      isVerifiedAttendee: true,
      isMyReview: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Submit or update a review.
   * Validates that the user is registered or attended the event.
   */
  static async upsertReview(
    eventId: string,
    userId: string,
    data: { rating: number; comment: string; isAnonymous?: boolean }
  ): Promise<EventReviewItem> {
    // 1. Verify event exists
    const eventRes = await query('SELECT id, title FROM events WHERE id = $1', [eventId]);
    if (!eventRes.rowCount || eventRes.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Verify attendee is registered or attended
    const regRes = await query(
      `SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2 AND status = 'registered'`,
      [eventId, userId]
    );

    if (!regRes.rowCount || regRes.rowCount === 0) {
      // Also allow if they hold a ticket or badge
      const badgeOrTicket = await query(
        `SELECT 1 FROM tickets WHERE event_id = $1 AND user_id = $2
         UNION
         SELECT 1 FROM badge_awards WHERE event_id = $1 AND user_id = $2`,
        [eventId, userId]
      );
      if (!badgeOrTicket.rowCount || badgeOrTicket.rowCount === 0) {
        const err: any = new Error('Only registered or attended participants can review this event.');
        err.statusCode = 403;
        throw err;
      }
    }

    // 3. Upsert review
    const insertRes = await query(
      `INSERT INTO event_reviews (event_id, user_id, rating, comment, is_anonymous, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET 
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         is_anonymous = EXCLUDED.is_anonymous,
         updated_at = NOW()
       RETURNING *`,
      [eventId, userId, data.rating, data.comment.trim(), Boolean(data.isAnonymous)]
    );

    await CacheService.delPattern(`*http:*/api/reviews/event/${eventId}*`);
    await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
    await CacheService.delPattern(`event:${eventId}*`);
    await CacheService.delPattern(`report:${eventId}*`);

    const saved = insertRes.rows[0];
    const userRes = await query('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    return {
      id: saved.id,
      eventId: saved.event_id,
      userId: saved.user_id,
      userName: user?.full_name || 'Attendee',
      userAvatar: user?.avatar_url,
      rating: Number(saved.rating),
      comment: saved.comment,
      isAnonymous: Boolean(saved.is_anonymous),
      isVerifiedAttendee: true,
      isMyReview: true,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  }

  /**
   * Edit a review.
   * STRICT AUTHOR-ONLY CHECK: only the author who wrote the review can modify it.
   */
  static async updateReview(
    reviewId: string,
    userId: string,
    data: { rating?: number; comment?: string; isAnonymous?: boolean }
  ): Promise<EventReviewItem> {
    const existingRes = await query('SELECT * FROM event_reviews WHERE id = $1', [reviewId]);
    if (!existingRes.rowCount || existingRes.rowCount === 0) {
      const err: any = new Error('Review not found.');
      err.statusCode = 404;
      throw err;
    }

    const existing = existingRes.rows[0];

    // Enforce author-only modification
    if (existing.user_id !== userId) {
      const err: any = new Error('Permission denied. You can only edit your own review.');
      err.statusCode = 403;
      throw err;
    }

    const updatedRating = data.rating !== undefined ? data.rating : existing.rating;
    const updatedComment = data.comment !== undefined ? data.comment.trim() : existing.comment;
    const updatedAnonymous = data.isAnonymous !== undefined ? data.isAnonymous : existing.is_anonymous;

    const updateRes = await query(
      `UPDATE event_reviews
       SET rating = $1,
           comment = $2,
           is_anonymous = $3,
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [updatedRating, updatedComment, updatedAnonymous, reviewId, userId]
    );

    await CacheService.delPattern(`*http:*/api/reviews/event/${existing.event_id}*`);
    await CacheService.delPattern(`*http:*/api/events/${existing.event_id}*`);
    await CacheService.delPattern(`event:${existing.event_id}*`);
    await CacheService.delPattern(`report:${existing.event_id}*`);

    const saved = updateRes.rows[0];
    const userRes = await query('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    return {
      id: saved.id,
      eventId: saved.event_id,
      userId: saved.user_id,
      userName: user?.full_name || 'Attendee',
      userAvatar: user?.avatar_url,
      rating: Number(saved.rating),
      comment: saved.comment,
      isAnonymous: Boolean(saved.is_anonymous),
      isVerifiedAttendee: true,
      isMyReview: true,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  }

  /**
   * Delete a review.
   * Can be performed by the author or an Admin.
   */
  static async deleteReview(reviewId: string, userId: string, userRole?: UserRole): Promise<boolean> {
    const existingRes = await query('SELECT * FROM event_reviews WHERE id = $1', [reviewId]);
    if (!existingRes.rowCount || existingRes.rowCount === 0) {
      const err: any = new Error('Review not found.');
      err.statusCode = 404;
      throw err;
    }

    const existing = existingRes.rows[0];
    if (existing.user_id !== userId && userRole !== 'admin') {
      const err: any = new Error('Permission denied. You can only delete your own review.');
      err.statusCode = 403;
      throw err;
    }

    await query('UPDATE event_reviews SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, reviewId]);

    await RecycleBinService.recordAuditLog({
      entityType: 'review',
      entityId: reviewId,
      action: 'soft_delete',
      performedBy: userId,
      entityTitle: `Review on event ${existing.event_id}`,
      metadata: { eventId: existing.event_id, rating: existing.rating },
    });
    await CacheService.delPattern(`*http:*/api/reviews/event/${existing.event_id}*`);
    await CacheService.delPattern(`*http:*/api/events/${existing.event_id}*`);
    await CacheService.delPattern(`event:${existing.event_id}*`);
    await CacheService.delPattern(`report:${existing.event_id}*`);
    return true;
  }
}
