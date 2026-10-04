import { query } from '../config/db';
import { ISponsorshipApplication, ISponsorshipDeal, SponsorshipDealStatus, IApplicationAffiliations } from '../types';

export class SponsorshipService {
  /**
   * Create a new sponsorship application / pitch (Organizer)
   */
  static async createApplication(
    organizerId: string,
    data: {
      event_title: string;
      event_type?: string;
      category?: string;
      expected_date: string;
      location: string;
      expected_attendees: number;
      target_audience: string;
      funding_goal: number;
      currency?: string;
      description: string;
      packages?: Array<{ name: string; amount: number; perks: string }>;
      contact_name: string;
      contact_phone: string;
      contact_email: string;
      contact_telegram?: string;
      pitch_deck_url?: string;
      socials?: Record<string, string>;
      affiliations?: IApplicationAffiliations;
    }
  ): Promise<ISponsorshipApplication> {
    if (!data.event_title || !data.expected_date || !data.location) {
      const err: any = new Error('Event title, expected date, and location are required.');
      err.statusCode = 400;
      throw err;
    }

    if (!data.contact_name || !data.contact_phone || !data.contact_email) {
      const err: any = new Error('Organizer contact name, phone number, and email are required.');
      err.statusCode = 400;
      throw err;
    }

    const packagesJson = JSON.stringify(data.packages || []);
    const socialsJson = JSON.stringify(data.socials || {});
    const affiliationsJson = JSON.stringify(data.affiliations || {});

    const res = await query<ISponsorshipApplication>(
      `INSERT INTO sponsorship_applications (
        organizer_id,
        event_title,
        event_type,
        category,
        expected_date,
        location,
        expected_attendees,
        target_audience,
        funding_goal,
        currency,
        description,
        packages,
        contact_name,
        contact_phone,
        contact_email,
        contact_telegram,
        pitch_deck_url,
        socials,
        affiliations,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'OPEN')
      RETURNING *`,
      [
        organizerId,
        data.event_title.trim(),
        data.event_type || 'hackathon',
        data.category || 'Tech',
        data.expected_date.trim(),
        data.location.trim(),
        Number(data.expected_attendees) || 100,
        data.target_audience.trim(),
        Number(data.funding_goal) || 0,
        data.currency || 'ETB',
        data.description.trim(),
        packagesJson,
        data.contact_name.trim(),
        data.contact_phone.trim(),
        data.contact_email.trim().toLowerCase(),
        data.contact_telegram ? data.contact_telegram.trim() : null,
        data.pitch_deck_url ? data.pitch_deck_url.trim() : null,
        socialsJson,
        affiliationsJson,
      ]
    );

    return res.rows[0];
  }

  /**
   * Get all applications posted by a specific organizer
   */
  static async getOrganizerApplications(organizerId: string): Promise<ISponsorshipApplication[]> {
    const res = await query<ISponsorshipApplication>(
      `SELECT 
        sa.*,
        u.organization AS organizer_organization,
        u.full_name AS organizer_name,
        u.avatar_url AS organizer_avatar,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.status = 'INTERESTED'
        ), 0) AS interested_sponsors_count
      FROM sponsorship_applications sa
      JOIN users u ON sa.organizer_id = u.id
      WHERE sa.organizer_id = $1
      ORDER BY sa.created_at DESC`,
      [organizerId]
    );

    return res.rows;
  }

  /**
   * Explore open sponsorship applications (Sponsor Marketplace)
   */
  static async getAllOpenApplications(filters?: {
    category?: string;
    search?: string;
    minBudget?: number;
    maxBudget?: number;
  }): Promise<ISponsorshipApplication[]> {
    let sql = `
      SELECT 
        sa.*,
        u.organization AS organizer_organization,
        u.full_name AS organizer_name,
        u.avatar_url AS organizer_avatar,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.status = 'INTERESTED'
        ), 0) AS interested_sponsors_count
      FROM sponsorship_applications sa
      JOIN users u ON sa.organizer_id = u.id
      WHERE sa.status != 'CLOSED'
    `;

    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.category && filters.category !== 'All') {
      sql += ` AND LOWER(sa.category) = LOWER($${paramIdx++})`;
      params.push(filters.category);
    }

    if (filters?.search && filters.search.trim()) {
      sql += ` AND (LOWER(sa.event_title) LIKE $${paramIdx} OR LOWER(sa.location) LIKE $${paramIdx} OR LOWER(sa.description) LIKE $${paramIdx} OR LOWER(u.organization) LIKE $${paramIdx})`;
      params.push(`%${filters.search.trim().toLowerCase()}%`);
      paramIdx++;
    }

    if (filters?.minBudget) {
      sql += ` AND sa.funding_goal >= $${paramIdx++}`;
      params.push(Number(filters.minBudget));
    }

    if (filters?.maxBudget) {
      sql += ` AND sa.funding_goal <= $${paramIdx++}`;
      params.push(Number(filters.maxBudget));
    }

    sql += ` ORDER BY sa.created_at DESC`;

    const res = await query<ISponsorshipApplication>(sql, params);
    return res.rows;
  }

  /**
   * Get single application details with organizer track record
   */
  static async getApplicationById(id: string): Promise<ISponsorshipApplication & { organizer_events_count?: number }> {
    const res = await query<any>(
      `SELECT 
        sa.*,
        u.organization AS organizer_organization,
        u.full_name AS organizer_name,
        u.avatar_url AS organizer_avatar,
        u.email AS organizer_account_email,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM events e 
          WHERE e.organizer_id = sa.organizer_id
        ), 0) AS organizer_events_count,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.status = 'INTERESTED'
        ), 0) AS interested_sponsors_count
      FROM sponsorship_applications sa
      JOIN users u ON sa.organizer_id = u.id
      WHERE sa.id = $1`,
      [id]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Sponsorship application not found.');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  /**
   * Sponsor marks interest or declines an application
   */
  static async expressInterestOrDecline(
    sponsorId: string,
    applicationId: string,
    status: SponsorshipDealStatus,
    data?: {
      package_name?: string;
      pledged_amount?: number;
      sponsor_notes?: string;
    }
  ): Promise<ISponsorshipDeal> {
    // Check if application exists
    const appRes = await query('SELECT id FROM sponsorship_applications WHERE id = $1', [applicationId]);
    if (!appRes.rowCount || appRes.rowCount === 0) {
      const err: any = new Error('Application does not exist.');
      err.statusCode = 404;
      throw err;
    }

    const res = await query<ISponsorshipDeal>(
      `INSERT INTO sponsorship_deals (
        application_id,
        sponsor_id,
        status,
        package_name,
        pledged_amount,
        sponsor_notes,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (application_id, sponsor_id) DO UPDATE SET
        status = EXCLUDED.status,
        package_name = COALESCE(EXCLUDED.package_name, sponsorship_deals.package_name),
        pledged_amount = COALESCE(EXCLUDED.pledged_amount, sponsorship_deals.pledged_amount),
        sponsor_notes = COALESCE(EXCLUDED.sponsor_notes, sponsorship_deals.sponsor_notes),
        updated_at = NOW()
      RETURNING *`,
      [
        applicationId,
        sponsorId,
        status,
        data?.package_name || null,
        data?.pledged_amount ? Number(data.pledged_amount) : null,
        data?.sponsor_notes || null,
      ]
    );

    return res.rows[0];
  }

  /**
   * Get all deals saved by a sponsor (Deals & Pledges tab)
   */
  static async getSponsorDeals(
    sponsorId: string,
    statusFilter?: SponsorshipDealStatus
  ): Promise<any[]> {
    let sql = `
      SELECT 
        sd.*,
        sa.event_title,
        sa.event_type,
        sa.category,
        sa.expected_date,
        sa.location,
        sa.expected_attendees,
        sa.target_audience,
        sa.funding_goal,
        sa.currency,
        sa.description AS application_description,
        sa.packages,
        sa.contact_name,
        sa.contact_phone,
        sa.contact_email,
        sa.contact_telegram,
        sa.pitch_deck_url,
        sa.socials,
        sa.affiliations,
        sa.status AS application_status,
        u.organization AS organizer_organization,
        u.full_name AS organizer_name,
        u.avatar_url AS organizer_avatar
      FROM sponsorship_deals sd
      JOIN sponsorship_applications sa ON sd.application_id = sa.id
      LEFT JOIN users u ON sa.organizer_id = u.id
      WHERE sd.sponsor_id = $1
    `;

    const params: any[] = [sponsorId];

    if (statusFilter && (statusFilter === 'INTERESTED' || statusFilter === 'DECLINED')) {
      sql += ` AND sd.status = $2`;
      params.push(statusFilter);
    }

    sql += ` ORDER BY sd.updated_at DESC`;

    const res = await query(sql, params);
    return res.rows.map((row: any) => ({
      id: row.id,
      application_id: row.application_id,
      sponsor_id: row.sponsor_id,
      status: row.status,
      package_name: row.package_name,
      pledged_amount: row.pledged_amount ? Number(row.pledged_amount) : null,
      sponsor_notes: row.sponsor_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      application: {
        id: row.application_id,
        event_title: row.event_title,
        event_type: row.event_type,
        category: row.category,
        expected_date: row.expected_date,
        location: row.location,
        expected_attendees: row.expected_attendees ? Number(row.expected_attendees) : 0,
        target_audience: row.target_audience,
        funding_goal: row.funding_goal ? Number(row.funding_goal) : 0,
        currency: row.currency,
        description: row.application_description,
        packages: row.packages,
        contact_name: row.contact_name,
        contact_phone: row.contact_phone,
        contact_email: row.contact_email,
        contact_telegram: row.contact_telegram,
        pitch_deck_url: row.pitch_deck_url,
        socials: row.socials,
        affiliations: row.affiliations,
        status: row.application_status,
        organizer_organization: row.organizer_organization,
        organizer_name: row.organizer_name,
        organizer_avatar: row.organizer_avatar,
      },
    }));
  }

  /**
   * Update deal status directly (e.g. mark as DECLINED or back to INTERESTED)
   */
  static async updateDealStatus(
    dealId: string,
    sponsorId: string,
    status: SponsorshipDealStatus,
    notes?: string
  ): Promise<ISponsorshipDeal> {
    const res = await query<ISponsorshipDeal>(
      `UPDATE sponsorship_deals 
       SET status = $1, sponsor_notes = COALESCE($2, sponsor_notes), updated_at = NOW()
       WHERE id = $3 AND sponsor_id = $4
       RETURNING *`,
      [status, notes || null, dealId, sponsorId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Deal not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  /**
   * Delete or close an application (Organizer)
   */
  static async deleteApplication(applicationId: string, organizerId: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM sponsorship_applications WHERE id = $1 AND organizer_id = $2`,
      [applicationId, organizerId]
    );

    return Boolean(res.rowCount && res.rowCount > 0);
  }
}
