import pool, { query, getClient } from '../config/db';
import {
  IOrganizerSubscription,
  IOrganizerAllowanceHistory,
  AllowanceChangeType,
} from '../types';
import { AuditService } from './audit.service';
import { CacheService } from './cache.service';

export const EVENT_LIMIT_REACHED_MESSAGE =
  'You have reached your event creation limit. Please contact Sheeba to upgrade your plan or purchase additional event credits. If you believe this is a mistake, please contact the administrators.';

export class SubscriptionService {
  /**
   * Retrieves or automatically initializes an organizer's subscription record
   */
  static async getOrganizerSubscription(organizerId: string): Promise<IOrganizerSubscription> {
    const res = await query(
      `SELECT 
        s.*,
        u.full_name AS organizer_name,
        u.email AS organizer_email,
        u.organization,
        u.approval_status,
        u.is_active,
        admin_u.full_name AS assigned_by_name
       FROM organizer_subscriptions s
       JOIN users u ON s.organizer_id = u.id
       LEFT JOIN users admin_u ON s.assigned_by = admin_u.id
       WHERE s.organizer_id = $1`,
      [organizerId]
    );

    if (res.rowCount && res.rowCount > 0) {
      const row = res.rows[0];
      const maxEvents = parseInt(row.max_events, 10);
      const eventsUsed = parseInt(row.events_used, 10);
      return {
        ...row,
        max_events: maxEvents,
        events_used: eventsUsed,
        remaining_events: Math.max(0, maxEvents - eventsUsed),
      };
    }

    // Auto-initialize if not existing
    return await this.initializeSubscription(organizerId);
  }

  /**
   * Idempotent initialization for an organizer based on existing active events
   */
  static async initializeSubscription(
    organizerId: string,
    initialMaxEvents?: number,
    planName?: string,
    assignedBy?: string
  ): Promise<IOrganizerSubscription> {
    // Count current active events
    const countRes = await query(
      `SELECT COUNT(*)::INTEGER AS count FROM events WHERE organizer_id = $1 AND deleted_at IS NULL`,
      [organizerId]
    );
    const existingEventsCount = countRes.rows[0]?.count || 0;
    const defaultMax = initialMaxEvents !== undefined ? initialMaxEvents : Math.max(existingEventsCount, 1);
    const defaultPlan =
      planName ||
      (defaultMax > 3
        ? `Enterprise (${defaultMax} Events)`
        : defaultMax > 1
        ? `Growth (${defaultMax} Events)`
        : 'Starter (1 Event)');

    await query(
      `INSERT INTO organizer_subscriptions (
        organizer_id, plan_name, max_events, events_used, payment_status, subscription_status, assigned_by
       ) VALUES ($1, $2, $3, $4, 'paid', 'active', $5)
       ON CONFLICT (organizer_id) DO NOTHING`,
      [organizerId, defaultPlan, defaultMax, existingEventsCount, assignedBy || null]
    );

    // Fetch and return fresh
    const res = await query(
      `SELECT 
        s.*,
        u.full_name AS organizer_name,
        u.email AS organizer_email,
        u.organization,
        u.approval_status,
        u.is_active,
        admin_u.full_name AS assigned_by_name
       FROM organizer_subscriptions s
       JOIN users u ON s.organizer_id = u.id
       LEFT JOIN users admin_u ON s.assigned_by = admin_u.id
       WHERE s.organizer_id = $1`,
      [organizerId]
    );

    const row = res.rows[0];
    const maxEvents = parseInt(row.max_events, 10);
    const eventsUsed = parseInt(row.events_used, 10);
    return {
      ...row,
      max_events: maxEvents,
      events_used: eventsUsed,
      remaining_events: Math.max(0, maxEvents - eventsUsed),
    };
  }

  /**
   * Concurrency-safe validation inside a client transaction with row-level lock (FOR UPDATE)
   * Prevents race conditions when an organizer tries to create multiple events concurrently.
   */
  static async validateCanCreateEvent(organizerId: string, client: any): Promise<IOrganizerSubscription> {
    // 1. Verify organizer status in users table
    const userRes = await client.query(
      `SELECT id, is_active, approval_status, organizer_approval_status, role, is_organizer 
       FROM users 
       WHERE id = $1 AND deleted_at IS NULL`,
      [organizerId]
    );

    if (!userRes.rowCount || userRes.rowCount === 0) {
      const err: any = new Error('Organizer account not found or deactivated.');
      err.statusCode = 404;
      throw err;
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      const err: any = new Error('Your organizer account is suspended or inactive. Please contact Sheeba administrators.');
      err.statusCode = 403;
      throw err;
    }

    const effApproval = user.organizer_approval_status && user.organizer_approval_status !== 'none'
      ? user.organizer_approval_status
      : user.approval_status;

    if (effApproval !== 'approved' && user.role !== 'admin') {
      const err: any = new Error('Your organizer account is pending approval by administrators.');
      err.statusCode = 403;
      throw err;
    }

    // 2. Fetch subscription with row lock FOR UPDATE
    let subRes = await client.query(
      `SELECT * FROM organizer_subscriptions WHERE organizer_id = $1 FOR UPDATE`,
      [organizerId]
    );

    if (!subRes.rowCount || subRes.rowCount === 0) {
      // Initialize on the fly within transaction
      const countRes = await client.query(
        `SELECT COUNT(*)::INTEGER AS count FROM events WHERE organizer_id = $1 AND deleted_at IS NULL`,
        [organizerId]
      );
      const existingEventsCount = countRes.rows[0]?.count || 0;
      const initialMax = Math.max(existingEventsCount, 1);
      const planName = initialMax > 1 ? `Growth (${initialMax} Events)` : 'Starter (1 Event)';

      await client.query(
        `INSERT INTO organizer_subscriptions (
          organizer_id, plan_name, max_events, events_used, payment_status, subscription_status
         ) VALUES ($1, $2, $3, $4, 'paid', 'active')
         ON CONFLICT (organizer_id) DO NOTHING`,
        [organizerId, planName, initialMax, existingEventsCount]
      );

      subRes = await client.query(
        `SELECT * FROM organizer_subscriptions WHERE organizer_id = $1 FOR UPDATE`,
        [organizerId]
      );
    }

    const sub = subRes.rows[0];

    // Check subscription status
    if (sub.subscription_status === 'suspended') {
      const err: any = new Error('Your organizer subscription is currently suspended. Please contact Sheeba administrators.');
      err.statusCode = 403;
      throw err;
    }

    // Recalculate actual active events count to guarantee ground truth
    const actualEventsRes = await client.query(
      `SELECT COUNT(*)::INTEGER AS count FROM events WHERE organizer_id = $1 AND deleted_at IS NULL`,
      [organizerId]
    );
    const actualEventsCount = actualEventsRes.rows[0]?.count || 0;

    const maxEvents = parseInt(sub.max_events, 10);

    // Limit check: If actual events >= max_events, reject with exact requested wording
    if (actualEventsCount >= maxEvents) {
      const err: any = new Error(EVENT_LIMIT_REACHED_MESSAGE);
      err.statusCode = 403;
      err.code = 'EVENT_LIMIT_REACHED';
      err.details = {
        maxEvents,
        eventsCreated: actualEventsCount,
        remainingEvents: 0,
        planName: sub.plan_name,
      };
      throw err;
    }

    return {
      ...sub,
      max_events: maxEvents,
      events_used: actualEventsCount,
      remaining_events: Math.max(0, maxEvents - actualEventsCount),
    };
  }

  /**
   * Synchronize events_used in organizer_subscriptions after event creation or deletion
   */
  static async syncEventsUsed(organizerId: string, client?: any): Promise<number> {
    const dbClient = client || pool;
    const countRes = await dbClient.query(
      `SELECT COUNT(*)::INTEGER AS count FROM events WHERE organizer_id = $1 AND deleted_at IS NULL`,
      [organizerId]
    );
    const count = countRes.rows[0]?.count || 0;

    await dbClient.query(
      `UPDATE organizer_subscriptions 
       SET events_used = $2, 
           updated_at = NOW() 
       WHERE organizer_id = $1`,
      [organizerId, count]
    );

    await CacheService.del(`organizer:${organizerId}:subscription`);
    await CacheService.delPattern('admin:subscriptions*');
    return count;
  }

  /**
   * Retrieves all subscriptions for platform administrators with filtering and search
   */
  static async getAllSubscriptions(options?: {
    search?: string;
    subscriptionStatus?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['u.deleted_at IS NULL'];
    const values: any[] = [];
    let counter = 1;

    if (options?.subscriptionStatus && options.subscriptionStatus !== 'All') {
      conditions.push(`s.subscription_status = $${counter++}`);
      values.push(options.subscriptionStatus.toLowerCase());
    }

    if (options?.paymentStatus && options.paymentStatus !== 'All') {
      conditions.push(`s.payment_status = $${counter++}`);
      values.push(options.paymentStatus.toLowerCase());
    }

    if (options?.search && options.search.trim()) {
      const term = `%${options.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(u.full_name) LIKE $${counter} OR LOWER(u.email) LIKE $${counter} OR LOWER(COALESCE(u.organization, '')) LIKE $${counter} OR LOWER(s.plan_name) LIKE $${counter})`
      );
      values.push(term);
      counter++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM users u
       JOIN organizer_subscriptions s ON u.id = s.organizer_id
       ${whereClause}`,
      values
    );
    const total = countRes.rows[0]?.total || 0;

    const listQuery = `
      SELECT 
        s.*,
        u.full_name AS organizer_name,
        u.email AS organizer_email,
        u.phone AS organizer_phone,
        u.organization,
        u.approval_status,
        u.organizer_approval_status,
        u.is_active,
        u.created_at AS registered_at,
        admin_u.full_name AS assigned_by_name,
        (SELECT COUNT(*)::INTEGER FROM events e WHERE e.organizer_id = u.id AND e.deleted_at IS NULL) AS actual_events_count
      FROM users u
      JOIN organizer_subscriptions s ON u.id = s.organizer_id
      LEFT JOIN users admin_u ON s.assigned_by = admin_u.id
      ${whereClause}
      ORDER BY s.updated_at DESC
      LIMIT $${counter++} OFFSET $${counter++}
    `;

    values.push(limit, offset);
    const listRes = await query(listQuery, values);

    const subscriptions = listRes.rows.map((row) => {
      const maxEvents = parseInt(row.max_events, 10);
      const eventsUsed = parseInt(row.actual_events_count !== undefined ? row.actual_events_count : row.events_used, 10);
      return {
        id: row.id,
        organizerId: row.organizer_id,
        organizerName: row.organizer_name,
        organizerEmail: row.organizer_email,
        organizerPhone: row.organizer_phone,
        organization: row.organization || row.organizer_name,
        planName: row.plan_name,
        maxEvents,
        eventsUsed,
        remainingEvents: Math.max(0, maxEvents - eventsUsed),
        paymentStatus: row.payment_status,
        subscriptionStatus: row.subscription_status,
        agreementReference: row.agreement_reference,
        notes: row.notes,
        assignedByName: row.assigned_by_name,
        validUntil: row.valid_until,
        approvalStatus: row.organizer_approval_status || row.approval_status,
        isActive: row.is_active,
        registeredAt: row.registered_at,
        updatedAt: row.updated_at,
      };
    });

    return {
      subscriptions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Administrator updates an organizer's allowance, plan, or subscription status
   * Fully audited with immediate effect and history tracking.
   */
  static async updateAllowance(
    organizerId: string,
    adminId: string,
    data: {
      maxEvents?: number;
      planName?: string;
      paymentStatus?: 'paid' | 'pending' | 'waived' | 'overdue';
      subscriptionStatus?: 'active' | 'suspended' | 'expired' | 'depleted';
      notes?: string;
      agreementReference?: string;
      reason?: string;
      grantCredits?: number;
    }
  ): Promise<IOrganizerSubscription> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Fetch admin info for audit
      const adminRes = await client.query('SELECT full_name, email, role FROM users WHERE id = $1', [adminId]);
      const adminUser = adminRes.rows[0] || { full_name: 'Administrator', email: '' };

      // Ensure subscription row exists and lock it
      let subRes = await client.query(
        'SELECT * FROM organizer_subscriptions WHERE organizer_id = $1 FOR UPDATE',
        [organizerId]
      );

      if (!subRes.rowCount || subRes.rowCount === 0) {
        await client.query(
          `INSERT INTO organizer_subscriptions (organizer_id, plan_name, max_events, events_used, payment_status, subscription_status)
           VALUES ($1, 'Starter (1 Event)', 1, 0, 'paid', 'active')
           ON CONFLICT (organizer_id) DO NOTHING`,
          [organizerId]
        );
        subRes = await client.query(
          'SELECT * FROM organizer_subscriptions WHERE organizer_id = $1 FOR UPDATE',
          [organizerId]
        );
      }

      const currentSub = subRes.rows[0];
      const prevMax = parseInt(currentSub.max_events, 10);
      const prevPlan = currentSub.plan_name;

      let newMax = prevMax;
      if (data.grantCredits !== undefined && data.grantCredits > 0) {
        newMax = prevMax + data.grantCredits;
      } else if (data.maxEvents !== undefined) {
        newMax = Math.max(0, data.maxEvents);
      }

      let changeType: AllowanceChangeType = 'STATUS_CHANGE';
      if (newMax > prevMax) {
        changeType = data.grantCredits ? 'CREDIT_GRANT' : 'ALLOWANCE_INCREASE';
      } else if (newMax < prevMax) {
        changeType = 'ALLOWANCE_DECREASE';
      } else if (data.planName && data.planName !== prevPlan) {
        changeType = 'PLAN_CHANGE';
      }

      const updatedPlan = data.planName || currentSub.plan_name;
      const updatedPaymentStatus = data.paymentStatus || currentSub.payment_status;
      const updatedSubStatus = data.subscriptionStatus || currentSub.subscription_status;
      const updatedNotes = data.notes !== undefined ? data.notes : currentSub.notes;
      const updatedRef = data.agreementReference !== undefined ? data.agreementReference : currentSub.agreement_reference;

      // Update subscription record
      const updateRes = await client.query(
        `UPDATE organizer_subscriptions
         SET max_events = $1,
             plan_name = $2,
             payment_status = $3,
             subscription_status = $4,
             notes = $5,
             agreement_reference = $6,
             assigned_by = $7,
             updated_at = NOW()
         WHERE organizer_id = $8
         RETURNING *`,
        [
          newMax,
          updatedPlan,
          updatedPaymentStatus,
          updatedSubStatus,
          updatedNotes,
          updatedRef,
          adminId,
          organizerId,
        ]
      );

      // Record in organizer_allowance_history
      await client.query(
        `INSERT INTO organizer_allowance_history (
          organizer_id, changed_by, previous_max_events, new_max_events,
          previous_plan, new_plan, change_type, reason, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          organizerId,
          adminId,
          prevMax,
          newMax,
          prevPlan,
          updatedPlan,
          changeType,
          data.reason || `Updated by administrator ${adminUser.full_name}`,
          JSON.stringify({
            paymentStatus: updatedPaymentStatus,
            subscriptionStatus: updatedSubStatus,
            grantCredits: data.grantCredits || 0,
          }),
        ]
      );

      await client.query('COMMIT');

      // Invalidate caches
      await CacheService.del(`organizer:${organizerId}:subscription`);
      await CacheService.delPattern('admin:subscriptions*');

      // Fetch updated organizer for details
      const orgRes = await query('SELECT full_name, email, organization FROM users WHERE id = $1', [organizerId]);
      const orgUser = orgRes.rows[0] || {};

      await AuditService.logAction({
        action: 'ORGANIZER_ALLOWANCE_UPDATED',
        category: 'USER_MANAGEMENT',
        entityType: 'organizer_subscription',
        entityId: organizerId,
        entityTitle: orgUser.organization || orgUser.full_name,
        performedBy: adminId,
        performedByName: adminUser.full_name,
        performedByEmail: adminUser.email,
        details: `Allowance changed for ${orgUser.full_name}: ${prevMax} -> ${newMax} events (Plan: ${updatedPlan}, Status: ${updatedSubStatus})`,
        metadata: {
          previousMax: prevMax,
          newMax,
          changeType,
          reason: data.reason,
        },
      });

      return {
        ...updateRes.rows[0],
        max_events: newMax,
        events_used: parseInt(updateRes.rows[0].events_used, 10),
        remaining_events: Math.max(0, newMax - parseInt(updateRes.rows[0].events_used, 10)),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves the historical audit trail of allowance changes for an organizer
   */
  static async getAllowanceHistory(organizerId: string): Promise<IOrganizerAllowanceHistory[]> {
    const res = await query(
      `SELECT 
        h.*,
        u.full_name AS changed_by_name,
        u.email AS changed_by_email
       FROM organizer_allowance_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.organizer_id = $1
       ORDER BY h.created_at DESC`,
      [organizerId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizer_id: row.organizer_id,
      changed_by: row.changed_by,
      changed_by_name: row.changed_by_name || 'System / Administrator',
      changed_by_email: row.changed_by_email || '',
      previous_max_events: parseInt(row.previous_max_events, 10),
      new_max_events: parseInt(row.new_max_events, 10),
      previous_plan: row.previous_plan,
      new_plan: row.new_plan,
      change_type: row.change_type,
      reason: row.reason,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      created_at: row.created_at,
    }));
  }
}
