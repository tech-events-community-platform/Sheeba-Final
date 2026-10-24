import { query } from '../config/db';
import { IExhibitorCall, IEventVendor } from '../types';

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
        is_enabled: false,
        status: 'draft',
        description: '',
        total_space_sqm: 0,
        price_per_sqm: 0,
        sheeba_cut_percent: 30,
        max_exhibitors: 10,
        specifications: '',
        application_deadline: undefined,
        has_booth_numbers: false,
        has_vendor_checkin: false,
        created_at: new Date(),
        updated_at: new Date(),
        stats: {
          confirmedCount,
          totalSpaceAllocated,
          totalSpaceRemaining: 0,
        },
      };
    }

    const row = res.rows[0];
    const totalSpaceSqm = parseFloat(row.total_space_sqm) || 0;
    const remainingSpace = Math.max(0, totalSpaceSqm - totalSpaceAllocated);

    return {
      id: row.id,
      event_id: row.event_id,
      is_enabled: row.is_enabled,
      status: row.status,
      description: row.description,
      total_space_sqm: totalSpaceSqm,
      price_per_sqm: parseFloat(row.price_per_sqm) || 0,
      sheeba_cut_percent: parseFloat(row.sheeba_cut_percent) || 30,
      max_exhibitors: parseInt(row.max_exhibitors, 10) || 10,
      specifications: row.specifications,
      application_deadline: row.application_deadline,
      has_booth_numbers: row.has_booth_numbers,
      has_vendor_checkin: row.has_vendor_checkin,
      created_at: row.created_at,
      updated_at: row.updated_at,
      event_title: row.event_title,
      event_date: row.event_date,
      event_location: row.event_location,
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
      totalSpaceSqm: number;
      pricePerSqm: number;
      sheebaCutPercent?: number;
      maxExhibitors?: number;
      specifications?: string | null;
      applicationDeadline?: string | null;
      hasBoothNumbers?: boolean;
      hasVendorCheckin?: boolean;
    },
    isAdmin: boolean = false
  ): Promise<IExhibitorCall> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const status = data.status || 'draft';
    const sheebaCutPercent = data.sheebaCutPercent ?? 30.0;
    const maxExhibitors = data.maxExhibitors ?? 10;
    const hasBoothNumbers = !!data.hasBoothNumbers;
    const hasVendorCheckin = !!data.hasVendorCheckin;
    const applicationDeadline = data.applicationDeadline ? new Date(data.applicationDeadline) : null;

    const upsertSql = `
      INSERT INTO exhibitor_calls (
        event_id, is_enabled, status, description, total_space_sqm,
        price_per_sqm, sheeba_cut_percent, max_exhibitors,
        specifications, application_deadline, has_booth_numbers,
        has_vendor_checkin, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (event_id) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        status = EXCLUDED.status,
        description = EXCLUDED.description,
        total_space_sqm = EXCLUDED.total_space_sqm,
        price_per_sqm = EXCLUDED.price_per_sqm,
        sheeba_cut_percent = EXCLUDED.sheeba_cut_percent,
        max_exhibitors = EXCLUDED.max_exhibitors,
        specifications = EXCLUDED.specifications,
        application_deadline = EXCLUDED.application_deadline,
        has_booth_numbers = EXCLUDED.has_booth_numbers,
        has_vendor_checkin = EXCLUDED.has_vendor_checkin,
        updated_at = NOW()
      RETURNING *;
    `;

    const res = await query(upsertSql, [
      eventId,
      data.isEnabled,
      status,
      data.description || null,
      data.totalSpaceSqm,
      data.pricePerSqm,
      sheebaCutPercent,
      maxExhibitors,
      data.specifications || null,
      applicationDeadline,
      hasBoothNumbers,
      hasVendorCheckin,
    ]);

    return res.rows[0];
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
      SELECT v.*, e.title as event_title, e.event_date, e.location as event_location
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
      vendors: res.rows,
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
      spaceSqm: number;
      boothNumber?: string | null;
      source: 'manual' | 'sponsorship';
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
        space_sqm, organizer_price_per_sqm, sheeba_cut_percent,
        total_organizer_amount, total_cut_amount, total_final_amount,
        booth_number, status, payment_status, logo_url, website_url,
        paid_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        0, 0, 0, 0, 0,
        $11, 'confirmed', 'paid', $12, $13, NOW()
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
      data.spaceSqm || 1,
      data.boothNumber?.trim() || null,
      data.logoUrl || null,
      data.websiteUrl || null,
    ]);

    return res.rows[0];
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

    const vendorRes = await query('SELECT * FROM event_vendors WHERE id = $1 AND event_id = $2', [vendorId, eventId]);
    if (vendorRes.rows.length === 0) {
      const err: any = new Error('Vendor record not found.');
      err.statusCode = 404;
      throw err;
    }

    const current = vendorRes.rows[0];
    const updateSql = `
      UPDATE event_vendors SET
        business_name = COALESCE($1, business_name),
        category = COALESCE($2, category),
        contact_name = COALESCE($3, contact_name),
        contact_email = COALESCE($4, contact_email),
        contact_phone = COALESCE($5, contact_phone),
        showcase_description = COALESCE($6, showcase_description),
        space_sqm = COALESCE($7, space_sqm),
        booth_number = COALESCE($8, booth_number),
        status = COALESCE($9, status),
        rejection_reason = COALESCE($10, rejection_reason),
        logo_url = COALESCE($11, logo_url),
        website_url = COALESCE($12, website_url),
        updated_at = NOW()
      WHERE id = $13 AND event_id = $14
      RETURNING *;
    `;

    const res = await query(updateSql, [
      data.businessName?.trim() ?? null,
      data.category?.trim() ?? null,
      data.contactName?.trim() ?? null,
      data.contactEmail?.trim()?.toLowerCase() ?? null,
      data.contactPhone?.trim() ?? null,
      data.showcaseDescription ?? null,
      data.spaceSqm ?? null,
      data.boothNumber?.trim() ?? null,
      data.status ?? null,
      data.rejectionReason ?? null,
      data.logoUrl ?? null,
      data.websiteUrl ?? null,
      vendorId,
      eventId,
    ]);

    return res.rows[0];
  }

  /**
   * Organizer removes / deletes a vendor record
   */
  static async deleteVendor(organizerId: string, eventId: string, vendorId: string, isAdmin: boolean = false): Promise<void> {
    await this.verifyEventOwnership(organizerId, eventId, isAdmin);

    const res = await query('DELETE FROM event_vendors WHERE id = $1 AND event_id = $2 RETURNING id', [vendorId, eventId]);
    if (res.rows.length === 0) {
      const err: any = new Error('Vendor record not found.');
      err.statusCode = 404;
      throw err;
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
    // Check if exhibitors are enabled for this event
    const callRes = await query('SELECT is_enabled FROM exhibitor_calls WHERE event_id = $1', [eventId]);
    if (callRes.rows.length === 0 || !callRes.rows[0].is_enabled) {
      return [];
    }

    const res = await query(
      `SELECT id, business_name, category, showcase_description, space_sqm, booth_number, logo_url, website_url, source
       FROM event_vendors
       WHERE event_id = $1 AND status = 'confirmed'
       ORDER BY business_name ASC`,
      [eventId]
    );

    return res.rows.map((row) => ({
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
  }

  /**
   * Exhibitor: Explore all events with open exhibitor calls
   */
  static async exploreOpenCalls(filters?: { category?: string; search?: string }): Promise<any[]> {
    let sql = `
      SELECT 
        ec.id as exhibitor_call_id,
        ec.event_id,
        ec.status as call_status,
        ec.total_space_sqm,
        ec.price_per_sqm,
        ec.sheeba_cut_percent,
        ec.max_exhibitors,
        ec.specifications,
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
        COALESCE(SUM(v.space_sqm) FILTER (WHERE v.status = 'confirmed'), 0)::float as space_allocated,
        COUNT(v.id) FILTER (WHERE v.status = 'confirmed')::int as confirmed_vendors_count
      FROM exhibitor_calls ec
      JOIN events e ON e.id = ec.event_id
      JOIN users u ON u.id = e.organizer_id
      LEFT JOIN event_vendors v ON v.event_id = e.id
      WHERE ec.is_enabled = TRUE AND ec.status = 'open'
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
    return res.rows.map((row) => {
      const basePrice = parseFloat(row.price_per_sqm) || 0;
      const cutPercent = parseFloat(row.sheeba_cut_percent) || 30;
      const finalPricePerSqm = basePrice * (1 + cutPercent / 100);
      const totalSpace = parseFloat(row.total_space_sqm) || 0;
      const spaceAllocated = parseFloat(row.space_allocated) || 0;
      const spaceRemaining = Math.max(0, totalSpace - spaceAllocated);

      return {
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
        totalSpaceSqm: totalSpace,
        spaceAllocated,
        spaceRemaining,
        maxExhibitors: parseInt(row.max_exhibitors, 10) || 10,
        confirmedVendorsCount: parseInt(row.confirmed_vendors_count, 10) || 0,
        specifications: row.specifications,
        applicationDeadline: row.application_deadline,
        spaceDescription: row.space_description,
        finalPricePerSqm: Math.round(finalPricePerSqm),
        pricePerSqm: basePrice,
        sheebaCutPercent: cutPercent,
      };
    });
  }
}

