import { query } from '../config/db';
import { CacheService } from './cache.service';
import { UserRole } from '../types';

export type RecycleBinEntityType =
  | 'event'
  | 'registration'
  | 'sponsorship_application'
  | 'sponsorship_deal'
  | 'event_vendor'
  | 'user'
  | 'review';

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  deletedAt: string;
  deletedBy?: string;
  deletedByName?: string;
  expiresAt: string;
  daysRemaining: number;
  metadata?: Record<string, any>;
  canRestore: boolean;
  canPermanentDelete: boolean;
  permanentDeleteBlockReason?: string;
}

export interface RecycleBinStats {
  totalItems: number;
  expiringSoonCount: number; // <= 7 days
  byType: Record<string, number>;
}

export class RecycleBinService {
  public static RETENTION_DAYS = 30;

  /**
   * Log an action in the recycle bin audit trail
   */
  static async recordAuditLog(params: {
    entityType: RecycleBinEntityType;
    entityId: string;
    action: 'soft_delete' | 'restore' | 'permanent_delete' | 'purge_expired';
    performedBy?: string | null;
    entityTitle?: string | null;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO recycle_bin_audit_logs (
          entity_type, entity_id, action, performed_by, entity_title, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          params.entityType,
          params.entityId,
          params.action,
          params.performedBy || null,
          params.entityTitle || null,
          JSON.stringify(params.metadata || {}),
        ]
      );
    } catch (err: any) {
      console.warn('[RecycleBinService] Failed to record audit log:', err?.message || err);
    }
  }

  /**
   * Compute expiration date and days remaining given a deletion timestamp
   */
  static computeRetention(deletedAt: Date | string): { expiresAt: string; daysRemaining: number } {
    const d = new Date(deletedAt);
    const exp = new Date(d.getTime() + this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    return {
      expiresAt: exp.toISOString(),
      daysRemaining,
    };
  }

  /**
   * Fetch Recycle Bin items based strictly on user ID and role
   */
  static async getRecycleBinItems(
    userId: string,
    rawRole: string,
    filters: { entityType?: string; search?: string } = {}
  ): Promise<RecycleBinItem[]> {
    const role = (rawRole || 'attendee').toLowerCase() as UserRole;
    const items: RecycleBinItem[] = [];

    // -------------------------------------------------------------
    // 1. EVENTS (Organizers see their own; Admins see all)
    // -------------------------------------------------------------
    if (role === 'organizer' || role === 'admin') {
      if (!filters.entityType || filters.entityType === 'event') {
        let sql = `
          SELECT 
            e.id, e.title, e.event_type, e.event_date, e.location, e.status, e.is_paid, e.ticket_price,
            e.deleted_at, e.deleted_by, e.delete_reason,
            u.full_name AS organizer_name,
            del_u.full_name AS deleted_by_name,
            (SELECT COUNT(*)::int FROM registrations r WHERE r.event_id = e.id AND r.deleted_at IS NULL) AS registrations_count,
            (SELECT COUNT(*)::int FROM payments p WHERE p.event_id = e.id AND p.status IN ('SETTLED', 'REFUNDED')) AS settled_payments_count
          FROM events e
          JOIN users u ON e.organizer_id = u.id
          LEFT JOIN users del_u ON e.deleted_by = del_u.id
          WHERE e.deleted_at IS NOT NULL
        `;
        const params: any[] = [];
        if (role !== 'admin') {
          sql += ` AND e.organizer_id = $1`;
          params.push(userId);
        }
        sql += ` ORDER BY e.deleted_at DESC`;

        const res = await query(sql, params);
        for (const row of res.rows) {
          const { expiresAt, daysRemaining } = this.computeRetention(row.deleted_at);
          const settledCount = Number(row.settled_payments_count || 0);
          const hasProtectedFinances = settledCount > 0;

          items.push({
            id: row.id,
            entityType: 'event',
            title: row.title,
            subtitle: `${row.event_type ? row.event_type.toUpperCase() : 'EVENT'} • ${new Date(row.event_date).toLocaleDateString()}`,
            description: `${row.location} • ${row.registrations_count} registered attendee(s)${hasProtectedFinances ? ` • ${settledCount} financial transaction(s)` : ''}`,
            ownerId: row.organizer_id,
            ownerName: row.organizer_name,
            deletedAt: new Date(row.deleted_at).toISOString(),
            deletedBy: row.deleted_by,
            deletedByName: row.deleted_by_name || 'Organizer',
            expiresAt,
            daysRemaining,
            metadata: {
              status: row.status,
              isPaid: row.is_paid,
              ticketPrice: row.ticket_price,
              registrationsCount: row.registrations_count,
              settledPaymentsCount: settledCount,
            },
            canRestore: true,
            canPermanentDelete: !hasProtectedFinances,
            permanentDeleteBlockReason: hasProtectedFinances
              ? `Permanent deletion blocked: Contains ${settledCount} financial transaction(s) (settled or refunded). Financial records must be retained for compliance.`
              : undefined,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 2. REGISTRATIONS / ATTENDEES
    // Organizer sees registrations removed from their events.
    // Attendee sees registrations they cancelled / deleted.
    // Admin sees all deleted registrations.
    // -------------------------------------------------------------
    if (role === 'organizer' || role === 'attendee' || role === 'admin') {
      if (!filters.entityType || filters.entityType === 'registration') {
        let sql = `
          SELECT 
            r.id, r.event_id, r.user_id, r.status, r.approval_status, r.payment_status,
            r.deleted_at, r.deleted_by, r.delete_reason,
            e.title AS event_title, e.event_date, e.organizer_id,
            u.full_name AS attendee_name, u.email AS attendee_email,
            del_u.full_name AS deleted_by_name,
            (SELECT COUNT(*)::int FROM payments p WHERE p.event_id = r.event_id AND p.user_id = r.user_id AND p.status IN ('SETTLED', 'REFUNDED')) AS settled_payments_count
          FROM registrations r
          JOIN events e ON r.event_id = e.id
          JOIN users u ON r.user_id = u.id
          LEFT JOIN users del_u ON r.deleted_by = del_u.id
          WHERE r.deleted_at IS NOT NULL
        `;
        const params: any[] = [];
        if (role === 'organizer') {
          sql += ` AND e.organizer_id = $1`;
          params.push(userId);
        } else if (role === 'attendee') {
          sql += ` AND r.user_id = $1`;
          params.push(userId);
        }
        sql += ` ORDER BY r.deleted_at DESC`;

        const res = await query(sql, params);
        for (const row of res.rows) {
          const { expiresAt, daysRemaining } = this.computeRetention(row.deleted_at);
          const settledCount = Number(row.settled_payments_count || 0);
          const hasProtectedFinances = settledCount > 0;

          items.push({
            id: row.id,
            entityType: 'registration',
            title: role === 'attendee' ? `Registration: ${row.event_title}` : `${row.attendee_name} (${row.attendee_email})`,
            subtitle: role === 'attendee' ? `Event Date: ${new Date(row.event_date).toLocaleDateString()}` : `Removed from: ${row.event_title}`,
            description: `Status: ${row.status} • Payment: ${row.payment_status}${hasProtectedFinances ? ' (Protected)' : ''}`,
            ownerId: row.user_id,
            ownerName: row.attendee_name,
            deletedAt: new Date(row.deleted_at).toISOString(),
            deletedBy: row.deleted_by,
            deletedByName: row.deleted_by_name || 'System',
            expiresAt,
            daysRemaining,
            metadata: {
              eventId: row.event_id,
              eventTitle: row.event_title,
              userId: row.user_id,
              attendeeEmail: row.attendee_email,
              paymentStatus: row.payment_status,
              settledPaymentsCount: settledCount,
            },
            canRestore: true,
            canPermanentDelete: !hasProtectedFinances,
            permanentDeleteBlockReason: hasProtectedFinances
              ? 'Permanent deletion blocked: Financial payment records (settled or refunded) must be retained for auditing.'
              : undefined,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 3. SPONSORSHIP APPLICATIONS (Organizers see their own; Admins see all)
    // -------------------------------------------------------------
    if (role === 'organizer' || role === 'admin') {
      if (!filters.entityType || filters.entityType === 'sponsorship_application') {
        let sql = `
          SELECT 
            sa.id, sa.event_title, sa.event_type, sa.category, sa.funding_goal, sa.currency, sa.status,
            sa.deleted_at, sa.deleted_by, sa.organizer_id,
            u.full_name AS organizer_name,
            del_u.full_name AS deleted_by_name
          FROM sponsorship_applications sa
          JOIN users u ON sa.organizer_id = u.id
          LEFT JOIN users del_u ON sa.deleted_by = del_u.id
          WHERE sa.deleted_at IS NOT NULL
        `;
        const params: any[] = [];
        if (role !== 'admin') {
          sql += ` AND sa.organizer_id = $1`;
          params.push(userId);
        }
        sql += ` ORDER BY sa.deleted_at DESC`;

        const res = await query(sql, params);
        for (const row of res.rows) {
          const { expiresAt, daysRemaining } = this.computeRetention(row.deleted_at);
          items.push({
            id: row.id,
            entityType: 'sponsorship_application',
            title: `Sponsorship Pitch: ${row.event_title}`,
            subtitle: `${row.category || 'Tech'} • Funding Goal: ${row.funding_goal} ${row.currency || 'ETB'}`,
            description: `Status: ${row.status}`,
            ownerId: row.organizer_id,
            ownerName: row.organizer_name,
            deletedAt: new Date(row.deleted_at).toISOString(),
            deletedBy: row.deleted_by,
            deletedByName: row.deleted_by_name || 'Organizer',
            expiresAt,
            daysRemaining,
            metadata: {
              eventTitle: row.event_title,
              fundingGoal: row.funding_goal,
            },
            canRestore: true,
            canPermanentDelete: true,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 4. SPONSORSHIP DEALS (Sponsors see their own; Admins see all)
    // -------------------------------------------------------------
    if (role === 'sponsor' || role === 'admin') {
      if (!filters.entityType || filters.entityType === 'sponsorship_deal') {
        let sql = `
          SELECT 
            sd.id, sd.application_id, sd.sponsor_id, sd.status, sd.package_name, sd.pledged_amount,
            sd.deleted_at, sd.deleted_by,
            sa.event_title,
            u.full_name AS sponsor_name,
            del_u.full_name AS deleted_by_name
          FROM sponsorship_deals sd
          JOIN sponsorship_applications sa ON sd.application_id = sa.id
          JOIN users u ON sd.sponsor_id = u.id
          LEFT JOIN users del_u ON sd.deleted_by = del_u.id
          WHERE sd.deleted_at IS NOT NULL
        `;
        const params: any[] = [];
        if (role !== 'admin') {
          sql += ` AND sd.sponsor_id = $1`;
          params.push(userId);
        }
        sql += ` ORDER BY sd.deleted_at DESC`;

        const res = await query(sql, params);
        for (const row of res.rows) {
          const { expiresAt, daysRemaining } = this.computeRetention(row.deleted_at);
          items.push({
            id: row.id,
            entityType: 'sponsorship_deal',
            title: `Sponsorship Pledge: ${row.event_title}`,
            subtitle: `Package: ${row.package_name || 'Standard'} • Pledged: ${row.pledged_amount || 0} ETB`,
            description: `Status: ${row.status}`,
            ownerId: row.sponsor_id,
            ownerName: row.sponsor_name,
            deletedAt: new Date(row.deleted_at).toISOString(),
            deletedBy: row.deleted_by,
            deletedByName: row.deleted_by_name || 'Sponsor',
            expiresAt,
            daysRemaining,
            metadata: {
              applicationId: row.application_id,
              packageName: row.package_name,
              pledgedAmount: row.pledged_amount,
            },
            canRestore: true,
            canPermanentDelete: true,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 5. EVENT VENDORS / EXHIBITORS
    // Exhibitor sees their own booth applications.
    // Organizer sees vendors removed from their events.
    // Admin sees all.
    // -------------------------------------------------------------
    if (role === 'exhibitor' || role === 'organizer' || role === 'admin') {
      if (!filters.entityType || filters.entityType === 'event_vendor') {
        let sql = `
          SELECT 
            ev.id, ev.event_id, ev.user_id, ev.business_name, ev.contact_email, ev.status, ev.pricing_mode,
            ev.total_final_amount, ev.payment_status,
            ev.deleted_at, ev.deleted_by,
            e.title AS event_title, e.organizer_id,
            del_u.full_name AS deleted_by_name,
            (SELECT COUNT(*)::int FROM payments p WHERE p.vendor_id = ev.id AND p.status IN ('SETTLED', 'REFUNDED')) AS settled_payments_count
          FROM event_vendors ev
          JOIN events e ON ev.event_id = e.id
          LEFT JOIN users del_u ON ev.deleted_by = del_u.id
          WHERE ev.deleted_at IS NOT NULL
        `;
        const params: any[] = [];
        if (role === 'exhibitor') {
          sql += ` AND ev.user_id = $1`;
          params.push(userId);
        } else if (role === 'organizer') {
          sql += ` AND e.organizer_id = $1`;
          params.push(userId);
        }
        sql += ` ORDER BY ev.deleted_at DESC`;

        const res = await query(sql, params);
        for (const row of res.rows) {
          const { expiresAt, daysRemaining } = this.computeRetention(row.deleted_at);
          const settledCount = Number(row.settled_payments_count || 0);
          const hasProtectedFinances = settledCount > 0;

          items.push({
            id: row.id,
            entityType: 'event_vendor',
            title: `Exhibitor Booth: ${row.business_name}`,
            subtitle: `Event: ${row.event_title} • Mode: ${row.pricing_mode || 'per_sqm'}`,
            description: `Contact: ${row.contact_email} • Payment: ${row.payment_status}${hasProtectedFinances ? ' (Protected)' : ''}`,
            ownerId: row.user_id,
            ownerName: row.business_name,
            deletedAt: new Date(row.deleted_at).toISOString(),
            deletedBy: row.deleted_by,
            deletedByName: row.deleted_by_name || 'User',
            expiresAt,
            daysRemaining,
            metadata: {
              eventId: row.event_id,
              eventTitle: row.event_title,
              paymentStatus: row.payment_status,
              settledPaymentsCount: settledCount,
            },
            canRestore: true,
            canPermanentDelete: !hasProtectedFinances,
            permanentDeleteBlockReason: hasProtectedFinances
              ? 'Permanent deletion blocked: Financial payment records (settled or refunded) must be retained for auditing.'
              : undefined,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 6. USERS (ADMIN ONLY - Section 4.B strictly enforces this!)
    // -------------------------------------------------------------
    if (role === 'admin') {
      if (!filters.entityType || filters.entityType === 'user') {
        const sql = `
          SELECT 
            u.id, u.full_name, u.email, u.role, u.organization, u.company_name, u.deleted_at, u.deleted_by,
            del_u.full_name AS deleted_by_name
          FROM users u
          LEFT JOIN users del_u ON u.deleted_by = del_u.id
          WHERE u.deleted_at IS NOT NULL
          ORDER BY u.deleted_at DESC
        `;
        const res = await query(sql);
        for (const row of res.rows) {
          const { expiresAt, daysRemaining } = this.computeRetention(row.deleted_at);
          items.push({
            id: row.id,
            entityType: 'user',
            title: `User Account: ${row.full_name} (${row.email})`,
            subtitle: `Role: ${row.role?.toUpperCase()} • Organization: ${row.organization || row.company_name || 'N/A'}`,
            description: `Deleted account eligible for restoration`,
            ownerId: row.id,
            ownerName: row.full_name,
            deletedAt: new Date(row.deleted_at).toISOString(),
            deletedBy: row.deleted_by,
            deletedByName: row.deleted_by_name || 'Admin',
            expiresAt,
            daysRemaining,
            metadata: {
              email: row.email,
              role: row.role,
            },
            canRestore: true,
            canPermanentDelete: true,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 7. EVENT REVIEWS (Attendee sees their own; Admin sees all)
    // -------------------------------------------------------------
    if (role === 'attendee' || role === 'admin') {
      if (!filters.entityType || filters.entityType === 'review') {
        let sql = `
          SELECT 
            er.id, er.event_id, er.user_id, er.rating, er.comment, er.deleted_at, er.deleted_by,
            e.title AS event_title,
            u.full_name AS attendee_name,
            del_u.full_name AS deleted_by_name
          FROM event_reviews er
          JOIN events e ON er.event_id = e.id
          JOIN users u ON er.user_id = u.id
          LEFT JOIN users del_u ON er.deleted_by = del_u.id
          WHERE er.deleted_at IS NOT NULL
        `;
        const params: any[] = [];
        if (role !== 'admin') {
          sql += ` AND er.user_id = $1`;
          params.push(userId);
        }
        sql += ` ORDER BY er.deleted_at DESC`;

        const res = await query(sql, params);
        for (const row of res.rows) {
          const { expiresAt, daysRemaining } = this.computeRetention(row.deleted_at);
          items.push({
            id: row.id,
            entityType: 'review',
            title: `Feedback on: ${row.event_title}`,
            subtitle: `Rating: ${'★'.repeat(row.rating)}${'☆'.repeat(5 - row.rating)} (${row.rating}/5)`,
            description: row.comment?.length > 100 ? `${row.comment.substring(0, 97)}...` : row.comment,
            ownerId: row.user_id,
            ownerName: row.attendee_name,
            deletedAt: new Date(row.deleted_at).toISOString(),
            deletedBy: row.deleted_by,
            deletedByName: row.deleted_by_name || 'User',
            expiresAt,
            daysRemaining,
            metadata: {
              eventId: row.event_id,
              rating: row.rating,
            },
            canRestore: true,
            canPermanentDelete: true,
          });
        }
      }
    }

    // Optional Search filter across title and subtitle
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.subtitle && it.subtitle.toLowerCase().includes(q)) ||
          (it.description && it.description.toLowerCase().includes(q))
      );
    }

    return items;
  }

  /**
   * Get Recycle Bin Summary Statistics for current user
   */
  static async getStats(userId: string, rawRole: string): Promise<RecycleBinStats> {
    const items = await this.getRecycleBinItems(userId, rawRole);
    const byType: Record<string, number> = {};
    let expiringSoonCount = 0;

    for (const item of items) {
      byType[item.entityType] = (byType[item.entityType] || 0) + 1;
      if (item.daysRemaining <= 7) {
        expiringSoonCount++;
      }
    }

    return {
      totalItems: items.length,
      expiringSoonCount,
      byType,
    };
  }

  /**
   * Restore an item with strict ownership and dependency verification
   */
  static async restoreItem(
    userId: string,
    rawRole: string,
    entityType: RecycleBinEntityType,
    entityId: string
  ): Promise<{ success: boolean; message: string; restoredItem: any }> {
    const role = (rawRole || 'attendee').toLowerCase() as UserRole;

    // -------------------------------------------------------------
    // RESTORE EVENT
    // -------------------------------------------------------------
    if (entityType === 'event') {
      const existing = await query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NOT NULL', [entityId]);
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deleted event not found or already restored.');
        err.statusCode = 404;
        throw err;
      }
      const event = existing.rows[0];

      if (event.organizer_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized. You can only restore events that you own.');
        err.statusCode = 403;
        throw err;
      }

      // Revalidate status based on date
      const expDate = new Date(event.event_date);
      const isPassed = new Date().getTime() > expDate.getTime();
      let restoredStatus = event.status || 'open';
      if (isPassed && (restoredStatus === 'open' || restoredStatus === 'published')) {
        restoredStatus = 'completed';
      }

      const res = await query(
        `UPDATE events 
         SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, status = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [restoredStatus, entityId]
      );

      // Invalidate relevant caches
      await CacheService.delPattern('events:list*');
      await CacheService.delPattern(`event:${entityId}*`);
      if (event.share_link_token) {
        await CacheService.delPattern(`event:${event.share_link_token}*`);
      }
      await CacheService.delPattern('*http:*/api/events*');
      await CacheService.delPattern('matching:recommendations:*');

      await this.recordAuditLog({
        entityType: 'event',
        entityId,
        action: 'restore',
        performedBy: userId,
        entityTitle: event.title,
        metadata: { restoredStatus, originalStatus: event.status },
      });

      return {
        success: true,
        message: `Event "${event.title}" has been restored successfully with all registrations and settings preserved.`,
        restoredItem: res.rows[0],
      };
    }

    // -------------------------------------------------------------
    // RESTORE REGISTRATION
    // -------------------------------------------------------------
    if (entityType === 'registration') {
      const existing = await query(
        `SELECT r.*, e.organizer_id, e.title AS event_title, e.deleted_at AS event_deleted_at, e.capacity,
                (SELECT COUNT(*)::int FROM registrations active_r WHERE active_r.event_id = r.event_id AND active_r.status = 'registered' AND active_r.deleted_at IS NULL) AS active_registered_count
         FROM registrations r
         JOIN events e ON r.event_id = e.id
         WHERE r.id = $1 AND r.deleted_at IS NOT NULL`,
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deleted registration not found or already active.');
        err.statusCode = 404;
        throw err;
      }
      const reg = existing.rows[0];

      // Authorization check
      const isOwner = reg.user_id === userId;
      const isEventOrganizer = reg.organizer_id === userId;
      const isAdmin = role === 'admin';

      if (!isOwner && !isEventOrganizer && !isAdmin) {
        const err: any = new Error('Unauthorized to restore this registration.');
        err.statusCode = 403;
        throw err;
      }

      // Check if parent event is deleted
      if (reg.event_deleted_at) {
        const err: any = new Error(
          `Cannot restore registration: The event "${reg.event_title}" is currently in the Recycle Bin. Please restore the event first.`
        );
        err.statusCode = 400;
        throw err;
      }

      // Check if attendee already has an active registration for this event
      const duplicateActive = await query(
        `SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [reg.event_id, reg.user_id]
      );
      if (duplicateActive.rowCount && duplicateActive.rowCount > 0) {
        const err: any = new Error(
          'Cannot restore registration: An active registration already exists for this attendee on this event.'
        );
        err.statusCode = 400;
        throw err;
      }

      // Priority 3: Check event capacity before restoring a registration
      const capacityCheck = await query(
        `SELECT capacity, 
                (SELECT COUNT(*)::int FROM registrations WHERE event_id = $1 AND status = 'registered' AND deleted_at IS NULL) AS active_count
         FROM events WHERE id = $1`,
        [reg.event_id]
      );
      if (capacityCheck.rowCount && capacityCheck.rows[0].capacity) {
        const cap = Number(capacityCheck.rows[0].capacity);
        const activeCount = Number(capacityCheck.rows[0].active_count || 0);
        if (activeCount >= cap) {
          const err: any = new Error(
            `Cannot restore registration: The event "${reg.event_title}" has reached its maximum capacity of ${cap} attendees.`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      // Restore registration & reactivate ticket
      const res = await query(
        `UPDATE registrations 
         SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, status = 'registered', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [entityId]
      );

      // Reactivate ticket status if it was cancelled
      await query(
        `UPDATE tickets 
         SET status = 'ISSUED', updated_at = NOW() 
         WHERE registration_id = $1 AND status = 'CANCELLED'`,
        [entityId]
      );

      // Invalidate caches
      await CacheService.delPattern('events:list*');
      await CacheService.delPattern(`event:${reg.event_id}*`);
      await CacheService.del(`event:${reg.event_id}:roster`);
      await CacheService.delPattern(`*http:*user:${reg.user_id}*`);
      await CacheService.delPattern('*http:*/api/tickets*');

      await this.recordAuditLog({
        entityType: 'registration',
        entityId,
        action: 'restore',
        performedBy: userId,
        entityTitle: `Registration for ${reg.event_title}`,
        metadata: { eventId: reg.event_id, userId: reg.user_id },
      });

      return {
        success: true,
        message: `Registration for "${reg.event_title}" has been restored successfully.`,
        restoredItem: res.rows[0],
      };
    }

    // -------------------------------------------------------------
    // RESTORE SPONSORSHIP APPLICATION
    // -------------------------------------------------------------
    if (entityType === 'sponsorship_application') {
      const existing = await query(
        'SELECT * FROM sponsorship_applications WHERE id = $1 AND deleted_at IS NOT NULL',
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deleted sponsorship application not found.');
        err.statusCode = 404;
        throw err;
      }
      const app = existing.rows[0];

      if (app.organizer_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized to restore this sponsorship pitch.');
        err.statusCode = 403;
        throw err;
      }

      const res = await query(
        `UPDATE sponsorship_applications 
         SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [entityId]
      );

      await CacheService.delPattern('sponsorship:explore*');
      await CacheService.delPattern(`sponsorship:organizer:${app.organizer_id}*`);
      await CacheService.delPattern('*http:*/api/sponsorship*');

      await this.recordAuditLog({
        entityType: 'sponsorship_application',
        entityId,
        action: 'restore',
        performedBy: userId,
        entityTitle: app.event_title,
      });

      return {
        success: true,
        message: `Sponsorship pitch "${app.event_title}" restored to active applications.`,
        restoredItem: res.rows[0],
      };
    }

    // -------------------------------------------------------------
    // RESTORE SPONSORSHIP DEAL
    // -------------------------------------------------------------
    if (entityType === 'sponsorship_deal') {
      const existing = await query(
        `SELECT sd.*, sa.event_title FROM sponsorship_deals sd 
          JOIN sponsorship_applications sa ON sd.application_id = sa.id 
          WHERE sd.id = $1 AND sd.deleted_at IS NOT NULL`,
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deleted sponsorship deal not found.');
        err.statusCode = 404;
        throw err;
      }
      const deal = existing.rows[0];

      if (deal.sponsor_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized to restore this deal.');
        err.statusCode = 403;
        throw err;
      }

      const res = await query(
        `UPDATE sponsorship_deals 
          SET deleted_at = NULL, deleted_by = NULL, status = 'INTERESTED', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [entityId]
      );

      await CacheService.delPattern(`sponsorship:deals:${deal.sponsor_id}*`);
      await CacheService.delPattern(`sponsorship:app:${deal.application_id}*`);
      await CacheService.delPattern('*http:*/api/sponsorship*');

      await this.recordAuditLog({
        entityType: 'sponsorship_deal',
        entityId,
        action: 'restore',
        performedBy: userId,
        entityTitle: `Deal for ${deal.event_title}`,
      });

      return {
        success: true,
        message: `Sponsorship pledge for "${deal.event_title}" restored to your pipeline.`,
        restoredItem: res.rows[0],
      };
    }

    // -------------------------------------------------------------
    // RESTORE EVENT VENDOR / EXHIBITOR BOOTH
    // -------------------------------------------------------------
    if (entityType === 'event_vendor') {
      const existing = await query(
        `SELECT ev.*, e.organizer_id, e.title AS event_title, e.deleted_at AS event_deleted_at 
         FROM event_vendors ev 
         JOIN events e ON ev.event_id = e.id 
         WHERE ev.id = $1 AND ev.deleted_at IS NOT NULL`,
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deleted exhibitor record not found.');
        err.statusCode = 404;
        throw err;
      }
      const vendor = existing.rows[0];

      const isVendorUser = vendor.user_id === userId;
      const isOrganizer = vendor.organizer_id === userId;
      const isAdmin = role === 'admin';

      if (!isVendorUser && !isOrganizer && !isAdmin) {
        const err: any = new Error('Unauthorized to restore this exhibitor record.');
        err.statusCode = 403;
        throw err;
      }

      if (vendor.event_deleted_at) {
        const err: any = new Error(
          `Cannot restore booth booking: The event "${vendor.event_title}" is in the Recycle Bin. Restore the event first.`
        );
        err.statusCode = 400;
        throw err;
      }

      const res = await query(
        `UPDATE event_vendors 
         SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [entityId]
      );

      await CacheService.delPattern(`exhibitors:public:${vendor.event_id}*`);
      await CacheService.delPattern(`event:${vendor.event_id}*`);
      await CacheService.delPattern(`*http:*/api/exhibitors/events/${vendor.event_id}*`);

      await this.recordAuditLog({
        entityType: 'event_vendor',
        entityId,
        action: 'restore',
        performedBy: userId,
        entityTitle: vendor.business_name,
      });

      return {
        success: true,
        message: `Exhibitor booth for "${vendor.business_name}" restored successfully.`,
        restoredItem: res.rows[0],
      };
    }

    // -------------------------------------------------------------
    // RESTORE USER (ADMIN ONLY - Section 4.B strict rule!)
    // -------------------------------------------------------------
    if (entityType === 'user') {
      if (role !== 'admin') {
        const err: any = new Error('Unauthorized. Only platform administrators can restore user accounts.');
        err.statusCode = 403;
        throw err;
      }

      const existing = await query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NOT NULL', [entityId]);
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deleted user account not found.');
        err.statusCode = 404;
        throw err;
      }
      const userToRestore = existing.rows[0];

      const res = await query(
        `UPDATE users 
         SET deleted_at = NULL, deleted_by = NULL,updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, email, full_name, role, is_active`,
        [entityId]
      );

      await CacheService.delPattern('*http:*/api/admin*');
      await CacheService.delPattern(`*http:*user:${entityId}*`);

      await this.recordAuditLog({
        entityType: 'user',
        entityId,
        action: 'restore',
        performedBy: userId,
        entityTitle: userToRestore.full_name,
        metadata: { email: userToRestore.email, role: userToRestore.role },
      });

      return {
        success: true,
        message: `User account "${userToRestore.full_name}" (${userToRestore.email}) restored successfully.`,
        restoredItem: res.rows[0],
      };
    }

    // -------------------------------------------------------------
    // RESTORE REVIEW
    // -------------------------------------------------------------
    if (entityType === 'review') {
      const existing = await query(
        `SELECT er.*, e.title AS event_title FROM event_reviews er 
         JOIN events e ON er.event_id = e.id 
         WHERE er.id = $1 AND er.deleted_at IS NOT NULL`,
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deleted review not found.');
        err.statusCode = 404;
        throw err;
      }
      const rev = existing.rows[0];

      if (rev.user_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized. You can only restore your own reviews.');
        err.statusCode = 403;
        throw err;
      }

      const res = await query(
        `UPDATE event_reviews 
         SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [entityId]
      );

      await CacheService.delPattern(`*http:*/api/reviews/event/${rev.event_id}*`);
      await CacheService.delPattern(`event:${rev.event_id}*`);

      await this.recordAuditLog({
        entityType: 'review',
        entityId,
        action: 'restore',
        performedBy: userId,
        entityTitle: `Review on ${rev.event_title}`,
      });

      return {
        success: true,
        message: `Review on "${rev.event_title}" restored successfully.`,
        restoredItem: res.rows[0],
      };
    }

    throw new Error(`Unsupported entity type "${entityType}" for restoration.`);
  }

  /**
   * Permanently delete an item after verifying retention policy and financial safeguards
   */
  static async permanentlyDeleteItem(
    userId: string,
    rawRole: string,
    entityType: RecycleBinEntityType,
    entityId: string
  ): Promise<{ success: boolean; message: string }> {
    const role = (rawRole || 'attendee').toLowerCase() as UserRole;

    // -------------------------------------------------------------
    // PERMANENTLY DELETE EVENT
    // -------------------------------------------------------------
    if (entityType === 'event') {
      const existing = await query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NOT NULL', [entityId]);
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Item not found in Recycle Bin.');
        err.statusCode = 404;
        throw err;
      }
      const event = existing.rows[0];

      if (event.organizer_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized to permanently delete this event.');
        err.statusCode = 403;
        throw err;
      }

      // Check financial records safeguard (Section 5: SETTLED or REFUNDED)
      const payCheck = await query(
        `SELECT COUNT(*)::int AS settled_count FROM payments WHERE event_id = $1 AND status IN ('SETTLED', 'REFUNDED')`,
        [entityId]
      );
      const settledCount = Number(payCheck.rows[0]?.settled_count || 0);
      if (settledCount > 0) {
        const err: any = new Error(
          `Cannot permanently delete event: Contains ${settledCount} settled financial transaction(s) (or refunded). Financial records must be retained for legal compliance.`
        );
        err.statusCode = 400;
        throw err;
      }

      // Hard delete
      await query('DELETE FROM events WHERE id = $1', [entityId]);

      // Cache invalidation
      await CacheService.delPattern('events:list*');
      await CacheService.delPattern(`event:${entityId}*`);
      await CacheService.delPattern('*http:*/api/events*');

      await this.recordAuditLog({
        entityType: 'event',
        entityId,
        action: 'permanent_delete',
        performedBy: userId,
        entityTitle: event.title,
      });

      return {
        success: true,
        message: `Event "${event.title}" has been permanently deleted.`,
      };
    }

    // -------------------------------------------------------------
    // PERMANENTLY DELETE REGISTRATION
    // -------------------------------------------------------------
    if (entityType === 'registration') {
      const existing = await query(
        `SELECT r.*, e.organizer_id, e.title AS event_title 
         FROM registrations r 
         JOIN events e ON r.event_id = e.id 
         WHERE r.id = $1 AND r.deleted_at IS NOT NULL`,
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Registration not found in Recycle Bin.');
        err.statusCode = 404;
        throw err;
      }
      const reg = existing.rows[0];

      const isOwner = reg.user_id === userId;
      const isOrganizer = reg.organizer_id === userId;
      const isAdmin = role === 'admin';

      if (!isOwner && !isOrganizer && !isAdmin) {
        const err: any = new Error('Unauthorized to permanently delete this registration.');
        err.statusCode = 403;
        throw err;
      }

      // Financial check (SETTLED or REFUNDED)
      const payCheck = await query(
        `SELECT COUNT(*)::int AS settled_count FROM payments WHERE event_id = $1 AND user_id = $2 AND status IN ('SETTLED', 'REFUNDED')`,
        [reg.event_id, reg.user_id]
      );
      if (Number(payCheck.rows[0]?.settled_count || 0) > 0) {
        const err: any = new Error(
          'Cannot permanently delete registration: Settled or refunded payment record exists and must be retained.'
        );
        err.statusCode = 400;
        throw err;
      }

      await query('DELETE FROM tickets WHERE registration_id = $1', [entityId]);
      await query('DELETE FROM registrations WHERE id = $1', [entityId]);

      await CacheService.delPattern(`event:${reg.event_id}*`);
      await CacheService.del(`event:${reg.event_id}:roster`);
      await CacheService.delPattern(`*http:*user:${reg.user_id}*`);

      await this.recordAuditLog({
        entityType: 'registration',
        entityId,
        action: 'permanent_delete',
        performedBy: userId,
        entityTitle: `Registration for ${reg.event_title}`,
      });

      return {
        success: true,
        message: `Registration record permanently deleted.`,
      };
    }

    // -------------------------------------------------------------
    // PERMANENTLY DELETE SPONSORSHIP APPLICATION
    // -------------------------------------------------------------
    if (entityType === 'sponsorship_application') {
      const existing = await query(
        'SELECT * FROM sponsorship_applications WHERE id = $1 AND deleted_at IS NOT NULL',
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Sponsorship pitch not found in Recycle Bin.');
        err.statusCode = 404;
        throw err;
      }
      const app = existing.rows[0];

      if (app.organizer_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized.');
        err.statusCode = 403;
        throw err;
      }

      await query('DELETE FROM sponsorship_applications WHERE id = $1', [entityId]);

      await CacheService.delPattern('sponsorship:explore*');
      await CacheService.delPattern(`sponsorship:organizer:${app.organizer_id}*`);

      await this.recordAuditLog({
        entityType: 'sponsorship_application',
        entityId,
        action: 'permanent_delete',
        performedBy: userId,
        entityTitle: app.event_title,
      });

      return {
        success: true,
        message: `Sponsorship pitch permanently deleted.`,
      };
    }

    // -------------------------------------------------------------
    // PERMANENTLY DELETE SPONSORSHIP DEAL
    // -------------------------------------------------------------
    if (entityType === 'sponsorship_deal') {
      const existing = await query(
        'SELECT * FROM sponsorship_deals WHERE id = $1 AND deleted_at IS NOT NULL',
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Deal not found in Recycle Bin.');
        err.statusCode = 404;
        throw err;
      }
      const deal = existing.rows[0];

      if (deal.sponsor_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized.');
        err.statusCode = 403;
        throw err;
      }

      await query('DELETE FROM sponsorship_deals WHERE id = $1', [entityId]);

      await CacheService.delPattern(`sponsorship:deals:${deal.sponsor_id}*`);

      await this.recordAuditLog({
        entityType: 'sponsorship_deal',
        entityId,
        action: 'permanent_delete',
        performedBy: userId,
      });

      return {
        success: true,
        message: `Sponsorship deal permanently deleted.`,
      };
    }

    // -------------------------------------------------------------
    // PERMANENTLY DELETE EVENT VENDOR
    // -------------------------------------------------------------
    if (entityType === 'event_vendor') {
      const existing = await query(
        `SELECT ev.*, e.organizer_id FROM event_vendors ev 
         JOIN events e ON ev.event_id = e.id 
         WHERE ev.id = $1 AND ev.deleted_at IS NOT NULL`,
        [entityId]
      );
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Exhibitor record not found in Recycle Bin.');
        err.statusCode = 404;
        throw err;
      }
      const vendor = existing.rows[0];

      const isVendorUser = vendor.user_id === userId;
      const isOrganizer = vendor.organizer_id === userId;
      const isAdmin = role === 'admin';

      if (!isVendorUser && !isOrganizer && !isAdmin) {
        const err: any = new Error('Unauthorized.');
        err.statusCode = 403;
        throw err;
      }

      // Check financial record safeguard (SETTLED or REFUNDED)
      const payCheck = await query(
        `SELECT COUNT(*)::int AS settled_count FROM payments WHERE vendor_id = $1 AND status IN ('SETTLED', 'REFUNDED')`,
        [entityId]
      );
      if (Number(payCheck.rows[0]?.settled_count || 0) > 0) {
        const err: any = new Error(
          'Cannot permanently delete exhibitor booking: Settled or refunded booth payment exists and must be retained.'
        );
        err.statusCode = 400;
        throw err;
      }

      await query('DELETE FROM exhibitor_booth_visitors WHERE vendor_id = $1', [entityId]);
      await query('DELETE FROM event_vendors WHERE id = $1', [entityId]);

      await CacheService.delPattern(`exhibitors:public:${vendor.event_id}*`);

      await this.recordAuditLog({
        entityType: 'event_vendor',
        entityId,
        action: 'permanent_delete',
        performedBy: userId,
        entityTitle: vendor.business_name,
      });

      return {
        success: true,
        message: `Exhibitor booth record permanently deleted.`,
      };
    }

    // -------------------------------------------------------------
    // PERMANENTLY DELETE USER (ADMIN ONLY)
    // -------------------------------------------------------------
    if (entityType === 'user') {
      if (role !== 'admin') {
        const err: any = new Error('Unauthorized. Only administrators can permanently delete accounts.');
        err.statusCode = 403;
        throw err;
      }

      const existing = await query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NOT NULL', [entityId]);
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('User account not found in Recycle Bin.');
        err.statusCode = 404;
        throw err;
      }
      const userToDelete = existing.rows[0];

      // Check for financial payments safeguard (SETTLED or REFUNDED)
      const payCheck = await query(
        `SELECT COUNT(*)::int AS count FROM payments WHERE user_id = $1 AND status IN ('SETTLED', 'REFUNDED')`,
        [entityId]
      );
      if (Number(payCheck.rows[0]?.count || 0) > 0) {
        const err: any = new Error(
          'Cannot permanently remove user: User is tied to settled or refunded financial transactions. Account record must be preserved for tax/financial audits.'
        );
        err.statusCode = 400;
        throw err;
      }

      await query('DELETE FROM users WHERE id = $1', [entityId]);

      await CacheService.delPattern('*http:*/api/admin*');

      await this.recordAuditLog({
        entityType: 'user',
        entityId,
        action: 'permanent_delete',
        performedBy: userId,
        entityTitle: userToDelete.full_name,
      });

      return {
        success: true,
        message: `User account "${userToDelete.full_name}" permanently removed.`,
      };
    }

    // -------------------------------------------------------------
    // PERMANENTLY DELETE REVIEW
    // -------------------------------------------------------------
    if (entityType === 'review') {
      const existing = await query('SELECT * FROM event_reviews WHERE id = $1 AND deleted_at IS NOT NULL', [entityId]);
      if (!existing.rowCount || existing.rowCount === 0) {
        const err: any = new Error('Review not found in Recycle Bin.');
        err.statusCode = 404;
        throw err;
      }
      const rev = existing.rows[0];

      if (rev.user_id !== userId && role !== 'admin') {
        const err: any = new Error('Unauthorized.');
        err.statusCode = 403;
        throw err;
      }

      await query('DELETE FROM event_reviews WHERE id = $1', [entityId]);

      await this.recordAuditLog({
        entityType: 'review',
        entityId,
        action: 'permanent_delete',
        performedBy: userId,
      });

      return {
        success: true,
        message: `Review permanently deleted.`,
      };
    }

    throw new Error(`Unsupported entity type "${entityType}" for permanent deletion.`);
  }

  /**
   * Automatically purge eligible items exceeding the 30-day retention period.
   * Safely skips records that have financial protections.
   */
  static async purgeExpiredItems(): Promise<{ purgedCount: number; errors: string[] }> {
    let purgedCount = 0;
    const errors: string[] = [];

    const thresholdSql = `NOW() - INTERVAL '${this.RETENTION_DAYS} days'`;

    // 1. Purge expired reviews
    try {
      const revRes = await query(
        `DELETE FROM event_reviews WHERE deleted_at IS NOT NULL AND deleted_at < ${thresholdSql} RETURNING id`
      );
      purgedCount += revRes.rowCount || 0;
    } catch (e: any) {
      errors.push(`Reviews purge error: ${e?.message}`);
    }

    // 2. Purge expired sponsorship deals
    try {
      const dealRes = await query(
        `DELETE FROM sponsorship_deals WHERE deleted_at IS NOT NULL AND deleted_at < ${thresholdSql} RETURNING id`
      );
      purgedCount += dealRes.rowCount || 0;
    } catch (e: any) {
      errors.push(`Deals purge error: ${e?.message}`);
    }

    // 3. Purge expired sponsorship applications
    try {
      const appRes = await query(
        `DELETE FROM sponsorship_applications WHERE deleted_at IS NOT NULL AND deleted_at < ${thresholdSql} RETURNING id`
      );
      purgedCount += appRes.rowCount || 0;
    } catch (e: any) {
      errors.push(`Applications purge error: ${e?.message}`);
    }

    // 4. Purge expired vendors (without settled or refunded payments)
    try {
      const vendorRes = await query(
        `DELETE FROM event_vendors 
         WHERE deleted_at IS NOT NULL 
           AND deleted_at < ${thresholdSql}
           AND id NOT IN (SELECT vendor_id FROM payments WHERE vendor_id IS NOT NULL AND status IN ('SETTLED', 'REFUNDED'))
         RETURNING id`
      );
      purgedCount += vendorRes.rowCount || 0;
    } catch (e: any) {
      errors.push(`Vendors purge error: ${e?.message}`);
    }

    // 5. Purge expired registrations (without settled or refunded payments)
    try {
      const regRes = await query(
        `DELETE FROM registrations 
         WHERE deleted_at IS NOT NULL 
           AND deleted_at < ${thresholdSql}
           AND id NOT IN (
             SELECT r.id FROM registrations r 
             JOIN payments p ON p.event_id = r.event_id AND p.user_id = r.user_id 
             WHERE p.status IN ('SETTLED', 'REFUNDED')
           )
         RETURNING id`
      );
      purgedCount += regRes.rowCount || 0;
    } catch (e: any) {
      errors.push(`Registrations purge error: ${e?.message}`);
    }

    // 6. Purge expired events (without settled or refunded payments)
    try {
      const eventRes = await query(
        `DELETE FROM events 
         WHERE deleted_at IS NOT NULL 
           AND deleted_at < ${thresholdSql}
           AND id NOT IN (SELECT event_id FROM payments WHERE event_id IS NOT NULL AND status IN ('SETTLED', 'REFUNDED'))
         RETURNING id`
      );
      purgedCount += eventRes.rowCount || 0;
    } catch (e: any) {
      errors.push(`Events purge error: ${e?.message}`);
    }

    // Record audit log for purge
    await this.recordAuditLog({
      entityType: 'event',
      entityId: '00000000-0000-0000-0000-000000000000',
      action: 'purge_expired',
      entityTitle: 'Automated 30-Day Retention Purge Sweep',
      metadata: { purgedCount, errorsCount: errors.length },
    });

    return { purgedCount, errors };
  }

  /**
   * Get audit log history (Admin oversight)
   */
  static async getAuditLogs(options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const res = await query(
      `SELECT 
        l.*,
        u.full_name AS performed_by_name,
        u.email AS performed_by_email,
        u.role AS performed_by_role
       FROM recycle_bin_audit_logs l
       LEFT JOIN users u ON l.performed_by = u.id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.rows;
  }
}
