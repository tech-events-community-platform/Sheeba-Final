import crypto from 'crypto';
import { query, getClient } from '../config/db';
import { IExhibitorCall, IEventVendor, ExhibitorPricingMode, RegistrationQuestion, IExhibitorPaymentConfig } from '../types';
import { PaymentService } from './payment.service';
import { CacheService } from './cache.service';


export class ExhibitorService {
  /**
   * Helper to verify if an event belongs to an organizer (or user is admin)
   */
  private static async verifyEventOwnership(organizerId: string, eventId: string, isAdmin: boolean = false): Promise<any> {
    const res = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (res.rows.length === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }
    const event = res.rows[0];
    if (!isAdmin && event.organizer_id !== organizerId) {
      const err: any = new Error('Unauthorized. You do not own this event.');
      err.statusCode = 403;
      throw err;
    }
    return event;
  }

  /**
   * Get exhibitor call configuration & stats for an event
   */
  static async getExhibitorCall(eventId: string): Promise<IExhibitorCall & { stats: { confirmedCount: number; totalSpaceAllocated: number; totalSpaceRemaining: number } }> {
    const res = await query(
      `SELECT ec.*, e.title as event_title, e.event_date, e.location as event_location, e.event_type
       FROM exhibitor_calls ec
       JOIN events e ON e.id = ec.event_id
       WHERE ec.event_id = $1`,
      [eventId]
    );

    // Calculate space & vendor stats
    const statsRes = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed_count,
         COALESCE(SUM(space_sqm) FILTER (WHERE status = 'confirmed'), 0)::float as space_allocated
       FROM event_vendors 
       WHERE event_id = $1`,
      [eventId]
    );

    const confirmedCount = statsRes.rows[0]?.confirmed_count || 0;
    const totalSpaceAllocated = statsRes.rows[0]?.space_allocated || 0;

    if (res.rows.length === 0) {
      // Return default unconfigured state
      return {
        id: '',
        event_id: eventId,
        eventId,
        is_enabled: false,
        isEnabled: false,
        status: 'draft',
        description: '',
        pricing_mode: 'per_sqm',
        pricingMode: 'per_sqm',
        total_space_sqm: 0,
        totalSpaceSqm: 0,
        price_per_sqm: 0,
        pricePerSqm: 0,
        fixed_fee: 0,
        fixedFee: 0,
        sheeba_cut_percent: 30,
        sheebaCutPercent: 30,
        max_exhibitors: 10,
        maxExhibitors: 10,
        specifications: '',
        custom_questions: [],
        customQuestions: [],
        payment_config: {},
        paymentConfig: {},
        application_deadline: undefined,
        applicationDeadline: undefined,
        has_booth_numbers: false,
        hasBoothNumbers: false,
        has_vendor_checkin: false,
        hasVendorCheckin: false,
        created_at: new Date(),
        createdAt: new Date(),
        updated_at: new Date(),
        updatedAt: new Date(),
        stats: {
          confirmedCount,
          totalSpaceAllocated,
          totalSpaceRemaining: 0,
        },
      };
    }

    const row = res.rows[0];
    const totalSpaceSqm = parseFloat(row.total_space_sqm) || 0;
    const pricePerSqm = parseFloat(row.price_per_sqm) || 0;
    const fixedFee = parseFloat(row.fixed_fee) || 0;
    const sheebaCutPercent = parseFloat(row.sheeba_cut_percent) || 30;
    const maxExhibitors = parseInt(row.max_exhibitors, 10) || 10;
    const remainingSpace = Math.max(0, totalSpaceSqm - totalSpaceAllocated);
    const isEnabled = !!row.is_enabled;
    const pricingMode: ExhibitorPricingMode = row.pricing_mode || 'per_sqm';
    const hasBoothNumbers = !!row.has_booth_numbers;
    const hasVendorCheckin = !!row.has_vendor_checkin;
    const customQuestions = row.custom_questions || [];
    const paymentConfig = row.payment_config || {};

    return {
      id: row.id,
      event_id: row.event_id,
      eventId: row.event_id,
      is_enabled: isEnabled,
      isEnabled,
      status: row.status,
      description: row.description,
      pricing_mode: pricingMode,
      pricingMode,
      total_space_sqm: totalSpaceSqm,
      totalSpaceSqm,
      price_per_sqm: pricePerSqm,
      pricePerSqm,
      fixed_fee: fixedFee,
      fixedFee,
      sheeba_cut_percent: sheebaCutPercent,
      sheebaCutPercent,
      max_exhibitors: maxExhibitors,
      maxExhibitors,
      specifications: row.specifications,
      custom_questions: customQuestions,
      customQuestions,
      payment_config: paymentConfig,
      paymentConfig,
      application_deadline: row.application_deadline,
      applicationDeadline: row.application_deadline,
      has_booth_numbers: hasBoothNumbers,
      hasBoothNumbers,
      has_vendor_checkin: hasVendorCheckin,
      hasVendorCheckin,
      created_at: row.created_at,
      createdAt: row.created_at,
      updated_at: row.updated_at,
      updatedAt: row.updated_at,
      event_title: row.event_title,
      eventTitle: row.event_title,
      event_date: row.event_date,
      eventDate: row.event_date,
      event_location: row.event_location,
      eventLocation: row.event_location,
      stats: {
        confirmedCount,
        totalSpaceAllocated,
        totalSpaceRemaining: remainingSpace,
      },
    };
  }

  /**
   * Create or update exhibitor call settings for an event (Organizer only)
   */
  static async upsertExhibitorCall(
    organizerId: string,
    eventId: string,
    data: {
      isEnabled: boolean;
      status?: 'draft' | 'open' | 'closed';
      description?: string | null;
      pricingMode?: ExhibitorPricingMode;
      totalSpaceSqm: number;
      pricePerSqm: number;
      fixedFee?: number;
      sheebaCutPercent?: number;
      maxExhibitors?: number;
      specifications?: string | null;
      customQuestions?: RegistrationQuestion[];
      paymentConfig?: IExhibitorPaymentConfig;
      applicationDeadline?: string | null;
      hasBoothNumbers?: boolean;
      hasVendorCheckin?: boolean;
    },
    isAdmin: boolean = false
  ): Promise<IExhibitorCall & { stats: { confirmedCount: number; totalSpaceAllocated: number; totalSpaceRemaining: number } }> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const status = data.status || 'draft';
    const pricingMode: ExhibitorPricingMode = data.pricingMode || 'per_sqm';
    const fixedFee = data.fixedFee !== undefined ? Number(data.fixedFee) : 0;
    const customQuestionsJson = JSON.stringify(data.customQuestions || []);
    const paymentConfigJson = JSON.stringify(data.paymentConfig || {});
    const sheebaCutPercent = data.sheebaCutPercent ?? 30.0;
    const maxExhibitors = data.maxExhibitors ?? 10;
    const hasBoothNumbers = !!data.hasBoothNumbers;
    const hasVendorCheckin = !!data.hasVendorCheckin;
    const applicationDeadline = data.applicationDeadline ? new Date(data.applicationDeadline) : null;

    const upsertSql = `
      INSERT INTO exhibitor_calls (
        event_id, is_enabled, status, description, pricing_mode,
        total_space_sqm, price_per_sqm, fixed_fee, sheeba_cut_percent,
        max_exhibitors, specifications, custom_questions, payment_config,
        application_deadline, has_booth_numbers, has_vendor_checkin,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16, NOW())
      ON CONFLICT (event_id) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        status = EXCLUDED.status,
        description = EXCLUDED.description,
        pricing_mode = EXCLUDED.pricing_mode,
        total_space_sqm = EXCLUDED.total_space_sqm,
        price_per_sqm = EXCLUDED.price_per_sqm,
        fixed_fee = EXCLUDED.fixed_fee,
        sheeba_cut_percent = EXCLUDED.sheeba_cut_percent,
        max_exhibitors = EXCLUDED.max_exhibitors,
        specifications = EXCLUDED.specifications,
        custom_questions = EXCLUDED.custom_questions,
        payment_config = EXCLUDED.payment_config,
        application_deadline = EXCLUDED.application_deadline,
        has_booth_numbers = EXCLUDED.has_booth_numbers,
        has_vendor_checkin = EXCLUDED.has_vendor_checkin,
        updated_at = NOW()
      RETURNING *;
    `;

    await query(upsertSql, [
      eventId,
      data.isEnabled,
      status,
      data.description || null,
      pricingMode,
      data.totalSpaceSqm,
      data.pricePerSqm,
      fixedFee,
      sheebaCutPercent,
      maxExhibitors,
      data.specifications || null,
      customQuestionsJson,
      paymentConfigJson,
      applicationDeadline,
      hasBoothNumbers,
      hasVendorCheckin,
    ]);

    await CacheService.delPattern(`exhibitors:public:${eventId}*`);
    await CacheService.delPattern('exhibitors:explore*');
    await CacheService.delPattern(`event:${eventId}*`);
    await CacheService.delPattern(`*http:*/api/exhibitors/events/${eventId}*`);
    await CacheService.delPattern('*http:*/api/exhibitors/explore*');
    await CacheService.delPattern(`*http:*/api/events/${eventId}*`);

    return this.getExhibitorCall(eventId);
  }

  /**
   * Helper to standardize vendor database rows to camelCase interface properties
   * while preserving snake_case fields for backwards compatibility.
   */
  public static mapVendorRow(row: any): any {
    if (!row) return row;
    return {
      ...row,
      id: row.id,
      eventId: row.event_id,
      exhibitorCallId: row.exhibitor_call_id,
      userId: row.user_id,
      source: row.source,
      businessName: row.business_name,
      category: row.category,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      showcaseDescription: row.showcase_description,
      specialRequirements: row.special_requirements,
      pricingMode: row.pricing_mode || 'per_sqm',
      spaceSqm: parseFloat(row.space_sqm) || 0,
      organizerPricePerSqm: parseFloat(row.organizer_price_per_sqm) || 0,
      sheebaCutPercent: parseFloat(row.sheeba_cut_percent) || 0,
      totalOrganizerAmount: parseFloat(row.total_organizer_amount) || 0,
      totalCutAmount: parseFloat(row.total_cut_amount) || 0,
      totalFinalAmount: parseFloat(row.total_final_amount) || 0,
      questionAnswers: row.question_answers || {},
      boothNumber: row.booth_number,
      status: row.status,
      rejectionReason: row.rejection_reason,
      paymentReference: row.payment_reference,
      paymentStatus: row.payment_status,
      paidAt: row.paid_at,
      logoUrl: row.logo_url,
      websiteUrl: row.website_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      eventTitle: row.event_title,
      eventDate: row.event_date,
      eventLocation: row.event_location,
      latestReceipt: row.latest_receipt || null,
    };
  }

  /**
   * Get all vendors / exhibitors for an event with search & filtering (Organizer only)
   */
  static async getEventVendors(
    organizerId: string,
    eventId: string,
    filters?: { search?: string; source?: string; status?: string },
    isAdmin: boolean = false
  ): Promise<{ vendors: IEventVendor[]; totalCount: number; confirmedCount: number; pendingCount: number }> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    let sql = `
      SELECT v.*, e.title as event_title, e.event_date, e.location as event_location,
        (
          SELECT json_build_object(
            'id', p.id,
            'transactionId', p.transaction_id,
            'status', p.status,
            'screenshotUrl', p.screenshot_url,
            'failureReason', p.failure_reason,
            'paymentMethod', p.payment_method,
            'verifiedAt', p.verified_at,
            'createdAt', p.created_at,
            'transactionReference', (p.provider_response->>'transactionReference'),
            'notes', (p.provider_response->>'notes')
          )
          FROM payments p
          WHERE p.vendor_id = v.id AND p.payment_type = 'exhibitor_booth'
          ORDER BY p.created_at DESC
          LIMIT 1
        ) as latest_receipt
      FROM event_vendors v
      JOIN events e ON e.id = v.event_id
      WHERE v.event_id = $1
    `;
    const params: any[] = [eventId];
    let paramIndex = 2;

    if (filters?.source && filters.source !== 'all') {
      sql += ` AND v.source = $${paramIndex}`;
      params.push(filters.source);
      paramIndex++;
    }

    if (filters?.status && filters.status !== 'all') {
      sql += ` AND v.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = `%${filters.search.trim()}%`;
      sql += ` AND (v.business_name ILIKE $${paramIndex} OR v.contact_name ILIKE $${paramIndex} OR v.contact_email ILIKE $${paramIndex} OR v.booth_number ILIKE $${paramIndex})`;
      params.push(q);
      paramIndex++;
    }

    sql += ` ORDER BY v.created_at DESC`;

    const res = await query(sql, params);

    // Get overview counters
    const countRes = await query(
      `SELECT 
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed,
         COUNT(*) FILTER (WHERE status = 'pending')::int as pending
       FROM event_vendors 
       WHERE event_id = $1`,
      [eventId]
    );

    return {
      vendors: res.rows.map((row) => this.mapVendorRow(row)),
      totalCount: countRes.rows[0]?.total || 0,
      confirmedCount: countRes.rows[0]?.confirmed || 0,
      pendingCount: countRes.rows[0]?.pending || 0,
    };
  }

  /**
   * Organizer manually adds a vendor (source = 'manual' or 'sponsorship')
   * No cut or platform fee on manual or sponsorship vendors.
   */
  static async addManualVendor(
    organizerId: string,
    eventId: string,
    data: {
      businessName: string;
      category?: string | null;
      contactName: string;
      contactEmail: string;
      contactPhone?: string | null;
      showcaseDescription?: string | null;
      specialRequirements?: string | null;
      spaceSqm: number;
      boothNumber?: string | null;
      source?: 'manual' | 'sponsorship';
      logoUrl?: string | null;
      websiteUrl?: string | null;
    },
    isAdmin: boolean = false
  ): Promise<IEventVendor> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    // Find exhibitor call id if exists
    const callRes = await query('SELECT id FROM exhibitor_calls WHERE event_id = $1', [eventId]);
    const callId = callRes.rows[0]?.id || null;

    const insertSql = `
      INSERT INTO event_vendors (
        event_id, exhibitor_call_id, source, business_name, category,
        contact_name, contact_email, contact_phone, showcase_description,
        special_requirements,
        space_sqm, organizer_price_per_sqm, sheeba_cut_percent,
        total_organizer_amount, total_cut_amount, total_final_amount,
        booth_number, status, payment_status, logo_url, website_url,
        paid_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10,
        $11, 0, 0,
        0, 0, 0,
        $12, 'confirmed', 'paid', $13, $14,
        NOW()
      )
      RETURNING *;
    `;

    const res = await query(insertSql, [
      eventId,
      callId,
      data.source || 'manual',
      data.businessName.trim(),
      data.category?.trim() || null,
      data.contactName.trim(),
      data.contactEmail.trim().toLowerCase(),
      data.contactPhone?.trim() || null,
      data.showcaseDescription || null,
      data.specialRequirements?.trim() || null,
      data.spaceSqm || 1,
      data.boothNumber?.trim() || null,
      data.logoUrl || null,
      data.websiteUrl || null,
    ]);

    await CacheService.delPattern(`exhibitors:public:${eventId}*`);
    await CacheService.delPattern(`event:${eventId}*`);
    await CacheService.delPattern(`*http:*/api/exhibitors/events/${eventId}*`);
    await CacheService.delPattern(`*http:*/api/events/${eventId}*`);

    return this.mapVendorRow(res.rows[0]);
  }

  /**
   * Organizer updates vendor details (booth number, space, status, showcase, etc.)
   */
  static async updateVendor(
    organizerId: string,
    eventId: string,
    vendorId: string,
    data: Partial<{
      businessName: string;
      category: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      showcaseDescription: string;
      specialRequirements: string;
      spaceSqm: number;
      boothNumber: string;
      status: string;
      rejectionReason: string;
      logoUrl: string;
      websiteUrl: string;
    }>,
    isAdmin: boolean = false
  ): Promise<IEventVendor> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const vendorRes = await client.query(
        'SELECT * FROM event_vendors WHERE id = $1 AND event_id = $2 FOR UPDATE',
        [vendorId, eventId]
      );
      if (vendorRes.rows.length === 0) {
        const err: any = new Error('Vendor record not found.');
        err.statusCode = 404;
        throw err;
      }

      const current = vendorRes.rows[0];
      const finalAmount = parseFloat(current.total_final_amount) || 0;
      let targetStatus = data.status || current.status;

      // Handle approval transition from 'pending'
      if (current.status === 'pending' && (data.status === 'accepted_awaiting_payment' || data.status === 'confirmed')) {
        if (current.source === 'applied') {
          if (finalAmount <= 0) {
            // Free application: Automatically confirm upon approval, no payment transaction required
            targetStatus = 'confirmed';
          } else {
            // Paid application: Organizer approval moves it strictly to accepted_awaiting_payment
            targetStatus = 'accepted_awaiting_payment';
          }
        } else {
          // Manual or sponsorship vendors: Organizer can set confirmed directly
          targetStatus = data.status;
        }
      }

      // Prevent manual confirmation of paid applied applications
      if (current.source === 'applied' && finalAmount > 0 && targetStatus === 'confirmed') {
        const err: any = new Error(
          'Paid exhibitor applications cannot be manually marked confirmed. Confirmation requires successful payment verification.'
        );
        err.statusCode = 400;
        err.code = 'PAYMENT_VERIFICATION_REQUIRED';
        throw err;
      }

      const newSpaceSqm = data.spaceSqm !== undefined ? Number(data.spaceSqm) : Number(current.space_sqm);

      // Validate status transitions if status is changing
      if (targetStatus !== current.status) {
        const allowedTransitions: Record<string, string[]> = {
          pending: ['accepted_awaiting_payment', 'rejected', 'cancelled'],
          accepted_awaiting_payment: ['rejected', 'cancelled'],
          confirmed: ['cancelled'],
          rejected: ['pending', 'accepted_awaiting_payment'],
          cancelled: ['pending'],
        };

        // Only manual or sponsorship entries or free applications can be marked confirmed via organizer update
        if (current.source !== 'applied' || finalAmount <= 0) {
          allowedTransitions.pending.push('confirmed');
          allowedTransitions.accepted_awaiting_payment.push('confirmed');
        }

        const validNext = allowedTransitions[current.status] || [];
        if (!validNext.includes(targetStatus)) {
          const err: any = new Error(
            `Invalid status transition from '${current.status}' to '${targetStatus}'.`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      const isBecomingCommitted = ['confirmed', 'accepted_awaiting_payment'].includes(targetStatus);
      const wasAlreadyCommitted = ['confirmed', 'accepted_awaiting_payment'].includes(current.status);

      if (isBecomingCommitted && (!wasAlreadyCommitted || newSpaceSqm > Number(current.space_sqm))) {
        // Lock exhibitor_calls row to serialize capacity checks against concurrent approvals / applications
        const callRes = await client.query(
          'SELECT total_space_sqm, max_exhibitors FROM exhibitor_calls WHERE event_id = $1 FOR UPDATE',
          [eventId]
        );
        if (callRes.rows.length > 0) {
          const totalSpace = parseFloat(callRes.rows[0].total_space_sqm) || 0;
          const otherSpaceRes = await client.query(
            `SELECT COALESCE(SUM(space_sqm), 0)::float as other_space
             FROM event_vendors
             WHERE event_id = $1 AND id != $2 AND status IN ('confirmed', 'accepted_awaiting_payment')`,
            [eventId, vendorId]
          );
          const otherSpace = otherSpaceRes.rows[0]?.other_space || 0;
          if (totalSpace > 0 && (otherSpace + newSpaceSqm) > totalSpace) {
            const remainingForThis = Math.max(0, totalSpace - otherSpace);
            const err: any = new Error(
              `Cannot commit vendor. Space required (${newSpaceSqm} sqm) exceeds remaining available space (${remainingForThis} sqm).`
            );
            err.statusCode = 400;
            throw err;
          }

          if (!wasAlreadyCommitted) {
            const maxExhibitors = parseInt(callRes.rows[0].max_exhibitors, 10) || 0;
            if (maxExhibitors > 0) {
              const otherCountRes = await client.query(
                `SELECT COUNT(*)::int as count
                 FROM event_vendors
                 WHERE event_id = $1 AND id != $2 AND status IN ('confirmed', 'accepted_awaiting_payment')`,
                [eventId, vendorId]
              );
              const currentCount = otherCountRes.rows[0]?.count || 0;
              if (currentCount + 1 > maxExhibitors) {
                const err: any = new Error(
                  `Cannot accept vendor. Maximum exhibitor limit (${maxExhibitors}) has been reached.`
                );
                err.statusCode = 400;
                throw err;
              }
            }
          }
        }
      }

      const updateSql = `
        UPDATE event_vendors SET
          business_name = COALESCE($1, business_name),
          category = COALESCE($2, category),
          contact_name = COALESCE($3, contact_name),
          contact_email = COALESCE($4, contact_email),
          contact_phone = COALESCE($5, contact_phone),
          showcase_description = COALESCE($6, showcase_description),
          special_requirements = COALESCE($7, special_requirements),
          space_sqm = COALESCE($8, space_sqm),
          total_organizer_amount = CASE
            WHEN $8 IS NOT NULL AND pricing_mode = 'fixed' THEN total_organizer_amount
            WHEN $8 IS NOT NULL THEN (ROUND(($8 * organizer_price_per_sqm)::numeric, 2))
            ELSE total_organizer_amount
          END,
          total_cut_amount = CASE
            WHEN $8 IS NOT NULL AND pricing_mode = 'fixed' THEN total_cut_amount
            WHEN $8 IS NOT NULL THEN (ROUND((($8 * organizer_price_per_sqm) * (sheeba_cut_percent / 100))::numeric, 2))
            ELSE total_cut_amount
          END,
          total_final_amount = CASE
            WHEN $8 IS NOT NULL AND pricing_mode = 'fixed' THEN total_final_amount
            WHEN $8 IS NOT NULL THEN (ROUND((($8 * organizer_price_per_sqm) * (1 + sheeba_cut_percent / 100))::numeric, 2))
            ELSE total_final_amount
          END,
          booth_number = COALESCE($9, booth_number),
          status = COALESCE($10, status),
          rejection_reason = COALESCE($11, rejection_reason),
          logo_url = COALESCE($12, logo_url),
          website_url = COALESCE($13, website_url),
          payment_status = CASE
            WHEN $10 = 'confirmed' AND (source != 'applied' OR total_final_amount <= 0) THEN 'paid'
            WHEN $10 = 'accepted_awaiting_payment' THEN 'unpaid'
            ELSE payment_status
          END,
          payment_reference = CASE
            WHEN $10 = 'confirmed' AND source = 'applied' AND total_final_amount <= 0 THEN COALESCE(payment_reference, 'FREE_EVENT')
            WHEN $10 = 'confirmed' AND source != 'applied' THEN COALESCE(payment_reference, 'MANUAL_OR_SPONSOR')
            ELSE payment_reference
          END,
          paid_at = CASE
            WHEN $10 = 'confirmed' AND (source != 'applied' OR total_final_amount <= 0) THEN COALESCE(paid_at, NOW())
            ELSE paid_at
          END,
          updated_at = NOW()
        WHERE id = $14 AND event_id = $15
        RETURNING *;
      `;

      const res = await client.query(updateSql, [
        data.businessName?.trim() ?? null,
        data.category?.trim() ?? null,
        data.contactName?.trim() ?? null,
        data.contactEmail?.trim()?.toLowerCase() ?? null,
        data.contactPhone?.trim() ?? null,
        data.showcaseDescription ?? null,
        data.specialRequirements ?? null,
        data.spaceSqm ?? null,
        data.boothNumber?.trim() ?? null,
        targetStatus ?? null,
        data.rejectionReason ?? null,
        data.logoUrl ?? null,
        data.websiteUrl ?? null,
        vendorId,
        eventId,
      ]);

      await client.query('COMMIT');

      await CacheService.delPattern(`exhibitors:public:${eventId}*`);
      await CacheService.delPattern(`event:${eventId}*`);
      await CacheService.delPattern(`*http:*/api/exhibitors/events/${eventId}*`);
      await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
      if (vendorRes.rows[0]?.user_id) {
        await CacheService.delPattern(`*http:*user:${vendorRes.rows[0].user_id}*`);
      }

      return this.mapVendorRow(res.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Organizer removes / deletes a vendor record
   */
  static async deleteVendor(organizerId: string, eventId: string, vendorId: string, isAdmin: boolean = false): Promise<void> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const vendorRes = await query('SELECT user_id FROM event_vendors WHERE id = $1 AND event_id = $2', [vendorId, eventId]);
    if (vendorRes.rows.length === 0) {
      const err: any = new Error('Vendor record not found.');
      err.statusCode = 404;
      throw err;
    }
    const vendorUserId = vendorRes.rows[0].user_id;

    await query('DELETE FROM event_vendors WHERE id = $1 AND event_id = $2', [vendorId, eventId]);

    await CacheService.delPattern(`exhibitors:public:${eventId}*`);
    await CacheService.delPattern(`event:${eventId}*`);
    await CacheService.delPattern(`*http:*/api/exhibitors/events/${eventId}*`);
    await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
    if (vendorUserId) {
      await CacheService.delPattern(`*http:*user:${vendorUserId}*`);
    }
  }

  /**
   * Public: Fetch confirmed exhibitors for event registration page
   * Only returns exhibitors if call is enabled and vendor status is confirmed.
   */
  static async getPublicEventExhibitors(eventId: string): Promise<Array<{
    id: string;
    businessName: string;
    category: string | null;
    showcaseDescription: string | null;
    spaceSqm: number;
    boothNumber: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    source: string;
  }>> {
    const cacheKey = `exhibitors:public:${eventId}`;
    const cached = await CacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if exhibitors are enabled for this event
    const callRes = await query('SELECT is_enabled FROM exhibitor_calls WHERE event_id = $1', [eventId]);
    if (callRes.rows.length === 0 || !callRes.rows[0].is_enabled) {
      await CacheService.set(cacheKey, [], 60);
      return [];
    }

    const res = await query(
      `SELECT id, business_name, category, showcase_description, space_sqm, booth_number, logo_url, website_url, source
       FROM event_vendors
       WHERE event_id = $1 AND status = 'confirmed'
       ORDER BY business_name ASC`,
      [eventId]
    );

    const result = res.rows.map((row) => ({
      id: row.id,
      businessName: row.business_name,
      category: row.category,
      showcaseDescription: row.showcase_description,
      spaceSqm: parseFloat(row.space_sqm) || 1,
      boothNumber: row.booth_number,
      logoUrl: row.logo_url,
      websiteUrl: row.website_url,
      source: row.source,
    }));

    await CacheService.set(cacheKey, result, 60);
    return result;
  }

  /**
   * Exhibitor: Explore all events with open exhibitor calls
   * Public-safe: Strictly filters by enabled, open status, future event date, unexpired deadline, and available capacity.
   * Strips private organizer settings such as payout accounts/telebirr numbers.
   */
  static async exploreOpenCalls(filters?: { category?: string; search?: string }): Promise<any[]> {
    const cacheKey = `exhibitors:explore:${JSON.stringify(filters || {})}`;
    const cached = await CacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let sql = `
      SELECT 
        ec.id as exhibitor_call_id,
        ec.event_id,
        ec.status as call_status,
        ec.pricing_mode,
        ec.total_space_sqm,
        ec.price_per_sqm,
        ec.fixed_fee,
        ec.sheeba_cut_percent,
        ec.max_exhibitors,
        ec.specifications,
        ec.custom_questions,
        ec.application_deadline,
        ec.description as space_description,
        e.title as event_title,
        e.description as event_description,
        e.category as event_category,
        e.event_type,
        e.event_date,
        e.location as event_location,
        e.venue_name,
        e.banner_url,
        e.poster_image_url,
        u.organization as organizer_organization,
        u.full_name as organizer_name,
        COALESCE(SUM(v.space_sqm) FILTER (WHERE v.status IN ('confirmed', 'accepted_awaiting_payment')), 0)::float as space_allocated,
        COUNT(v.id) FILTER (WHERE v.status IN ('confirmed', 'accepted_awaiting_payment'))::int as confirmed_vendors_count
      FROM exhibitor_calls ec
      JOIN events e ON e.id = ec.event_id
      JOIN users u ON u.id = e.organizer_id
      LEFT JOIN event_vendors v ON v.event_id = e.id
      WHERE ec.is_enabled = TRUE
        AND ec.status = 'open'
        AND (ec.application_deadline IS NULL OR ec.application_deadline >= NOW())
        AND (COALESCE(e.end_date, e.event_date) >= CURRENT_DATE)
        AND e.status NOT IN ('cancelled', 'canceled', 'completed', 'draft')
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.category && filters.category !== 'all') {
      sql += ` AND e.category ILIKE $${paramIndex}`;
      params.push(`%${filters.category}%`);
      paramIndex++;
    }

    if (filters?.search && filters.search.trim()) {
      sql += ` AND (e.title ILIKE $${paramIndex} OR e.location ILIKE $${paramIndex} OR ec.specifications ILIKE $${paramIndex})`;
      params.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    sql += ` GROUP BY ec.id, e.id, u.id ORDER BY e.event_date ASC`;

    const res = await query(sql, params);
    const eligibleCalls: any[] = [];

    for (const row of res.rows) {
      const pricingMode = row.pricing_mode || 'per_sqm';
      const basePrice = parseFloat(row.price_per_sqm) || 0;
      const fixedFee = parseFloat(row.fixed_fee) || 0;
      const cutPercent = parseFloat(row.sheeba_cut_percent) || 30;
      const finalPricePerSqm = basePrice * (1 + cutPercent / 100);
      const finalFixedFee = fixedFee * (1 + cutPercent / 100);
      const totalSpace = parseFloat(row.total_space_sqm) || 0;
      const spaceAllocated = parseFloat(row.space_allocated) || 0;
      const spaceRemaining = Math.max(0, totalSpace - spaceAllocated);
      const maxExhibitors = parseInt(row.max_exhibitors, 10) || 10;
      const confirmedVendorsCount = parseInt(row.confirmed_vendors_count, 10) || 0;

      // Filter out calls that have reached max exhibitor headcount capacity
      if (maxExhibitors > 0 && confirmedVendorsCount >= maxExhibitors) {
        continue;
      }
      // If pricing is per_sqm and space is specified, filter out calls with no remaining space
      if (pricingMode === 'per_sqm' && totalSpace > 0 && spaceRemaining <= 0) {
        continue;
      }

      eligibleCalls.push({
        id: row.exhibitor_call_id,
        eventId: row.event_id,
        eventTitle: row.event_title,
        eventDescription: row.event_description,
        eventCategory: row.event_category,
        eventType: row.event_type,
        eventDate: row.event_date,
        eventLocation: row.event_location,
        venueName: row.venue_name,
        bannerUrl: row.banner_url || row.poster_image_url,
        organizerOrganization: row.organizer_organization || row.organizer_name,
        pricingMode,
        totalSpaceSqm: totalSpace,
        spaceAllocated,
        spaceRemaining,
        maxExhibitors,
        confirmedVendorsCount,
        specifications: row.specifications,
        customQuestions: row.custom_questions || [],
        applicationDeadline: row.application_deadline,
        spaceDescription: row.space_description,
        finalPricePerSqm: Math.round(finalPricePerSqm),
        pricePerSqm: basePrice,
        fixedFee,
        finalFixedFee: Math.round(finalFixedFee),
        sheebaCutPercent: cutPercent,
      });
    }

    await CacheService.set(cacheKey, eligibleCalls, 60);
    return eligibleCalls;
  }

  /**
   * Exhibitor applies for booth space at an event
   * Status is initialized to 'pending' and payment_status to 'unpaid'.
   */
  static async applyForBooth(
    userId: string,
    eventId: string,
    data: {
      businessName: string;
      category?: string | null;
      contactName: string;
      contactEmail: string;
      contactPhone?: string | null;
      showcaseDescription: string;
      specialRequirements?: string | null;
      spaceSqm: number;
      logoUrl?: string | null;
      websiteUrl?: string | null;
      pricingMode?: ExhibitorPricingMode;
      questionAnswers?: Record<string, any>;
    }
  ): Promise<IEventVendor> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch exhibitor call for this event with row-level lock
      const callRes = await client.query(
        `SELECT ec.*, e.title as event_title, e.event_date
         FROM exhibitor_calls ec
         JOIN events e ON e.id = ec.event_id
         WHERE ec.event_id = $1
         FOR UPDATE`,
        [eventId]
      );

      if (callRes.rows.length === 0) {
        const err: any = new Error('Exhibitor call not found for this event.');
        err.statusCode = 404;
        throw err;
      }

      const call = callRes.rows[0];

      // 2. Validate that the call is enabled and currently open
      if (!call.is_enabled || call.status !== 'open') {
        const err: any = new Error('Exhibitor applications are currently closed for this event.');
        err.statusCode = 400;
        throw err;
      }

      // 3. Check application deadline if set
      if (call.application_deadline && new Date() > new Date(call.application_deadline)) {
        const err: any = new Error('The application deadline for this event has passed.');
        err.statusCode = 400;
        throw err;
      }

      // 4. Validate requested space
      const spaceSqm = Number(data.spaceSqm);
      if (!spaceSqm || spaceSqm <= 0) {
        const err: any = new Error('Requested space must be greater than 0 sqm.');
        err.statusCode = 400;
        throw err;
      }

      // 5. Check committed booth space and capacity
      // Committed space includes confirmed vendors and accepted applications awaiting payment.
      const statsRes = await client.query(
        `SELECT
           COALESCE(SUM(space_sqm) FILTER (WHERE status IN ('confirmed', 'accepted_awaiting_payment')), 0)::float as committed_space,
           COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed_count
         FROM event_vendors
         WHERE event_id = $1`,
        [eventId]
      );

      const committedSpace = statsRes.rows[0]?.committed_space || 0;
      const confirmedCount = statsRes.rows[0]?.confirmed_count || 0;
      const totalSpace = parseFloat(call.total_space_sqm) || 0;
      const maxExhibitors = parseInt(call.max_exhibitors, 10) || 10;

      if (totalSpace > 0) {
        const spaceRemaining = Math.max(0, totalSpace - committedSpace);
        if (spaceSqm > spaceRemaining) {
          const err: any = new Error(
            `Requested space (${spaceSqm} sqm) exceeds the remaining available exhibition space (${spaceRemaining} sqm).`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      if (maxExhibitors > 0 && confirmedCount >= maxExhibitors) {
        const err: any = new Error('The maximum number of exhibitors for this event has already been reached.');
        err.statusCode = 400;
        throw err;
      }

      // 6. Prevent duplicate pending/active applications for same user or email
      const dupRes = await client.query(
        `SELECT id, status FROM event_vendors
         WHERE event_id = $1
           AND (user_id = $2 OR LOWER(contact_email) = $3)
           AND status NOT IN ('rejected', 'cancelled')`,
        [eventId, userId, data.contactEmail.trim().toLowerCase()]
      );

      if (dupRes.rows.length > 0) {
        const existingStatus = dupRes.rows[0].status;
        const err: any = new Error(
          existingStatus === 'pending'
            ? 'You already have a pending application under review for this event.'
            : 'You already have an active application or booth booking for this event.'
        );
        err.statusCode = 409;
        throw err;
      }

      // 7. Validate question answers against call.custom_questions
      const rawQuestions = call.custom_questions;
      const configuredQuestions: RegistrationQuestion[] = Array.isArray(rawQuestions)
        ? rawQuestions
        : typeof rawQuestions === 'string'
          ? JSON.parse(rawQuestions || '[]')
          : [];

      const answers: Record<string, any> = data.questionAnswers || {};

      for (const q of configuredQuestions) {
        const val = answers[q.id];
        const isFilled =
          typeof val === 'string'
            ? val.trim().length > 0
            : Array.isArray(val)
              ? val.length > 0
              : val !== undefined && val !== null && val !== '';

        if (q.isRequired && !isFilled) {
          const err: any = new Error(`Please answer required question: "${q.questionText}"`);
          err.statusCode = 400;
          err.code = 'VALIDATION_ERROR';
          throw err;
        }

        if (isFilled && q.options && q.options.length > 0) {
          const validOptionSet = new Set(q.options.map((opt: string) => opt.trim()));
          if (['choice', 'select', 'radio', 'dropdown'].includes(q.type || '')) {
            if (typeof val === 'string' && !validOptionSet.has(val.trim())) {
              const err: any = new Error(`Invalid selection for question: "${q.questionText}".`);
              err.statusCode = 400;
              err.code = 'VALIDATION_ERROR';
              throw err;
            }
          } else if (['multi_choice', 'checkbox'].includes(q.type || '')) {
            const selectedList = Array.isArray(val)
              ? val
              : typeof val === 'string'
                ? val.split(',').map((s: string) => s.trim())
                : [];
            const hasInvalid = selectedList.some((item: string) => !validOptionSet.has(item.trim()));
            if (hasInvalid) {
              const err: any = new Error(`Invalid options selected for question: "${q.questionText}".`);
              err.statusCode = 400;
              err.code = 'VALIDATION_ERROR';
              throw err;
            }
          }
        }
      }

      // 8. Calculate pricing: per_sqm vs fixed
      const pricingMode: ExhibitorPricingMode = (call.pricing_mode as ExhibitorPricingMode) || 'per_sqm';
      const organizerPricePerSqm = parseFloat(call.price_per_sqm) || 0;
      const fixedFee = parseFloat(call.fixed_fee) || 0;
      const sheebaCutPercent = parseFloat(call.sheeba_cut_percent) || 30.0;

      let totalOrganizerAmount = 0;
      if (pricingMode === 'fixed') {
        totalOrganizerAmount = Math.round(fixedFee * 100) / 100;
      } else {
        totalOrganizerAmount = Math.round(spaceSqm * organizerPricePerSqm * 100) / 100;
      }

      const totalCutAmount = Math.round(totalOrganizerAmount * (sheebaCutPercent / 100) * 100) / 100;
      const totalFinalAmount = Math.round((totalOrganizerAmount + totalCutAmount) * 100) / 100;

      // 9. Insert vendor application with source 'applied', status 'pending', payment_status 'unpaid'
      const insertSql = `
        INSERT INTO event_vendors (
          event_id, exhibitor_call_id, user_id, source,
          business_name, category, contact_name, contact_email,
          contact_phone, showcase_description, special_requirements,
          pricing_mode, space_sqm, organizer_price_per_sqm, sheeba_cut_percent,
          total_organizer_amount, total_cut_amount, total_final_amount,
          question_answers, booth_number, status, payment_status,
          logo_url, website_url, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'applied',
          $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18::jsonb, NULL, 'pending', 'unpaid',
          $19, $20, NOW(), NOW()
        )
        RETURNING *;
      `;

      const res = await client.query(insertSql, [
        eventId,
        call.id,
        userId,
        data.businessName.trim(),
        data.category?.trim() || null,
        data.contactName.trim(),
        data.contactEmail.trim().toLowerCase(),
        data.contactPhone?.trim() || null,
        data.showcaseDescription.trim(),
        data.specialRequirements?.trim() || null,
        pricingMode,
        spaceSqm,
        organizerPricePerSqm,
        sheebaCutPercent,
        totalOrganizerAmount,
        totalCutAmount,
        totalFinalAmount,
        JSON.stringify(answers),
        data.logoUrl?.trim() || null,
        data.websiteUrl?.trim() || null,
      ]);

      await client.query('COMMIT');

      await CacheService.delPattern(`*http:*/api/exhibitors/events/${eventId}*`);
      await CacheService.delPattern(`*http:*user:${userId}*`);

      return this.mapVendorRow(res.rows[0]);
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        const err: any = new Error('You already have an active application or booth booking for this event.');
        err.statusCode = 409;
        throw err;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Exhibitor: Retrieve all booth applications & confirmed booths for authenticated exhibitor
   */
  static async getMyBooths(userId: string): Promise<any[]> {
    const res = await query(
      `SELECT
         v.*,
         e.title as event_title,
         e.event_date,
         e.location as event_location,
         e.venue_name,
         e.banner_url,
         e.poster_image_url,
         e.payment_methods as event_payment_methods,
         ec.payment_config,
         (
           SELECT json_build_object(
             'id', p.id,
             'transactionId', p.transaction_id,
             'status', p.status,
             'screenshotUrl', p.screenshot_url,
             'failureReason', p.failure_reason,
             'paymentMethod', p.payment_method,
             'verifiedAt', p.verified_at,
             'createdAt', p.created_at,
             'transactionReference', (p.provider_response->>'transactionReference'),
             'notes', (p.provider_response->>'notes')
           )
           FROM payments p
           WHERE p.vendor_id = v.id AND p.payment_type = 'exhibitor_booth'
           ORDER BY p.created_at DESC
           LIMIT 1
         ) as latest_receipt,
         (SELECT COUNT(*)::int FROM registrations r WHERE r.event_id = v.event_id) as total_registered,
         (SELECT COUNT(*)::int FROM check_ins ci WHERE ci.event_id = v.event_id AND ci.voided_at IS NULL) as total_checked_in,
         (SELECT COUNT(*)::int FROM exhibitor_booth_visitors ebv WHERE ebv.vendor_id = v.id) as total_visitors_logged
       FROM event_vendors v
       JOIN events e ON e.id = v.event_id
       LEFT JOIN exhibitor_calls ec ON ec.event_id = v.event_id
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC`,
      [userId]
    );

    return res.rows.map((row) => {
      const mapped = this.mapVendorRow(row);

      // Defensively parse and sanitize payment_config, merging organizer accounts
      let paymentConfig: any = null;
      const isApprovedForPayment = ['accepted_awaiting_payment', 'confirmed'].includes(row.status);

      if (isApprovedForPayment) {
        const mergedDestinations: any[] = [];
        let instructions = '';

        // 1. From exhibitor call payment_config if defined
        if (row.payment_config) {
          try {
            const raw = typeof row.payment_config === 'string'
              ? JSON.parse(row.payment_config)
              : row.payment_config;

            if (raw && typeof raw === 'object') {
              if (typeof raw.instructions === 'string') {
                instructions = raw.instructions;
              }
              if (Array.isArray(raw.destinations)) {
                raw.destinations.forEach((d: any) => {
                  if (d && typeof d === 'object' && d.provider && d.accountNumber) {
                    mergedDestinations.push({
                      id: d.id ? String(d.id) : undefined,
                      provider: String(d.provider),
                      accountNumber: String(d.accountNumber),
                      accountHolder: d.accountHolder ? String(d.accountHolder) : '',
                      label: d.label ? String(d.label) : '',
                    });
                  }
                });
              }
            }
          } catch {}
        }

        // 2. From event payment_methods (organizer's configured receiving accounts)
        if (row.event_payment_methods) {
          try {
            const evPms = typeof row.event_payment_methods === 'string'
              ? JSON.parse(row.event_payment_methods)
              : row.event_payment_methods;

            if (Array.isArray(evPms)) {
              evPms.forEach((d: any) => {
                if (d && typeof d === 'object' && d.provider && d.accountNumber) {
                  const alreadyExists = mergedDestinations.some(
                    (m) =>
                      m.provider.toLowerCase() === String(d.provider).toLowerCase() &&
                      m.accountNumber.trim() === String(d.accountNumber).trim()
                  );
                  if (!alreadyExists) {
                    mergedDestinations.push({
                      id: d.id ? String(d.id) : undefined,
                      provider: String(d.provider),
                      accountNumber: String(d.accountNumber),
                      accountHolder: d.accountHolder ? String(d.accountHolder) : '',
                      label: d.label ? String(d.label) : '',
                    });
                  }
                }
              });
            }
          } catch {}
        }

        paymentConfig = {
          allowManual: mergedDestinations.length > 0 || true,
          instructions,
          destinations: mergedDestinations,
        };
      }

      return {
        ...mapped,
        venueName: row.venue_name,
        bannerUrl: row.banner_url || row.poster_image_url,
        paymentConfig,
        turnout: {
          totalRegistered: parseInt(row.total_registered, 10) || 0,
          totalCheckedIn: parseInt(row.total_checked_in, 10) || 0,
          totalVisitorsLogged: parseInt(row.total_visitors_logged, 10) || 0,
        },
      };
    });
  }

  /**
   * Exhibitor: Process platform payment for an accepted booth application
   * Transitions vendor from accepted_awaiting_payment -> confirmed & paid.
   */
  static async payForBooth(
    userId: string,
    vendorId: string,
    paymentData?: {
      paymentMethod?: string;
      paymentReference?: string;
      screenshotUrl?: string | null;
      screenshotBase64?: string | null;
      transactionId?: string;
    }
  ): Promise<IEventVendor> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const vendorRes = await client.query(
        `SELECT v.*, e.title as event_title, e.organizer_id, e.currency as event_currency,
                e.payment_methods as event_payment_methods, ec.payment_config
         FROM event_vendors v
         JOIN events e ON e.id = v.event_id
         LEFT JOIN exhibitor_calls ec ON ec.event_id = v.event_id
         WHERE v.id = $1 AND v.user_id = $2
         FOR UPDATE OF v`,
        [vendorId, userId]
      );

      if (vendorRes.rows.length === 0) {
        const err: any = new Error('Booth application not found or unauthorized.');
        err.statusCode = 404;
        throw err;
      }

      const vendor = vendorRes.rows[0];

      if (vendor.status !== 'accepted_awaiting_payment') {
        const err: any = new Error(
          vendor.status === 'confirmed'
            ? 'This booth booking is already confirmed and paid.'
            : `Cannot process payment for booth application with current status '${vendor.status}'.`
        );
        err.statusCode = 400;
        throw err;
      }

      const totalFinalAmount = parseFloat(vendor.total_final_amount) || 0;

      // Free application: Automatically confirm without payment transaction
      if (totalFinalAmount <= 0) {
        const updateRes = await client.query(
          `UPDATE event_vendors
           SET status = 'confirmed',
               payment_status = 'paid',
               payment_reference = 'FREE_EVENT',
               paid_at = NOW(),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [vendorId]
        );

        await client.query('COMMIT');

        await CacheService.delPattern(`exhibitors:public:${vendor.event_id}*`);
        await CacheService.delPattern(`event:${vendor.event_id}*`);
        await CacheService.delPattern(`*http:*/api/exhibitors/events/${vendor.event_id}*`);
        await CacheService.delPattern(`*http:*/api/events/${vendor.event_id}*`);
        await CacheService.delPattern(`*http:*user:${userId}*`);

        return this.mapVendorRow(updateRes.rows[0]);
      }

      // Paid application: Authoritative Links.et payment verification
      const paymentReference = (paymentData?.paymentReference || paymentData?.transactionId || '').trim();
      const screenshotBase64 = paymentData?.screenshotBase64?.trim() || null;
      const screenshotUrl = paymentData?.screenshotUrl?.trim() || null;
      const paymentMethod = paymentData?.paymentMethod?.trim() || 'cbe';

      if (!paymentReference && !screenshotBase64 && !screenshotUrl) {
        const err: any = new Error('Payment evidence is required. Please provide a transaction reference or receipt screenshot.');
        err.statusCode = 400;
        err.code = 'PAYMENT_EVIDENCE_REQUIRED';
        throw err;
      }

      // Collect organizer receiving accounts from event & exhibitor call
      const configuredDestinations: any[] = [];
      if (vendor.event_payment_methods) {
        try {
          const raw = typeof vendor.event_payment_methods === 'string'
            ? JSON.parse(vendor.event_payment_methods)
            : vendor.event_payment_methods;
          if (Array.isArray(raw)) {
            configuredDestinations.push(...raw.filter((d: any) => d && d.provider && d.accountNumber));
          }
        } catch {}
      }
      if (vendor.payment_config) {
        try {
          const raw = typeof vendor.payment_config === 'string'
            ? JSON.parse(vendor.payment_config)
            : vendor.payment_config;
          if (raw && Array.isArray(raw.destinations)) {
            raw.destinations.forEach((d: any) => {
              if (d && d.provider && d.accountNumber) {
                const exists = configuredDestinations.some(
                  (c) => c.provider.toLowerCase() === d.provider.toLowerCase() &&
                         c.accountNumber.trim() === d.accountNumber.trim()
                );
                if (!exists) configuredDestinations.push(d);
              }
            });
          }
        } catch {}
      }

      const verified = await PaymentService.verifyPayment({
        event: {
          id: vendor.event_id,
          title: vendor.event_title,
          ticketPrice: totalFinalAmount,
          currency: vendor.event_currency || 'ETB',
          paymentMethods: configuredDestinations,
        },
        expectedAmount: totalFinalAmount,
        paymentReference: paymentReference || undefined,
        paymentMethod: paymentMethod,
        screenshotUrl: screenshotUrl || undefined,
        screenshotBase64: screenshotBase64 || undefined,
      });

      const effectiveTxId = verified.transactionId || paymentReference || `BOOTH-TX-${vendor.id.slice(0, 8)}-${Date.now()}`;
      const cutAmount = parseFloat(vendor.total_cut_amount) || 0;
      const organizerPayout = parseFloat(vendor.total_organizer_amount) || 0;
      const effectiveScreenshotUrl = screenshotUrl || (verified.rawReceipt?.url ?? null);

      const providerResponse = {
        transactionReference: effectiveTxId,
        paymentMethod: verified.provider || paymentMethod,
        verifiedVia: 'links_et',
        receipt: verified.rawReceipt || null,
        payerName: verified.payerName || null,
        receiverAccount: verified.receiverAccount || null,
        receiverName: verified.receiverName || null,
        verifiedAt: new Date().toISOString(),
      };

      const paymentInsertSql = `
        INSERT INTO payments (
          transaction_id,
          event_id,
          user_id,
          vendor_id,
          payment_type,
          amount,
          commission_amount,
          organizer_payout,
          currency,
          status,
          payment_method,
          screenshot_url,
          provider_response,
          verified_at,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, 'exhibitor_booth', $5, $6, $7, 'ETB', 'SETTLED', $8, $9, $10::jsonb, NOW(), NOW(), NOW())
        RETURNING *;
      `;

      await client.query(paymentInsertSql, [
        effectiveTxId,
        vendor.event_id,
        userId,
        vendorId,
        totalFinalAmount,
        cutAmount,
        organizerPayout,
        verified.provider || paymentMethod,
        effectiveScreenshotUrl,
        JSON.stringify(providerResponse),
      ]);

      const updateRes = await client.query(
        `UPDATE event_vendors
         SET status = 'confirmed',
             payment_status = 'paid',
             payment_reference = $1,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [effectiveTxId, vendorId]
      );

      await client.query('COMMIT');

      await CacheService.delPattern(`exhibitors:public:${vendor.event_id}*`);
      await CacheService.delPattern(`event:${vendor.event_id}*`);
      await CacheService.delPattern(`*http:*/api/exhibitors/events/${vendor.event_id}*`);
      await CacheService.delPattern(`*http:*/api/events/${vendor.event_id}*`);
      await CacheService.delPattern(`*http:*user:${userId}*`);

      return this.mapVendorRow(updateRes.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Exhibitor Lead Capture: Get all logged visitors for a booth
   */
  static async getBoothVisitors(userId: string, vendorId: string): Promise<any[]> {
    const ownerRes = await query('SELECT id, status FROM event_vendors WHERE id = $1 AND user_id = $2', [vendorId, userId]);
    if (ownerRes.rows.length === 0) {
      const err: any = new Error('Booth not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }
    if (ownerRes.rows[0].status !== 'confirmed') {
      const err: any = new Error('Lead capture features are only available for confirmed booth bookings.');
      err.statusCode = 403;
      throw err;
    }

    const res = await query(
      `SELECT id, vendor_id, visitor_name, visitor_email, visitor_phone, notes, created_at
       FROM exhibitor_booth_visitors
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [vendorId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      visitorName: row.visitor_name,
      visitorEmail: row.visitor_email,
      visitorPhone: row.visitor_phone,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  /**
   * Exhibitor Lead Capture: Add a visitor who stopped by the booth
   */
  static async addBoothVisitor(
    userId: string,
    vendorId: string,
    data: { visitorName: string; visitorEmail?: string | null; visitorPhone?: string | null; notes?: string | null }
  ): Promise<any> {
    const ownerRes = await query('SELECT id, status FROM event_vendors WHERE id = $1 AND user_id = $2', [vendorId, userId]);
    if (ownerRes.rows.length === 0) {
      const err: any = new Error('Booth not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }
    if (ownerRes.rows[0].status !== 'confirmed') {
      const err: any = new Error('Lead capture features are only available for confirmed booth bookings.');
      err.statusCode = 403;
      throw err;
    }

    const res = await query(
      `INSERT INTO exhibitor_booth_visitors (
        vendor_id, visitor_name, visitor_email, visitor_phone, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        vendorId,
        data.visitorName.trim(),
        data.visitorEmail?.trim() || null,
        data.visitorPhone?.trim() || null,
        data.notes?.trim() || null,
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      vendorId: row.vendor_id,
      visitorName: row.visitor_name,
      visitorEmail: row.visitor_email,
      visitorPhone: row.visitor_phone,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  /**
   * Exhibitor Lead Capture: Delete a logged visitor
   */
  static async deleteBoothVisitor(userId: string, vendorId: string, visitorId: string): Promise<void> {
    const ownerRes = await query('SELECT id, status FROM event_vendors WHERE id = $1 AND user_id = $2', [vendorId, userId]);
    if (ownerRes.rows.length === 0) {
      const err: any = new Error('Booth not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }
    if (ownerRes.rows[0].status !== 'confirmed') {
      const err: any = new Error('Lead capture features are only available for confirmed booth bookings.');
      err.statusCode = 403;
      throw err;
    }

    const res = await query(
      'DELETE FROM exhibitor_booth_visitors WHERE id = $1 AND vendor_id = $2 RETURNING id',
      [visitorId, vendorId]
    );
    if (res.rows.length === 0) {
      const err: any = new Error('Visitor record not found.');
      err.statusCode = 404;
      throw err;
    }
  }

  /**
   * Helper: Strictly validate uploaded Cloudinary receipt URL
   */
  /**
   * Helper to determine configured Cloudinary cloud name, matching CloudinaryService
   */
  private static getExpectedCloudName(): string {
    const url = process.env.CLOUDINARY_URL || '';
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match && match[3]) {
      return match[3].toLowerCase();
    }
    return (process.env.CLOUD_NAME || 'dktpwqspb').toLowerCase();
  }

  /**
   * Helper to validate offline payment receipt URL server-side
   */
  static validateReceiptUrl(receiptUrl: string): string {
    if (!receiptUrl || typeof receiptUrl !== 'string') {
      const err: any = new Error('Receipt URL is required.');
      err.statusCode = 400;
      throw err;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(receiptUrl.trim());
    } catch {
      const err: any = new Error('Invalid URL format for uploaded receipt file.');
      err.statusCode = 400;
      err.code = 'INVALID_FILE_URL';
      throw err;
    }

    if (parsedUrl.protocol !== 'https:') {
      const err: any = new Error('Receipt upload URL must use secure HTTPS protocol.');
      err.statusCode = 400;
      err.code = 'INSECURE_UPLOAD_URL';
      throw err;
    }

    if (parsedUrl.hostname !== 'res.cloudinary.com') {
      const err: any = new Error('Untrusted file source. Receipt uploads must be hosted on Cloudinary.');
      err.statusCode = 400;
      err.code = 'UNAUTHORIZED_UPLOAD_HOST';
      throw err;
    }

    const pathname = parsedUrl.pathname.toLowerCase();
    const expectedCloudName = this.getExpectedCloudName();
    const segments = pathname.split('/').filter(Boolean);

    // Cloudinary URLs on res.cloudinary.com start with /<cloudName>/...
    if (segments.length < 2 || segments[0] !== expectedCloudName) {
      const err: any = new Error(
        'Untrusted file source. Receipt must be uploaded to Sheeba’s authorized Cloudinary storage account.'
      );
      err.statusCode = 400;
      err.code = 'UNAUTHORIZED_UPLOAD_ACCOUNT';
      throw err;
    }

    if (!pathname.includes('/upload/')) {
      const err: any = new Error('Invalid Cloudinary resource path for uploaded receipt file.');
      err.statusCode = 400;
      err.code = 'INVALID_UPLOAD_PATH';
      throw err;
    }

    const ext = pathname.split('.').pop() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (!allowedExtensions.includes(ext)) {
      const err: any = new Error('Invalid file format. Uploaded receipt must be a JPG, PNG, WEBP, or PDF document.');
      err.statusCode = 400;
      err.code = 'INVALID_FILE_FORMAT';
      throw err;
    }

    return receiptUrl.trim();
  }

  /**
   * Exhibitor: Submit bank transfer payment receipt for verification
   */
  static async submitBoothReceipt(
    userId: string,
    vendorId: string,
    data: { receiptUrl: string; transactionReference: string; paymentMethod?: string | null; notes?: string | null }
  ): Promise<any> {
    const validUrl = this.validateReceiptUrl(data.receiptUrl);

    const txRef = data.transactionReference?.trim();
    if (!txRef || txRef.length < 2) {
      const err: any = new Error('A valid transaction reference (at least 2 characters) is required.');
      err.statusCode = 400;
      err.code = 'INVALID_TRANSACTION_REFERENCE';
      throw err;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Lock vendor row and verify ownership
      const vendorRes = await client.query(
        `SELECT v.*, e.title as event_title
         FROM event_vendors v
         JOIN events e ON e.id = v.event_id
         WHERE v.id = $1 AND v.user_id = $2
         FOR UPDATE`,
        [vendorId, userId]
      );

      if (vendorRes.rows.length === 0) {
        const err: any = new Error('Booth application not found or unauthorized.');
        err.statusCode = 404;
        throw err;
      }

      const vendor = vendorRes.rows[0];

      if (vendor.status === 'confirmed') {
        const err: any = new Error('This booth booking is already confirmed and paid.');
        err.statusCode = 400;
        throw err;
      }

      if (vendor.status !== 'accepted_awaiting_payment') {
        const err: any = new Error(`Cannot submit payment receipt for booth application with current status '${vendor.status}'.`);
        err.statusCode = 400;
        throw err;
      }

      const finalAmount = parseFloat(vendor.total_final_amount) || 0;
      if (finalAmount <= 0) {
        const err: any = new Error('This is a free booth booking. No receipt payment is required.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Prevent duplicate pending submissions
      const pendingPaymentRes = await client.query(
        `SELECT id, status, created_at
         FROM payments
         WHERE vendor_id = $1 AND payment_type = 'exhibitor_booth' AND status = 'PENDING'
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [vendorId]
      );

      if (pendingPaymentRes.rows.length > 0) {
        const err: any = new Error(
          'You already have a receipt submission pending organizer review for this booth booking. Please wait for the organizer to review your previous submission before resubmitting.'
        );
        err.statusCode = 409;
        err.code = 'RECEIPT_ALREADY_PENDING';
        throw err;
      }

      // 3. Create unique collision-resistant transaction_id for payments table
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const uniqueTxId = `BOOTH-REC-${vendor.id.slice(0, 8)}-${Date.now()}-${randomSuffix}`;
      const cutAmount = parseFloat(vendor.total_cut_amount) || 0;
      const organizerPayout = parseFloat(vendor.total_organizer_amount) || 0;
      const providerResponse = {
        transactionReference: txRef,
        paymentMethod: data.paymentMethod?.trim() || 'manual_bank_transfer',
        notes: data.notes?.trim() || null,
        submittedAt: new Date().toISOString(),
      };

      const insertPaymentSql = `
        INSERT INTO payments (
          transaction_id, event_id, user_id, vendor_id,
          payment_type, amount, commission_amount, organizer_payout,
          currency, status, payment_method, screenshot_url,
          provider_response, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'exhibitor_booth', $5, $6, $7, 'ETB', 'PENDING', $8, $9, $10::jsonb, NOW(), NOW())
        RETURNING *;
      `;

      const paymentRes = await client.query(insertPaymentSql, [
        uniqueTxId,
        vendor.event_id,
        vendor.user_id,
        vendor.id,
        finalAmount,
        cutAmount,
        organizerPayout,
        data.paymentMethod?.trim() || 'manual_bank_transfer',
        validUrl,
        JSON.stringify(providerResponse),
      ]);

      // Note: We do NOT write unverified claimed references to event_vendors.payment_reference here.
      // The claimed reference is safely preserved in payments.provider_response and will only be
      // promoted to event_vendors.payment_reference upon independent organizer verification.

      await client.query('COMMIT');

      await CacheService.delPattern(`*http:*/api/exhibitors/events/${vendor.event_id}*`);
      await CacheService.delPattern(`*http:*user:${userId}*`);

      return {
        message: 'Payment receipt submitted successfully and is awaiting organizer verification.',
        payment: paymentRes.rows[0],
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.code === '23505') {
        const err: any = new Error(
          'A transaction ID conflict occurred. Please resubmit your receipt.'
        );
        err.statusCode = 409;
        err.code = 'TRANSACTION_ID_COLLISION';
        throw err;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Exhibitor: Retrieve receipt submission history for own booth booking
   */
  static async getBoothReceiptHistory(userId: string, vendorId: string): Promise<any[]> {
    const vendorRes = await query(
      'SELECT id, user_id FROM event_vendors WHERE id = $1 AND user_id = $2',
      [vendorId, userId]
    );
    if (vendorRes.rows.length === 0) {
      const err: any = new Error('Booth application not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const res = await query(
      `SELECT
         id, transaction_id, status, screenshot_url, failure_reason,
         payment_method, verified_at, created_at,
         (provider_response->>'transactionReference') as transaction_reference,
         (provider_response->>'notes') as notes
       FROM payments
       WHERE vendor_id = $1 AND user_id = $2 AND payment_type = 'exhibitor_booth'
       ORDER BY created_at DESC`,
      [vendorId, userId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      transactionId: row.transaction_id,
      status: row.status,
      screenshotUrl: row.screenshot_url,
      failureReason: row.failure_reason,
      paymentMethod: row.payment_method,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      transactionReference: row.transaction_reference,
      notes: row.notes,
    }));
  }

  /**
   * Organizer: Retrieve receipt submission history for a vendor in an event
   */
  static async getVendorReceiptHistory(
    organizerId: string,
    eventId: string,
    vendorId: string,
    isAdmin: boolean = false
  ): Promise<any[]> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const vendorRes = await query(
      'SELECT id FROM event_vendors WHERE id = $1 AND event_id = $2',
      [vendorId, eventId]
    );
    if (vendorRes.rows.length === 0) {
      const err: any = new Error('Booth application not found for this event.');
      err.statusCode = 404;
      throw err;
    }

    const res = await query(
      `SELECT
         id, transaction_id, status, screenshot_url, failure_reason,
         payment_method, verified_at, created_at,
         (provider_response->>'transactionReference') as transaction_reference,
         (provider_response->>'notes') as notes
       FROM payments
       WHERE vendor_id = $1 AND event_id = $2 AND payment_type = 'exhibitor_booth'
       ORDER BY created_at DESC`,
      [vendorId, eventId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      transactionId: row.transaction_id,
      status: row.status,
      screenshotUrl: row.screenshot_url,
      failureReason: row.failure_reason,
      paymentMethod: row.payment_method,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      transactionReference: row.transaction_reference,
      notes: row.notes,
    }));
  }

  /**
   * Organizer: Verify and confirm offline bank transfer receipt
   */
  static async verifyBoothReceipt(
    organizerId: string,
    eventId: string,
    vendorId: string,
    data: { confirmedCleared: boolean; paymentId?: string | null; notes?: string | null },
    isAdmin: boolean = false
  ): Promise<any> {
    if (!data.confirmedCleared) {
      const err: any = new Error(
        'Organizer must explicitly confirm they have independently checked their receiving bank account and verified that funds cleared.'
      );
      err.statusCode = 400;
      err.code = 'CONFIRMATION_REQUIRED';
      throw err;
    }

    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Lock vendor row
      const vendorRes = await client.query(
        `SELECT v.*, e.title as event_title
         FROM event_vendors v
         JOIN events e ON e.id = v.event_id
         WHERE v.id = $1 AND v.event_id = $2
         FOR UPDATE`,
        [vendorId, eventId]
      );

      if (vendorRes.rows.length === 0) {
        const err: any = new Error('Booth application not found for this event.');
        err.statusCode = 404;
        throw err;
      }

      const vendor = vendorRes.rows[0];

      if (vendor.status === 'confirmed') {
        const err: any = new Error('This booth booking is already confirmed.');
        err.statusCode = 400;
        throw err;
      }

      if (vendor.status !== 'accepted_awaiting_payment') {
        const err: any = new Error(`Cannot verify receipt for booth application with current status '${vendor.status}'.`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Lock pending payment receipt row
      let paymentQuery = `
        SELECT *
        FROM payments
        WHERE vendor_id = $1 AND event_id = $2 AND payment_type = 'exhibitor_booth' AND status = 'PENDING'
      `;
      const paymentParams: any[] = [vendorId, eventId];

      if (data.paymentId) {
        paymentQuery += ` AND id = $3`;
        paymentParams.push(data.paymentId);
      }

      paymentQuery += ` ORDER BY created_at DESC LIMIT 1 FOR UPDATE`;

      const paymentRes = await client.query(paymentQuery, paymentParams);

      if (paymentRes.rows.length === 0) {
        const err: any = new Error('No pending receipt submission found for this booth booking.');
        err.statusCode = 404;
        err.code = 'NO_PENDING_RECEIPT';
        throw err;
      }

      const payment = paymentRes.rows[0];

      // 3. Lock exhibitor_calls row to serialize capacity re-check
      const callRes = await client.query(
        'SELECT total_space_sqm, max_exhibitors FROM exhibitor_calls WHERE event_id = $1 FOR UPDATE',
        [eventId]
      );

      if (callRes.rows.length > 0) {
        const totalSpace = parseFloat(callRes.rows[0].total_space_sqm) || 0;
        const maxExhibitors = parseInt(callRes.rows[0].max_exhibitors, 10) || 10;

        if (totalSpace > 0) {
          const otherSpaceRes = await client.query(
            `SELECT COALESCE(SUM(space_sqm), 0)::float as other_space
             FROM event_vendors
             WHERE event_id = $1 AND id != $2 AND status = 'confirmed'`,
            [eventId, vendorId]
          );
          const confirmedSpace = parseFloat(otherSpaceRes.rows[0]?.other_space) || 0;
          if (confirmedSpace + parseFloat(vendor.space_sqm) > totalSpace) {
            const err: any = new Error(`Cannot confirm booth: event space capacity (${totalSpace} m²) would be exceeded.`);
            err.statusCode = 400;
            throw err;
          }
        }

        const countRes = await client.query(
          `SELECT COUNT(*)::int as confirmed_count
           FROM event_vendors
           WHERE event_id = $1 AND id != $2 AND status = 'confirmed'`,
          [eventId, vendorId]
        );
        const confirmedCount = parseInt(countRes.rows[0]?.confirmed_count, 10) || 0;
        if (confirmedCount + 1 > maxExhibitors) {
          const err: any = new Error(`Cannot confirm booth: maximum exhibitor capacity (${maxExhibitors}) reached.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // 4. Update payment record to SETTLED
      const updatedPaymentRes = await client.query(
        `UPDATE payments
         SET status = 'SETTLED',
             verified_at = NOW(),
             updated_at = NOW(),
             provider_response = jsonb_set(
               COALESCE(provider_response, '{}'::jsonb),
               '{verifiedBy}',
               to_jsonb($1::text)
             )
         WHERE id = $2
         RETURNING *`,
        [organizerId, payment.id]
      );

      // Extract claimed transaction reference from payment
      let claimedRef: string | null = null;
      try {
        const pResp = payment.provider_response && typeof payment.provider_response === 'string'
          ? JSON.parse(payment.provider_response)
          : payment.provider_response || {};
        if (pResp.transactionReference) {
          claimedRef = pResp.transactionReference;
        }
      } catch {}

      // 5. Update vendor record to confirmed & paid
      const updatedVendorRes = await client.query(
        `UPDATE event_vendors
         SET status = 'confirmed',
             payment_status = 'paid',
             payment_reference = COALESCE($1, payment_reference, $2),
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $3 AND event_id = $4
         RETURNING *`,
        [claimedRef, payment.transaction_id, vendorId, eventId]
      );

      await client.query('COMMIT');

      await CacheService.delPattern(`exhibitors:public:${eventId}*`);
      await CacheService.delPattern(`event:${eventId}*`);
      await CacheService.delPattern(`*http:*/api/exhibitors/events/${eventId}*`);
      await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
      if (vendor.user_id) {
        await CacheService.delPattern(`*http:*user:${vendor.user_id}*`);
      }

      const mappedVendor = this.mapVendorRow(updatedVendorRes.rows[0]);
      return {
        vendor: mappedVendor,
        payment: updatedPaymentRes.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Organizer: Reject invalid offline bank transfer receipt
   */
  static async rejectBoothReceipt(
    organizerId: string,
    eventId: string,
    vendorId: string,
    data: { rejectionReason: string; paymentId?: string | null },
    isAdmin: boolean = false
  ): Promise<any> {
    const reason = data.rejectionReason?.trim();
    if (!reason || reason.length < 3) {
      const err: any = new Error('A valid rejection reason (minimum 3 characters) is required.');
      err.statusCode = 400;
      err.code = 'REJECTION_REASON_REQUIRED';
      throw err;
    }

    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Lock vendor row
      const vendorRes = await client.query(
        `SELECT v.*
         FROM event_vendors v
         WHERE v.id = $1 AND v.event_id = $2
         FOR UPDATE`,
        [vendorId, eventId]
      );

      if (vendorRes.rows.length === 0) {
        const err: any = new Error('Booth application not found for this event.');
        err.statusCode = 404;
        throw err;
      }

      const vendor = vendorRes.rows[0];

      if (vendor.status !== 'accepted_awaiting_payment') {
        const err: any = new Error(`Cannot reject receipt for booth application with current status '${vendor.status}'.`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Lock pending payment receipt row
      let paymentQuery = `
        SELECT *
        FROM payments
        WHERE vendor_id = $1 AND event_id = $2 AND payment_type = 'exhibitor_booth' AND status = 'PENDING'
      `;
      const paymentParams: any[] = [vendorId, eventId];

      if (data.paymentId) {
        paymentQuery += ` AND id = $3`;
        paymentParams.push(data.paymentId);
      }

      paymentQuery += ` ORDER BY created_at DESC LIMIT 1 FOR UPDATE`;

      const paymentRes = await client.query(paymentQuery, paymentParams);

      if (paymentRes.rows.length === 0) {
        const err: any = new Error('No pending receipt submission found to reject.');
        err.statusCode = 404;
        err.code = 'NO_PENDING_RECEIPT';
        throw err;
      }

      const payment = paymentRes.rows[0];

      // 3. Update payment to FAILED with failure_reason
      const updatedPaymentRes = await client.query(
        `UPDATE payments
         SET status = 'FAILED',
             failure_reason = $1,
             updated_at = NOW(),
             provider_response = jsonb_set(
               COALESCE(provider_response, '{}'::jsonb),
               '{rejectedBy}',
               to_jsonb($2::text)
             )
         WHERE id = $3
         RETURNING *`,
        [reason, organizerId, payment.id]
      );

      // 4. Ensure unconfirmed vendor payment_reference remains cleared/null
      await client.query(
        `UPDATE event_vendors
         SET payment_reference = CASE WHEN status != 'confirmed' THEN NULL ELSE payment_reference END,
             updated_at = NOW()
         WHERE id = $1 AND event_id = $2`,
        [vendorId, eventId]
      );

      // Vendor remains accepted_awaiting_payment, unpaid.
      await client.query('COMMIT');

      await CacheService.delPattern(`exhibitors:public:${eventId}*`);
      await CacheService.delPattern(`event:${eventId}*`);
      await CacheService.delPattern(`*http:*/api/exhibitors/events/${eventId}*`);
      await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
      if (vendor.user_id) {
        await CacheService.delPattern(`*http:*user:${vendor.user_id}*`);
      }

      return {
        success: true,
        message: 'Receipt submission rejected. Vendor remains awaiting payment for resubmission.',
        payment: updatedPaymentRes.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

