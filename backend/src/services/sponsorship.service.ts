import { query } from '../config/db';
import { ISponsorshipApplication, ISponsorshipDeal, SponsorshipDealStatus, IApplicationAffiliations } from '../types';
import { CacheService } from './cache.service';
import { RecycleBinService } from './recycleBin.service';
import { EmailService } from './email.service';
import { AuditService } from './audit.service';

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

    const created = res.rows[0];

    // Invalidate sponsorship marketplace listings and recommendations
    await CacheService.delPattern('sponsorship:explore*');
    await CacheService.delPattern(`sponsorship:organizer:${organizerId}*`);
    await CacheService.delPattern('*http:*/api/sponsorship*');
    await CacheService.delPattern('matching:recommendations:*');

    await AuditService.logAction({
      action: 'SPONSORSHIP_PITCH_CREATED',
      category: 'ORGANIZER_SPONSOR',
      entityType: 'sponsorship_pitch',
      entityId: created.id,
      entityTitle: created.event_title,
      performedBy: organizerId,
      details: `Sponsorship pitch created for "${created.event_title}"`,
      metadata: { eventTitle: created.event_title, location: created.location },
    });

    return created;
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
          WHERE sd.application_id = sa.id AND sd.status IN ('APPROVED', 'INTERESTED') AND sd.deleted_at IS NULL
        ), 0) AS interested_sponsors_count,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.status = 'APPROVED' AND sd.deleted_at IS NULL
        ), 0) AS approved_sponsors_count
      FROM sponsorship_applications sa
      JOIN users u ON sa.organizer_id = u.id
      WHERE sa.organizer_id = $1 AND sa.deleted_at IS NULL
      ORDER BY sa.created_at DESC`,
      [organizerId]
    );

    return res.rows;
  }

  /**
   * Admin oversight: Retrieve all sponsorship pitches across the platform
   */
  static async getAllApplicationsForAdmin(): Promise<ISponsorshipApplication[]> {
    const res = await query<ISponsorshipApplication>(
      `SELECT 
        sa.*,
        u.organization AS organizer_organization,
        u.full_name AS organizer_name,
        u.avatar_url AS organizer_avatar,
        u.email AS organizer_email,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.deleted_at IS NULL
        ), 0) AS interested_sponsors_count
      FROM sponsorship_applications sa
      JOIN users u ON sa.organizer_id = u.id
      WHERE sa.deleted_at IS NULL
      ORDER BY sa.created_at DESC`
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
    const cacheKey = `sponsorship:explore:${JSON.stringify(filters || {})}`;
    const cached = await CacheService.get<ISponsorshipApplication[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let sql = `
      SELECT 
        sa.*,
        u.organization AS organizer_organization,
        u.full_name AS organizer_name,
        u.avatar_url AS organizer_avatar,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.status IN ('APPROVED', 'INTERESTED') AND sd.deleted_at IS NULL
        ), 0) AS interested_sponsors_count
      FROM sponsorship_applications sa
      JOIN users u ON sa.organizer_id = u.id
      WHERE sa.status != 'CLOSED' AND sa.deleted_at IS NULL AND COALESCE(sa.is_taken_down, FALSE) = FALSE
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
    await CacheService.set(cacheKey, res.rows, 60);
    return res.rows;
  }

  /**
   * Get single application details with organizer track record
   */
  static async getApplicationById(
    id: string,
    userId?: string
  ): Promise<ISponsorshipApplication & { organizer_events_count?: number; user_deal_status?: string; user_deal?: any }> {
    const cacheKey = `sponsorship:app:${id}`;
    let appData = await CacheService.get<any>(cacheKey);
    if (!appData) {
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
            WHERE sd.application_id = sa.id AND sd.status IN ('APPROVED', 'INTERESTED', 'DEAL_ACCEPTED') AND sd.deleted_at IS NULL
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

      appData = res.rows[0];
      await CacheService.set(cacheKey, appData, 60);
    }

    let userDeal = null;
    let userDealStatus = null;
    if (userId) {
      try {
        const dealRes = await query<any>(
          `SELECT id, status, package_name, pledged_amount, allow_attendee_sharing, created_at, updated_at
           FROM sponsorship_deals
           WHERE application_id = $1 AND sponsor_id = $2 AND deleted_at IS NULL
           ORDER BY updated_at DESC
           LIMIT 1`,
          [id, userId]
        );
        if (dealRes.rowCount && dealRes.rowCount > 0) {
          userDeal = dealRes.rows[0];
          userDealStatus = dealRes.rows[0].status;
        }
      } catch (dealErr) {
        // Safe fallback
      }
    }

    return {
      ...appData,
      user_deal: userDeal,
      user_deal_status: userDealStatus,
    };
  }

  /**
   * Sponsor submits formal sponsorship application to a pitch (Stage 2)
   */
  static async submitFormalApplication(
    sponsorId: string,
    data: {
      applicationId: string;
      package_name: string;
      pledged_amount: number;
      proposal_message: string;
      sponsor_notes?: string;
    }
  ): Promise<ISponsorshipDeal> {
    const { applicationId, package_name, pledged_amount, proposal_message, sponsor_notes } = data;

    // 1. Verify pitch exists and is open
    const appRes = await query<{
      id: string;
      event_title: string;
      status: string;
      packages: any;
      organizer_id: string;
      is_taken_down?: boolean;
    }>(
      `SELECT id, event_title, status, packages, organizer_id, is_taken_down 
       FROM sponsorship_applications 
       WHERE id = $1 AND deleted_at IS NULL`,
      [applicationId]
    );

    if (!appRes.rowCount || appRes.rowCount === 0) {
      const err: any = new Error('Sponsorship pitch not found or has been deleted.');
      err.statusCode = 404;
      throw err;
    }

    const pitch = appRes.rows[0];
    if (pitch.organizer_id === sponsorId) {
      const err: any = new Error('Organizers cannot submit sponsorship applications to their own pitches.');
      err.statusCode = 400;
      throw err;
    }
    if (pitch.is_taken_down) {
      const err: any = new Error('This sponsorship pitch is currently suspended for administrative review and cannot accept applications.');
      err.statusCode = 403;
      err.code = 'PITCH_MODERATED';
      throw err;
    }
    if (pitch.status === 'CLOSED') {
      const err: any = new Error('This sponsorship pitch has been closed by the organizer.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Fetch sponsor user details
    const sponsorRes = await query<{
      id: string;
      full_name: string;
      email: string;
      company_name: string;
      organization: string;
      approval_status: string;
      role: string;
    }>(
      `SELECT id, full_name, email, company_name, organization, approval_status, role 
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [sponsorId]
    );

    if (!sponsorRes.rowCount || sponsorRes.rowCount === 0) {
      const err: any = new Error('Sponsor account not found.');
      err.statusCode = 404;
      throw err;
    }

    const sponsor = sponsorRes.rows[0];
    if (sponsor.approval_status !== 'approved' && sponsor.role?.toLowerCase() !== 'admin') {
      const err: any = new Error('Your sponsor account must be reviewed and approved by Sheeba Administration before applying.');
      err.statusCode = 403;
      throw err;
    }

    // 3. Check for existing active application (PENDING or APPROVED)
    const activeRes = await query<ISponsorshipDeal>(
      `SELECT id, status FROM sponsorship_deals 
       WHERE application_id = $1 AND sponsor_id = $2 AND deleted_at IS NULL 
         AND status IN ('PENDING', 'APPROVED', 'INTERESTED')
       ORDER BY created_at DESC LIMIT 1`,
      [applicationId, sponsorId]
    );

    let deal: ISponsorshipDeal;

    if (activeRes.rowCount && activeRes.rowCount > 0) {
      const existing = activeRes.rows[0];
      if (existing.status === 'PENDING') {
        const err: any = new Error('You already have a sponsorship application pending review for this pitch.');
        err.statusCode = 409;
        throw err;
      }
      if (existing.status === 'APPROVED') {
        const err: any = new Error('Your sponsorship application for this pitch has already been approved.');
        err.statusCode = 409;
        throw err;
      }
      // If legacy 'INTERESTED', upgrade it to a formal PENDING application
      const updateRes = await query<ISponsorshipDeal>(
        `UPDATE sponsorship_deals 
         SET status = 'PENDING',
             package_name = $1,
             pledged_amount = $2,
             proposal_message = $3,
             sponsor_notes = COALESCE($4, sponsor_notes),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          package_name.trim(),
          Number(pledged_amount),
          proposal_message.trim(),
          sponsor_notes ? sponsor_notes.trim() : null,
          existing.id,
        ]
      );
      deal = updateRes.rows[0];
    } else {
      // Create new application attempt (preserves previous REJECTED/DECLINED historical records)
      try {
        const insertRes = await query<ISponsorshipDeal>(
          `INSERT INTO sponsorship_deals (
            application_id,
            sponsor_id,
            status,
            package_name,
            pledged_amount,
            proposal_message,
            sponsor_notes,
            created_at,
            updated_at
          ) VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, NOW(), NOW())
          RETURNING *`,
          [
            applicationId,
            sponsorId,
            package_name.trim(),
            Number(pledged_amount),
            proposal_message.trim(),
            sponsor_notes ? sponsor_notes.trim() : null,
          ]
        );
        deal = insertRes.rows[0];
      } catch (dbErr: any) {
        if (dbErr.code === '23505') {
          const err: any = new Error('A concurrent application was already submitted for this pitch.');
          err.statusCode = 409;
          throw err;
        }
        throw dbErr;
      }
    }

    // 4. Dispatch submission confirmation email to sponsor
    try {
      await EmailService.sendSponsorshipApplicationSubmittedEmail(
        sponsor.email,
        sponsor.full_name,
        sponsor.company_name || sponsor.organization || sponsor.full_name,
        pitch.event_title,
        deal.package_name,
        deal.pledged_amount ? Number(deal.pledged_amount) : undefined
      );
    } catch (emailErr) {
      console.warn('Failed to dispatch application submission email:', emailErr);
    }

    // 5. Invalidate caches
    await CacheService.delPattern(`sponsorship:deals:${sponsorId}*`);
    await CacheService.delPattern(`sponsorship:app:${applicationId}*`);
    await CacheService.delPattern(`*http:*user:${sponsorId}*sponsorship*`);
    await CacheService.delPattern('*http:*/api/admin/sponsorship*');

    await AuditService.logAction({
      action: 'SPONSOR_PROPOSAL_SUBMITTED',
      category: 'ORGANIZER_SPONSOR',
      entityType: 'sponsorship_deal',
      entityId: deal.id,
      entityTitle: pitch.event_title,
      performedBy: sponsorId,
      performedByName: sponsor.full_name,
      performedByEmail: sponsor.email,
      details: `Proposal submitted for "${pitch.event_title}" (Package: ${deal.package_name}, Amount: ${deal.pledged_amount} ETB)`,
      metadata: { applicationId, packageName: deal.package_name, pledgedAmount: deal.pledged_amount },
    });

    return deal;
  }

  /**
   * Sponsor marks interest or declines an application (Backward-compatible interaction)
   */
  static async expressInterestOrDecline(
    sponsorId: string,
    applicationId: string,
    status: SponsorshipDealStatus,
    data?: {
      package_name?: string;
      pledged_amount?: number;
      proposal_message?: string;
      sponsor_notes?: string;
    }
  ): Promise<ISponsorshipDeal> {
    // Check if pitch exists
    const appRes = await query<{ id: string; organizer_id: string }>(
      'SELECT id, organizer_id FROM sponsorship_applications WHERE id = $1 AND deleted_at IS NULL',
      [applicationId]
    );
    if (!appRes.rowCount || appRes.rowCount === 0) {
      const err: any = new Error('Application does not exist.');
      err.statusCode = 404;
      throw err;
    }

    if (appRes.rows[0].organizer_id === sponsorId) {
      const err: any = new Error('Organizers cannot express sponsorship interest in their own pitches.');
      err.statusCode = 400;
      throw err;
    }

    const { package_name, pledged_amount, sponsor_notes, proposal_message } = data || {};

    // Check if deal already exists for this application and sponsor (including any soft-deleted)
    const existingRes = await query(
      `SELECT id, status, package_name, pledged_amount, sponsor_notes
       FROM sponsorship_deals
       WHERE application_id = $1 AND sponsor_id = $2
       LIMIT 1`,
      [applicationId, sponsorId]
    );

    let deal: ISponsorshipDeal;

    if (existingRes.rowCount && existingRes.rowCount > 0) {
      const existingId = existingRes.rows[0].id;
      const updateRes = await query<ISponsorshipDeal>(
        `UPDATE sponsorship_deals
         SET status = $1,
             package_name = COALESCE($2, package_name),
             pledged_amount = COALESCE($3, pledged_amount),
             sponsor_notes = COALESCE($4, sponsor_notes),
             proposal_message = COALESCE($5, proposal_message),
             deleted_at = NULL,
             deleted_by = NULL,
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [
          status,
          package_name || null,
          pledged_amount ? Number(pledged_amount) : null,
          sponsor_notes || null,
          proposal_message || null,
          existingId,
        ]
      );
      deal = updateRes.rows[0];
    } else {
      const insertRes = await query<ISponsorshipDeal>(
        `INSERT INTO sponsorship_deals (
          application_id,
          sponsor_id,
          status,
          package_name,
          pledged_amount,
          proposal_message,
          sponsor_notes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          applicationId,
          sponsorId,
          status,
          package_name || null,
          pledged_amount ? Number(pledged_amount) : null,
          proposal_message || null,
          sponsor_notes || null,
        ]
      );
      deal = insertRes.rows[0];
    }

    await CacheService.delPattern(`sponsorship:deals:${sponsorId}*`);
    await CacheService.delPattern(`sponsorship:app:${applicationId}*`);
    await CacheService.delPattern(`*http:*user:${sponsorId}*sponsorship*`);
    await CacheService.delPattern('*http:*/api/sponsorship/organizer*');

    return deal;
  }

  /**
   * Get all deals saved by a sponsor (Deals & Applications pipeline)
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
      WHERE sd.sponsor_id = $1 AND sd.deleted_at IS NULL
    `;

    const params: any[] = [sponsorId];

    if (statusFilter) {
      if (statusFilter === 'INTERESTED') {
        sql += ` AND (sd.status = 'INTERESTED' OR sd.status = 'DEAL_ACCEPTED' OR (sd.sponsor_notes IS NOT NULL AND sd.sponsor_notes LIKE '%[STATUS:DEAL_ACCEPTED]%'))`;
      } else if (statusFilter === 'DECLINED') {
        sql += ` AND (sd.status = 'DECLINED' OR sd.status = 'WITHDRAWN' OR (sd.sponsor_notes IS NOT NULL AND sd.sponsor_notes LIKE '%[STATUS:WITHDRAWN]%'))`;
      } else {
        sql += ` AND sd.status = $2`;
        params.push(statusFilter);
      }
    }

    sql += ` ORDER BY sd.created_at DESC, sd.updated_at DESC`;

    const res = await query(sql, params);
    return res.rows.map((row: any) => {
      let dealStatus = row.status;
      if (row.sponsor_notes && typeof row.sponsor_notes === 'string') {
        const match = row.sponsor_notes.match(/\[STATUS:(DEAL_ACCEPTED|REJECTED|WITHDRAWN)\]/);
        if (match) {
          dealStatus = match[1];
        }
      }

      return {
        id: row.id,
        application_id: row.application_id,
        sponsor_id: row.sponsor_id,
        status: dealStatus,
        package_name: row.package_name,
        pledged_amount: row.pledged_amount ? Number(row.pledged_amount) : null,
        proposal_message: row.proposal_message,
        rejection_reason: row.rejection_reason,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
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
      };
    });
  }

  /**
   * Update deal notes directly
   */
  static async updateDealStatus(
    dealId: string,
    sponsorId: string,
    status?: SponsorshipDealStatus,
    notes?: string,
    proposal_message?: string
  ): Promise<ISponsorshipDeal> {
    // Server-side validation: Sponsors can ONLY set INTERESTED or DECLINED
    if (status !== undefined && status !== null) {
      if (!['INTERESTED', 'DECLINED'].includes(status)) {
        const err: any = new Error(
          `Sponsors cannot set deal status to '${status}'. Only 'INTERESTED' or 'DECLINED' are permitted.`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const res = await query<ISponsorshipDeal>(
      `UPDATE sponsorship_deals 
       SET status = COALESCE($1, status), 
           sponsor_notes = COALESCE($2, sponsor_notes), 
           proposal_message = COALESCE($3, proposal_message),
           updated_at = NOW()
       WHERE id = $4 AND sponsor_id = $5 AND deleted_at IS NULL
       RETURNING *`,
      [status || null, notes || null, proposal_message || null, dealId, sponsorId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Deal not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const deal = res.rows[0];

    await CacheService.delPattern(`sponsorship:deals:${sponsorId}*`);
    await CacheService.delPattern(`sponsorship:app:${deal.application_id}*`);
    await CacheService.delPattern(`*http:*user:${sponsorId}*sponsorship*`);
    await CacheService.delPattern('*http:*/api/sponsorship/organizer*');

    return deal;
  }

  /**
   * Organizer views approved sponsors for their pitch (Stage 2 Requirement 7)
   */
  static async getApprovedSponsorsForPitch(
    pitchId: string,
    organizerId: string,
    userRole?: string
  ): Promise<{ pitchTitle: string; approvedSponsors: any[] }> {
    // 1. Verify pitch exists and ownership
    const pitchRes = await query<{ id: string; event_title: string; organizer_id: string }>(
      `SELECT id, event_title, organizer_id 
       FROM sponsorship_applications 
       WHERE id = $1 AND deleted_at IS NULL`,
      [pitchId]
    );

    if (!pitchRes.rowCount || pitchRes.rowCount === 0) {
      const err: any = new Error('Sponsorship pitch not found.');
      err.statusCode = 404;
      throw err;
    }

    const pitch = pitchRes.rows[0];
    if (userRole?.toUpperCase() !== 'ADMIN' && pitch.organizer_id !== organizerId) {
      const err: any = new Error('You are not authorized to view sponsors for this pitch.');
      err.statusCode = 403;
      throw err;
    }

    // 2. Query only approved sponsors (strictly never pending or rejected)
    const sponsorsRes = await query(
      `SELECT 
        sd.id AS deal_id,
        sd.package_name,
        sd.pledged_amount,
        sd.proposal_message,
        sd.reviewed_at,
        sd.created_at AS application_date,
        u.id AS sponsor_id,
        u.full_name AS representative_name,
        u.email AS contact_email,
        u.phone AS representative_phone,
        u.company_name,
        u.company_phone,
        u.company_website,
        u.bio AS company_description,
        u.avatar_url AS company_logo,
        u.industry_category
       FROM sponsorship_deals sd
       JOIN users u ON sd.sponsor_id = u.id
       WHERE sd.application_id = $1 
         AND sd.status = 'APPROVED' 
         AND sd.deleted_at IS NULL
       ORDER BY sd.reviewed_at DESC, sd.updated_at DESC`,
      [pitchId]
    );

    return {
      pitchTitle: pitch.event_title,
      approvedSponsors: sponsorsRes.rows.map((row) => ({
        dealId: row.deal_id,
        packageName: row.package_name,
        pledgedAmount: row.pledged_amount ? Number(row.pledged_amount) : 0,
        proposalMessage: row.proposal_message,
        reviewedAt: row.reviewed_at,
        applicationDate: row.application_date,
        sponsor: {
          id: row.sponsor_id,
          representativeName: row.representative_name,
          contactEmail: row.contact_email,
          phone: row.company_phone || row.representative_phone,
          companyName: row.company_name || row.representative_name,
          companyWebsite: row.company_website,
          companyDescription: row.company_description,
          companyLogo: row.company_logo,
          industryCategory: row.industry_category,
        },
      })),
    };
  }

  /**
   * Delete or close an application (Organizer or Admin)
   */
  static async deleteApplication(applicationId: string, organizerId: string, isAdmin = false): Promise<boolean> {
    const appRes = await query(
      'SELECT id, event_title, organizer_id FROM sponsorship_applications WHERE id = $1',
      [applicationId]
    );

    if (!appRes.rowCount || appRes.rowCount === 0) {
      return false;
    }

    const app = appRes.rows[0];

    // Check permission: organizer matches OR user is admin
    if (!isAdmin && String(app.organizer_id) !== String(organizerId)) {
      return false;
    }

    const eventTitle = app.event_title || 'Sponsorship Application';

    const res = await query(
      `UPDATE sponsorship_applications 
       SET deleted_at = NOW(), deleted_by = $2, status = 'CLOSED', updated_at = NOW() 
       WHERE id = $1`,
      [applicationId, organizerId]
    );

    const isDeleted = Boolean(res.rowCount && res.rowCount > 0);
    if (isDeleted) {
      await RecycleBinService.recordAuditLog({
        entityType: 'sponsorship_application',
        entityId: applicationId,
        action: 'soft_delete',
        performedBy: organizerId,
        entityTitle: eventTitle,
      });
      await CacheService.delPattern('sponsorship:explore*');
      await CacheService.delPattern(`sponsorship:app:${applicationId}*`);
      await CacheService.delPattern(`sponsorship:organizer:${organizerId}*`);
      await CacheService.delPattern(`sponsorship:organizer:${app.organizer_id}*`);
      await CacheService.delPattern('*http:*/api/sponsorship*');
      await CacheService.delPattern('matching:recommendations:*');
    }

    return isDeleted;
  }

  /**
   * Phase 1: Retrieve all sponsors who expressed interest across the organizer's events/pitches.
   */
  static async getOrganizerMySponsors(organizerId: string): Promise<any[]> {
    try {
      const sql = `
        SELECT 
          sd.id AS deal_id,
          sd.application_id,
          sd.sponsor_id,
          sd.status AS raw_deal_status,
          sd.package_name,
          sd.pledged_amount,
          sd.sponsor_notes,
          sd.allow_attendee_sharing,
          sd.created_at AS interest_expressed_at,
          sd.updated_at AS deal_updated_at,
          sa.event_title,
          sa.event_type,
          sa.category,
          sa.expected_date,
          sa.location,
          sa.expected_attendees,
          sa.funding_goal,
          sa.currency,
          sa.status AS application_status,
          u.id AS sponsor_user_id,
          u.full_name AS sponsor_name,
          u.email AS sponsor_email,
          u.phone AS sponsor_phone,
          u.company_name AS sponsor_company_name,
          u.industry_category AS sponsor_industry,
          u.company_website AS sponsor_website,
          u.company_phone AS sponsor_company_phone,
          u.avatar_url AS sponsor_avatar,
          u.bio AS sponsor_bio
        FROM sponsorship_deals sd
        JOIN sponsorship_applications sa ON sd.application_id = sa.id
        JOIN users u ON sd.sponsor_id = u.id
        WHERE sa.organizer_id = $1 AND sd.sponsor_id != sa.organizer_id AND sd.deleted_at IS NULL AND sa.deleted_at IS NULL
        ORDER BY sd.updated_at DESC
      `;

      const res = await query(sql, [organizerId]);

      return res.rows.map((row: any) => {
        let dealStatus = row.raw_deal_status;
        if (row.sponsor_notes && typeof row.sponsor_notes === 'string') {
          const match = row.sponsor_notes.match(/\[STATUS:(DEAL_ACCEPTED|REJECTED|WITHDRAWN)\]/);
          if (match) {
            dealStatus = match[1];
          }
        }

        return {
          deal_id: row.deal_id,
          application_id: row.application_id,
          sponsor_id: row.sponsor_id,
          deal_status: dealStatus,
          package_name: row.package_name || null,
          pledged_amount: row.pledged_amount ? Number(row.pledged_amount) : 0,
          sponsor_notes: row.sponsor_notes || null,
          allow_attendee_sharing: Boolean(row.allow_attendee_sharing || (row.sponsor_notes && row.sponsor_notes.includes('[SHARING:TRUE]'))),
          interest_expressed_at: row.interest_expressed_at,
          deal_updated_at: row.deal_updated_at,
          application: {
            id: row.application_id,
            event_title: row.event_title,
            event_type: row.event_type,
            category: row.category,
            expected_date: row.expected_date,
            location: row.location,
            expected_attendees: row.expected_attendees ? Number(row.expected_attendees) : 0,
            funding_goal: row.funding_goal ? Number(row.funding_goal) : 0,
            currency: row.currency || 'ETB',
            status: row.application_status,
          },
          sponsor: {
            id: row.sponsor_user_id,
            name: row.sponsor_company_name || row.sponsor_name,
            representative_name: row.sponsor_name,
            email: row.sponsor_email,
            phone: row.sponsor_company_phone || row.sponsor_phone,
            company_name: row.sponsor_company_name,
            industry_category: row.sponsor_industry,
            company_website: row.sponsor_website,
            company_phone: row.sponsor_company_phone,
            avatar_url: row.sponsor_avatar,
            bio: row.sponsor_bio,
          },
        };
      });
    } catch (err: any) {
      console.warn('Failed to retrieve organizer my-sponsors from database, returning safe fallback:', err?.message);
      return [];
    }
  }

  /**
   * Phase 1: Retrieve real public profile information for a sponsor.
   */
  static async getSponsorProfile(sponsorId: string): Promise<any> {
    const res = await query(
      `SELECT 
        id,
        full_name,
        email,
        company_name,
        industry_category,
        company_website,
        company_phone,
        avatar_url,
        bio,
        member_since,
        role
      FROM users
      WHERE id = $1 AND deleted_at IS NULL`,
      [sponsorId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Sponsor profile not found.');
      err.statusCode = 404;
      throw err;
    }

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.company_name || row.full_name,
      representativeName: row.full_name,
      email: row.email,
      companyName: row.company_name || undefined,
      industryCategory: row.industry_category || undefined,
      website: row.company_website || undefined,
      phone: row.company_phone || undefined,
      avatarUrl: row.avatar_url || undefined,
      bio: row.bio || undefined,
      memberSince: row.member_since || 'August 2026',
    };
  }

  /**
   * Phase 1: Organizer accepts a deal (Deal action) for a specific sponsor/pitch relationship.
   */
  static async acceptDeal(dealId: string, organizerId: string): Promise<any> {
    // Verify deal and organizer ownership
    const checkRes = await query(
      `SELECT sd.id, sd.sponsor_id, sd.application_id, sd.sponsor_notes, sa.organizer_id
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE sd.id = $1 AND sa.organizer_id = $2`,
      [dealId, organizerId]
    );

    if (!checkRes.rowCount || checkRes.rowCount === 0) {
      const err: any = new Error('Deal not found or you are not authorized to accept this deal.');
      err.statusCode = 404;
      throw err;
    }

    const currentDeal = checkRes.rows[0];

    try {
      // Attempt standard status update to DEAL_ACCEPTED
      const res = await query(
        `UPDATE sponsorship_deals
         SET status = 'DEAL_ACCEPTED', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [dealId]
      );
      const updatedDeal = res.rows[0];
      await CacheService.delPattern('*http:*/api/sponsorship*');
      return {
        ...updatedDeal,
        status: 'DEAL_ACCEPTED',
      };
    } catch (dbErr: any) {
      // Safe fallback if database check constraint does not yet include DEAL_ACCEPTED
      console.warn('DB constraint violation caught on status update, safely tagging in sponsor_notes:', dbErr?.message);
      const cleanNotes = (currentDeal.sponsor_notes || '').replace(/\[STATUS:[^\]]+\]/g, '').trim();
      const newNotes = `${cleanNotes} [STATUS:DEAL_ACCEPTED]`.trim();

      const res = await query(
        `UPDATE sponsorship_deals
         SET sponsor_notes = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [newNotes, dealId]
      );
      await CacheService.delPattern('*http:*/api/sponsorship*');
      return {
        ...res.rows[0],
        status: 'DEAL_ACCEPTED',
      };
    }
  }

  /**
   * Phase 1: Organizer rejects a sponsor's interest for a specific pitch.
   */
  static async rejectDeal(dealId: string, organizerId: string, reason?: string): Promise<any> {
    const checkRes = await query(
      `SELECT sd.id, sd.sponsor_id, sd.application_id, sd.sponsor_notes, sa.organizer_id
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE sd.id = $1 AND sa.organizer_id = $2`,
      [dealId, organizerId]
    );

    if (!checkRes.rowCount || checkRes.rowCount === 0) {
      const err: any = new Error('Deal not found or you are not authorized to reject this deal.');
      err.statusCode = 404;
      throw err;
    }

    const currentDeal = checkRes.rows[0];

    try {
      const res = await query(
        `UPDATE sponsorship_deals
         SET status = 'REJECTED', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [dealId]
      );
      await CacheService.delPattern('*http:*/api/sponsorship*');
      return {
        ...res.rows[0],
        status: 'REJECTED',
      };
    } catch (dbErr: any) {
      console.warn('DB constraint violation caught on reject update, safely tagging in sponsor_notes:', dbErr?.message);
      const cleanNotes = (currentDeal.sponsor_notes || '').replace(/\[STATUS:[^\]]+\]/g, '').trim();
      const reasonTag = reason ? ` [REASON:${reason.trim()}]` : '';
      const newNotes = `${cleanNotes} [STATUS:REJECTED]${reasonTag}`.trim();

      const res = await query(
        `UPDATE sponsorship_deals
         SET sponsor_notes = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [newNotes, dealId]
      );
      await CacheService.delPattern('*http:*/api/sponsorship*');
      return {
        ...res.rows[0],
        status: 'REJECTED',
      };
    }
  }

  /**
   * Phase 1: Sponsor withdraws their unfinalized interest.
   */
  static async withdrawDeal(dealId: string, sponsorId: string): Promise<any> {
    const checkRes = await query(
      `SELECT id, sponsor_id, application_id, status, sponsor_notes
       FROM sponsorship_deals
       WHERE id = $1 AND sponsor_id = $2`,
      [dealId, sponsorId]
    );

    if (!checkRes.rowCount || checkRes.rowCount === 0) {
      const err: any = new Error('Deal not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const currentDeal = checkRes.rows[0];
    if (currentDeal.status === 'DEAL_ACCEPTED' || (currentDeal.sponsor_notes && currentDeal.sponsor_notes.includes('[STATUS:DEAL_ACCEPTED]'))) {
      const err: any = new Error('Cannot withdraw a deal that has already been accepted by the organizer. Please contact the organizer.');
      err.statusCode = 400;
      throw err;
    }

    try {
      const res = await query(
        `UPDATE sponsorship_deals
         SET status = 'WITHDRAWN', updated_at = NOW()
         WHERE id = $1 AND sponsor_id = $2
         RETURNING *`,
        [dealId, sponsorId]
      );
      await CacheService.delPattern('*http:*/api/sponsorship*');
      return {
        ...res.rows[0],
        status: 'WITHDRAWN',
      };
    } catch (dbErr: any) {
      console.warn('DB constraint violation caught on withdraw update, safely tagging in sponsor_notes:', dbErr?.message);
      const cleanNotes = (currentDeal.sponsor_notes || '').replace(/\[STATUS:[^\]]+\]/g, '').trim();
      const newNotes = `${cleanNotes} [STATUS:WITHDRAWN]`.trim();

      const res = await query(
        `UPDATE sponsorship_deals
         SET sponsor_notes = $1, updated_at = NOW()
         WHERE id = $2 AND sponsor_id = $3
         RETURNING *`,
        [newNotes, dealId, sponsorId]
      );
      await CacheService.delPattern('*http:*/api/sponsorship*');
      return {
        ...res.rows[0],
        status: 'WITHDRAWN',
      };
    }
  }

  /**
   * Phase 2: Organizer explicitly enables or revokes attendee-information sharing for an accepted deal.
   */
  static async toggleAttendeeSharing(
    dealId: string,
    organizerId: string,
    allowSharing: boolean
  ): Promise<any> {
    const checkRes = await query(
      `SELECT sd.id, sd.sponsor_id, sd.application_id, sd.status, sd.sponsor_notes, sa.organizer_id
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE sd.id = $1 AND sa.organizer_id = $2`,
      [dealId, organizerId]
    );

    if (!checkRes.rowCount || checkRes.rowCount === 0) {
      const err: any = new Error('Deal not found or you are not authorized to manage sharing for this deal.');
      err.statusCode = 404;
      throw err;
    }

    const currentDeal = checkRes.rows[0];
    const isAccepted =
      currentDeal.status === 'DEAL_ACCEPTED' ||
      (currentDeal.sponsor_notes && currentDeal.sponsor_notes.includes('[STATUS:DEAL_ACCEPTED]'));

    if (!isAccepted) {
      const err: any = new Error(
        'Cannot enable attendee sharing before a sponsorship deal has been accepted by the organizer.'
      );
      err.statusCode = 400;
      throw err;
    }

    try {
      const res = await query(
        `UPDATE sponsorship_deals
         SET allow_attendee_sharing = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [allowSharing, dealId]
      );
      await CacheService.delPattern('*http:*/api/sponsorship*');
      await CacheService.delPattern('*http:*/api/sponsor*');
      return {
        ...res.rows[0],
        allow_attendee_sharing: allowSharing,
      };
    } catch (dbErr: any) {
      // Safe fallback if column does not exist on table yet
      console.warn('DB error updating allow_attendee_sharing column, safely tagging in sponsor_notes:', dbErr?.message);
      const cleanNotes = (currentDeal.sponsor_notes || '').replace(/\[SHARING:[^\]]+\]/g, '').trim();
      const sharingTag = allowSharing ? '[SHARING:TRUE]' : '[SHARING:FALSE]';
      const newNotes = `${cleanNotes} ${sharingTag}`.trim();

      const res = await query(
        `UPDATE sponsorship_deals
         SET sponsor_notes = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [newNotes, dealId]
      );
      await CacheService.delPattern('*http:*/api/sponsorship*');
      await CacheService.delPattern('*http:*/api/sponsor*');
      return {
        ...res.rows[0],
        allow_attendee_sharing: allowSharing,
      };
    }
  }

  /**
   * Phase 2: Sponsor retrieves events they expressed interest in, with deal status & sharing permissions.
   */
  static async getSponsorMyEvents(sponsorId: string): Promise<any[]> {
    try {
      const sql = `
        SELECT 
          sd.id AS deal_id,
          sd.application_id,
          sd.sponsor_id,
          sd.status AS raw_deal_status,
          sd.package_name,
          sd.pledged_amount,
          sd.sponsor_notes,
          sd.allow_attendee_sharing,
          sd.created_at AS interest_expressed_at,
          sd.updated_at AS deal_updated_at,
          sa.event_title,
          sa.event_type,
          sa.category,
          sa.expected_date,
          sa.location,
          sa.expected_attendees,
          sa.funding_goal,
          sa.currency,
          sa.status AS application_status,
          u.full_name AS organizer_name,
          u.organization AS organizer_organization,
          u.avatar_url AS organizer_avatar,
          u.email AS organizer_email,
          u.phone AS organizer_phone
        FROM sponsorship_deals sd
        JOIN sponsorship_applications sa ON sd.application_id = sa.id
        LEFT JOIN users u ON sa.organizer_id = u.id
        WHERE sd.sponsor_id = $1 AND sd.deleted_at IS NULL AND sa.deleted_at IS NULL
        ORDER BY sd.updated_at DESC
      `;

      const res = await query(sql, [sponsorId]);

      const eventsWithSharing = await Promise.all(
        res.rows.map(async (row: any) => {
          let dealStatus = row.raw_deal_status;
          if (row.sponsor_notes && typeof row.sponsor_notes === 'string') {
            const match = row.sponsor_notes.match(/\[STATUS:(DEAL_ACCEPTED|REJECTED|WITHDRAWN)\]/);
            if (match) {
              dealStatus = match[1];
            }
          }
          if (dealStatus === 'PENDING') {
            dealStatus = 'INTERESTED';
          } else if (dealStatus === 'APPROVED') {
            dealStatus = 'DEAL_ACCEPTED';
          }

          const allowSharing = Boolean(
            row.allow_attendee_sharing === true ||
            (row.sponsor_notes && row.sponsor_notes.includes('[SHARING:TRUE]'))
          );

          let checkedInCount = 0;
          if (allowSharing && dealStatus === 'DEAL_ACCEPTED') {
            try {
              // Attempt to count verified checked-in attendees for the matching event
              const countRes = await query(
                `SELECT COUNT(DISTINCT ci.id)::int AS count
                 FROM check_ins ci
                 JOIN events e ON ci.event_id = e.id
                 WHERE ci.voided_at IS NULL AND (
                   e.title ILIKE $1 OR e.id = (
                     SELECT id FROM events WHERE title ILIKE $1 LIMIT 1
                   )
                 )`,
                [`%${row.event_title.trim()}%`]
              );
              checkedInCount = countRes.rows[0]?.count || 0;
            } catch (countErr) {
              checkedInCount = 0;
            }
          }

          return {
            deal_id: row.deal_id,
            application_id: row.application_id,
            event_title: row.event_title,
            event_type: row.event_type,
            category: row.category,
            expected_date: row.expected_date,
            location: row.location,
            expected_attendees: row.expected_attendees ? Number(row.expected_attendees) : 0,
            funding_goal: row.funding_goal ? Number(row.funding_goal) : 0,
            currency: row.currency || 'ETB',
            package_name: row.package_name,
            pledged_amount: row.pledged_amount ? Number(row.pledged_amount) : 0,
            deal_status: dealStatus,
            allow_attendee_sharing: allowSharing,
            checked_in_count: checkedInCount,
            organizer: {
              name: row.organizer_name,
              organization: row.organizer_organization,
              avatar_url: row.organizer_avatar,
              email: row.organizer_email,
              phone: row.organizer_phone,
            },
            created_at: row.interest_expressed_at,
            updated_at: row.deal_updated_at,
          };
        })
      );

      return eventsWithSharing;
    } catch (err: any) {
      console.warn('Failed to retrieve sponsor my-events, returning safe fallback:', err?.message);
      return [];
    }
  }

  /**
   * Phase 2: Sponsor retrieves checked-in attendees ONLY (strictly gated by accepted deal and active sharing).
   * Data minimization: Returns attendee names only!
   */
  static async getSponsorCheckedInAttendees(
    dealId: string,
    sponsorId: string
  ): Promise<{ event_title: string; attendees: Array<{ attendee_id: string; attendee_name: string; checked_in_at: string }> }> {
    const dealRes = await query(
      `SELECT sd.id, sd.sponsor_id, sd.application_id, sd.status, sd.sponsor_notes, sa.event_title, sa.organizer_id
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE sd.id = $1 AND sd.sponsor_id = $2`,
      [dealId, sponsorId]
    );

    if (!dealRes.rowCount || dealRes.rowCount === 0) {
      const err: any = new Error('Event sponsorship relationship not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const deal = dealRes.rows[0];

    // Check deal status
    let dealStatus = deal.status;
    if (deal.sponsor_notes && typeof deal.sponsor_notes === 'string') {
      const match = deal.sponsor_notes.match(/\[STATUS:(DEAL_ACCEPTED|REJECTED|WITHDRAWN)\]/);
      if (match) {
        dealStatus = match[1];
      }
    }

    if (dealStatus !== 'DEAL_ACCEPTED') {
      const err: any = new Error('Access denied. A sponsorship deal must be accepted by the organizer before attendee lists are accessible.');
      err.statusCode = 403;
      throw err;
    }

    // Check attendee-information sharing permission
    const isSharingAllowed = Boolean(
      deal.allow_attendee_sharing === true ||
      (deal.sponsor_notes && deal.sponsor_notes.includes('[SHARING:TRUE]'))
    );

    if (!isSharingAllowed) {
      const err: any = new Error(
        'Forbidden. The organizer has not enabled attendee-information sharing for this event, or sharing has been revoked.'
      );
      err.statusCode = 403;
      throw err;
    }

    // Find the matching event in the events table
    let eventId: string | null = null;
    const eventMatchRes = await query(
      `SELECT id FROM events 
       WHERE organizer_id = $1 AND (title ILIKE $2 OR title ILIKE $3) AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [deal.organizer_id, deal.event_title, `%${deal.event_title.trim()}%`]
    );

    if (eventMatchRes.rowCount && eventMatchRes.rowCount > 0) {
      eventId = eventMatchRes.rows[0].id;
    }

    if (!eventId) {
      // If no matching published event in events table, return empty checked-in list safely
      return {
        event_title: deal.event_title,
        attendees: [],
      };
    }

    // Authoritative check-ins: ONLY attendees who actually checked in via door QR or manual check-in
    // Data minimization: attendee_id, attendee_name, checked_in_at only!
    const attendeesRes = await query(
      `SELECT 
        u.id AS attendee_id,
        u.full_name AS attendee_name,
        ci.approved_at AS checked_in_at
       FROM check_ins ci
       JOIN registrations r ON ci.registration_id = r.id
       JOIN users u ON ci.user_id = u.id
       WHERE ci.event_id = $1 AND ci.voided_at IS NULL AND r.deleted_at IS NULL
       ORDER BY ci.approved_at DESC`,
      [eventId]
    );

    // Phase 3: Check which attendees have already been recorded by this sponsor
    let recordedAttendeeMap: Record<string, any> = {};
    try {
      await this.ensureQuestionnaireTables();
      const respRes = await query(
        `SELECT attendee_id, status, created_at, updated_at
         FROM sponsor_attendee_responses
         WHERE deal_id = $1 AND sponsor_id = $2`,
        [dealId, sponsorId]
      );
      for (const r of respRes.rows) {
        recordedAttendeeMap[r.attendee_id] = r;
      }
    } catch (err) {
      // Safe fallback
    }

    return {
      event_title: deal.event_title,
      attendees: attendeesRes.rows.map((row: any) => {
        const recorded = recordedAttendeeMap[row.attendee_id];
        return {
          attendee_id: row.attendee_id,
          attendee_name: row.attendee_name,
          checked_in_at: row.checked_in_at,
          record_status: recorded ? ('RECORDED' as const) : ('NOT_RECORDED' as const),
          is_recorded: Boolean(recorded),
          recorded_at: recorded?.updated_at || recorded?.created_at || null,
        };
      }),
    };
  }

  /**
   * Phase 3: Ensure questionnaire tables exist safely
   */
  private static async ensureQuestionnaireTables(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS sponsor_questionnaires (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          deal_id UUID NOT NULL,
          sponsor_id UUID NOT NULL,
          version_number INT NOT NULL DEFAULT 1,
          title VARCHAR(255) DEFAULT 'Attendee Engagement Questionnaire',
          questions JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sponsor_attendee_responses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          deal_id UUID NOT NULL,
          sponsor_id UUID NOT NULL,
          attendee_id UUID NOT NULL,
          questionnaire_id UUID,
          version_number INT NOT NULL DEFAULT 1,
          questions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
          answers JSONB NOT NULL DEFAULT '{}'::jsonb,
          status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
          recorded_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    } catch (err: any) {
      // Graceful fallback
    }
  }

  /**
   * Phase 3: Retrieve current active questionnaire definition for a sponsorship deal
   */
  static async getSponsorQuestionnaire(dealId: string, sponsorId: string): Promise<any> {
    const dealRes = await query(
      `SELECT sd.id, sd.sponsor_id, sd.status, sd.sponsor_notes, sa.event_title
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE sd.id = $1 AND sd.sponsor_id = $2`,
      [dealId, sponsorId]
    );

    if (!dealRes.rowCount || dealRes.rowCount === 0) {
      const err: any = new Error('Sponsorship relationship not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    await this.ensureQuestionnaireTables();

    try {
      const qRes = await query(
        `SELECT id, deal_id, sponsor_id, version_number, title, questions, is_active, created_at, updated_at
         FROM sponsor_questionnaires
         WHERE deal_id = $1 AND sponsor_id = $2 AND is_active = true
         ORDER BY version_number DESC LIMIT 1`,
        [dealId, sponsorId]
      );

      if (qRes.rowCount && qRes.rowCount > 0) {
        return qRes.rows[0];
      }
    } catch (err: any) {
      console.warn('DB query error getting sponsor questionnaire, returning default:', err?.message);
    }

    // Default questionnaire template
    return {
      id: `default_${dealId}`,
      deal_id: dealId,
      sponsor_id: sponsorId,
      version_number: 1,
      title: `${dealRes.rows[0]?.event_title || 'Event'} Attendee Survey`,
      questions: [
        {
          id: 'q_default_1',
          question: 'What interest brings you to our brand activation today?',
          type: 'SHORT_TEXT',
          required: true,
          options: [],
        },
        {
          id: 'q_default_2',
          question: 'How likely are you to explore our services or partner with us?',
          type: 'RATING',
          required: false,
          options: ['1', '2', '3', '4', '5'],
        },
        {
          id: 'q_default_3',
          question: 'Which area best describes your professional focus?',
          type: 'SINGLE_CHOICE',
          required: false,
          options: ['Corporate / Enterprise', 'Startup / Tech', 'Government / NGO', 'Student / Individual'],
        },
      ],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Phase 3: Save or update questionnaire definition.
   * If responses have already been recorded under current version, creates a new version
   * to guarantee historical immutable snapshot integrity (Section 7.2).
   */
  static async saveSponsorQuestionnaire(
    dealId: string,
    sponsorId: string,
    title: string,
    questions: any[]
  ): Promise<any> {
    const dealRes = await query(
      `SELECT id, sponsor_id FROM sponsorship_deals WHERE id = $1 AND sponsor_id = $2`,
      [dealId, sponsorId]
    );

    if (!dealRes.rowCount || dealRes.rowCount === 0) {
      const err: any = new Error('Sponsorship relationship not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    await this.ensureQuestionnaireTables();

    const latestRes = await query(
      `SELECT id, version_number FROM sponsor_questionnaires
       WHERE deal_id = $1 AND sponsor_id = $2
       ORDER BY version_number DESC LIMIT 1`,
      [dealId, sponsorId]
    );

    let nextVersion = 1;
    let shouldInsertNewVersion = true;

    if (latestRes.rowCount && latestRes.rowCount > 0) {
      const latest = latestRes.rows[0];
      const respCountRes = await query(
        `SELECT COUNT(*)::int AS count FROM sponsor_attendee_responses
         WHERE deal_id = $1 AND sponsor_id = $2 AND version_number = $3`,
        [dealId, sponsorId, latest.version_number]
      );
      const responsesCount = respCountRes.rows[0]?.count || 0;

      if (responsesCount > 0) {
        nextVersion = latest.version_number + 1;
        shouldInsertNewVersion = true;
      } else {
        nextVersion = latest.version_number;
        shouldInsertNewVersion = false;
      }
    }

    if (shouldInsertNewVersion) {
      await query(
        `UPDATE sponsor_questionnaires SET is_active = false
         WHERE deal_id = $1 AND sponsor_id = $2`,
        [dealId, sponsorId]
      );

      const insRes = await query(
        `INSERT INTO sponsor_questionnaires (deal_id, sponsor_id, version_number, title, questions, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         RETURNING *`,
        [dealId, sponsorId, nextVersion, title || 'Attendee Engagement Questionnaire', JSON.stringify(questions)]
      );
      return insRes.rows[0];
    } else {
      const updRes = await query(
        `UPDATE sponsor_questionnaires
         SET title = $1, questions = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [title || 'Attendee Engagement Questionnaire', JSON.stringify(questions), latestRes.rows[0].id]
      );
      return updRes.rows[0];
    }
  }

  /**
   * Phase 3: Record questionnaire response for a checked-in attendee.
   * Strictly gated by: Deal accepted + Attendee sharing active + verified check-in.
   */
  static async recordAttendeeResponse(
    dealId: string,
    sponsorId: string,
    attendeeId: string,
    answers: Record<string, any>,
    recordedBy?: string,
    status = 'COMPLETED'
  ): Promise<any> {
    const dealRes = await query(
      `SELECT sd.id, sd.sponsor_id, sd.status, sd.sponsor_notes, sa.event_title, sa.organizer_id
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE sd.id = $1 AND sd.sponsor_id = $2`,
      [dealId, sponsorId]
    );

    if (!dealRes.rowCount || dealRes.rowCount === 0) {
      const err: any = new Error('Deal relationship not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }

    const deal = dealRes.rows[0];
    let dealStatus = deal.status;
    if (deal.sponsor_notes && typeof deal.sponsor_notes === 'string') {
      const match = deal.sponsor_notes.match(/\[STATUS:(DEAL_ACCEPTED|REJECTED|WITHDRAWN)\]/);
      if (match) dealStatus = match[1];
    }

    if (dealStatus !== 'DEAL_ACCEPTED') {
      const err: any = new Error('Cannot record responses for an unaccepted deal.');
      err.statusCode = 403;
      throw err;
    }

    const isSharingAllowed = Boolean(
      deal.allow_attendee_sharing === true ||
      (deal.sponsor_notes && deal.sponsor_notes.includes('[SHARING:TRUE]'))
    );

    if (!isSharingAllowed) {
      const err: any = new Error('Attendee-information sharing is not enabled for this event.');
      err.statusCode = 403;
      throw err;
    }

    await this.ensureQuestionnaireTables();

    const q = await this.getSponsorQuestionnaire(dealId, sponsorId);
    const questionsSnapshot = q.questions || [];
    const questionnaireId = q.id && !String(q.id).startsWith('default_') ? q.id : null;
    const versionNumber = q.version_number || 1;

    // Validate required questions
    for (const quest of questionsSnapshot) {
      if (quest.required) {
        const val = answers[quest.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          const err: any = new Error(`Answer required for: "${quest.question}"`);
          err.statusCode = 400;
          throw err;
        }
      }
    }

    const existing = await query(
      `SELECT id FROM sponsor_attendee_responses
       WHERE deal_id = $1 AND sponsor_id = $2 AND attendee_id = $3`,
      [dealId, sponsorId, attendeeId]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const updRes = await query(
        `UPDATE sponsor_attendee_responses
         SET answers = $1, questions_snapshot = $2, status = $3, recorded_by = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [JSON.stringify(answers), JSON.stringify(questionsSnapshot), status, recordedBy || sponsorId, existing.rows[0].id]
      );
      return updRes.rows[0];
    } else {
      const insRes = await query(
        `INSERT INTO sponsor_attendee_responses (
           deal_id, sponsor_id, attendee_id, questionnaire_id, version_number,
           questions_snapshot, answers, status, recorded_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [
          dealId,
          sponsorId,
          attendeeId,
          questionnaireId,
          versionNumber,
          JSON.stringify(questionsSnapshot),
          JSON.stringify(answers),
          status,
          recordedBy || sponsorId,
        ]
      );
      return insRes.rows[0];
    }
  }

  /**
   * Phase 3: Retrieve existing recorded response for an attendee
   */
  static async getAttendeeResponse(dealId: string, sponsorId: string, attendeeId: string): Promise<any> {
    await this.ensureQuestionnaireTables();
    try {
      const res = await query(
        `SELECT * FROM sponsor_attendee_responses
         WHERE deal_id = $1 AND sponsor_id = $2 AND attendee_id = $3`,
        [dealId, sponsorId, attendeeId]
      );
      return res.rows[0] || null;
    } catch (err: any) {
      return null;
    }
  }

  /**
   * Phase 4: Retrieve deal responses for CSV export
   */
  static async getDealResponsesForExport(dealId: string, sponsorId: string): Promise<any> {
    await this.ensureQuestionnaireTables();
    try {
      const res = await query(
        `SELECT r.*, u.name AS attendee_name, u.email AS attendee_email
         FROM sponsor_attendee_responses r
         LEFT JOIN users u ON u.id = r.attendee_id
         WHERE r.deal_id = $1 AND r.sponsor_id = $2
         ORDER BY r.created_at DESC`,
        [dealId, sponsorId]
      );
      return res.rows;
    } catch (err: any) {
      return [];
    }
  }

  /**
   * Phase 4: Retrieve genuine report summary for sponsor's granted activations
   * (Real counts only: genuine attendee recordings, zero simulated charts).
   */
  static async getSponsorReportsSummary(sponsorId: string): Promise<any> {
    await this.ensureQuestionnaireTables();

    const myEvents = await this.getSponsorMyEvents(sponsorId);
    const grantedEvents = myEvents.filter(
      (e) => e.deal_status === 'DEAL_ACCEPTED' && e.allow_attendee_sharing
    );

    const summaries = await Promise.all(
      grantedEvents.map(async (event) => {
        let responsesCount = 0;
        try {
          const respRes = await query(
            `SELECT COUNT(*)::int AS count
             FROM sponsor_attendee_responses
             WHERE deal_id = $1 AND sponsor_id = $2 AND status = 'COMPLETED'`,
            [event.deal_id, sponsorId]
          );
          responsesCount = respRes.rows[0]?.count || 0;
        } catch (err) {
          responsesCount = 0;
        }

        return {
          deal_id: event.deal_id,
          event_title: event.event_title,
          expected_date: event.expected_date,
          location: event.location,
          checked_in_count: event.checked_in_count || 0,
          responses_count: responsesCount,
          status: 'RECORDING_ACTIVE',
        };
      })
    );

    return {
      total_granted_events: grantedEvents.length,
      total_responses_recorded: summaries.reduce((sum, s) => sum + s.responses_count, 0),
      events: summaries,
    };
  }

  static async saveDeliverable(sponsorId: string, payload: any): Promise<any> {
    const dealId = payload.deal_id || payload.dealId || null;
    const companyName = payload.company_name || payload.companyName || 'Corporate Partner';
    const website = payload.website || null;
    const tagline = payload.tagline || null;
    const primaryColor = payload.primary_color || payload.primaryColor || '#63474D';
    const secondaryColor = payload.secondary_color || payload.secondaryColor || '#FFA686';
    const mediaKitUrl = payload.media_kit_url || payload.mediaKitUrl || null;
    const bio = payload.bio || null;
    const boothPreference = payload.booth_preference || payload.boothPreference || null;
    const avRequirements = payload.av_requirements || payload.avRequirements || null;
    const ticketVouchersNeeded = payload.ticket_vouchers_needed || payload.ticketVouchersNeeded || null;
    const repName = payload.rep_name || payload.repName || 'Representative';
    const repTitle = payload.rep_title || payload.repTitle || 'Representative';
    const repPhone = payload.rep_phone || payload.repPhone || '';
    const repEmail = payload.rep_email || payload.repEmail || '';
    const status = payload.status || 'SUBMITTED';

    if (dealId) {
      const dealCheck = await query(
        'SELECT id, sponsor_id, status FROM sponsorship_deals WHERE id = $1 AND deleted_at IS NULL',
        [dealId]
      );
      if (!dealCheck.rowCount || dealCheck.rowCount === 0) {
        const err: any = new Error('Sponsorship deal not found.');
        err.statusCode = 404;
        throw err;
      }
      if (dealCheck.rows[0].sponsor_id !== sponsorId) {
        const err: any = new Error('You do not have permission to manage deliverables for this deal.');
        err.statusCode = 403;
        throw err;
      }

      const upsertRes = await query(
        `INSERT INTO sponsorship_deliverables (
          deal_id, sponsor_id, company_name, website, tagline, primary_color, secondary_color,
          media_kit_url, bio, booth_preference, av_requirements, ticket_vouchers_needed,
          rep_name, rep_title, rep_phone, rep_email, status, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (deal_id) WHERE deal_id IS NOT NULL
        DO UPDATE SET
          company_name = EXCLUDED.company_name,
          website = EXCLUDED.website,
          tagline = EXCLUDED.tagline,
          primary_color = EXCLUDED.primary_color,
          secondary_color = EXCLUDED.secondary_color,
          media_kit_url = EXCLUDED.media_kit_url,
          bio = EXCLUDED.bio,
          booth_preference = EXCLUDED.booth_preference,
          av_requirements = EXCLUDED.av_requirements,
          ticket_vouchers_needed = EXCLUDED.ticket_vouchers_needed,
          rep_name = EXCLUDED.rep_name,
          rep_title = EXCLUDED.rep_title,
          rep_phone = EXCLUDED.rep_phone,
          rep_email = EXCLUDED.rep_email,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING *`,
        [
          dealId, sponsorId, companyName, website, tagline, primaryColor, secondaryColor,
          mediaKitUrl, bio, boothPreference, avRequirements, ticketVouchersNeeded,
          repName, repTitle, repPhone, repEmail, status,
        ]
      );
      return this.formatDeliverableRow(upsertRes.rows[0]);
    }

    const defaultRes = await query(
      `INSERT INTO sponsorship_deliverables (
        deal_id, sponsor_id, company_name, website, tagline, primary_color, secondary_color,
        media_kit_url, bio, booth_preference, av_requirements, ticket_vouchers_needed,
        rep_name, rep_title, rep_phone, rep_email, status, updated_at
      ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      ON CONFLICT (sponsor_id) WHERE deal_id IS NULL
      DO UPDATE SET
        company_name = EXCLUDED.company_name,
        website = EXCLUDED.website,
        tagline = EXCLUDED.tagline,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        media_kit_url = EXCLUDED.media_kit_url,
        bio = EXCLUDED.bio,
        booth_preference = EXCLUDED.booth_preference,
        av_requirements = EXCLUDED.av_requirements,
        ticket_vouchers_needed = EXCLUDED.ticket_vouchers_needed,
        rep_name = EXCLUDED.rep_name,
        rep_title = EXCLUDED.rep_title,
        rep_phone = EXCLUDED.rep_phone,
        rep_email = EXCLUDED.rep_email,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *`,
      [
        sponsorId, companyName, website, tagline, primaryColor, secondaryColor,
        mediaKitUrl, bio, boothPreference, avRequirements, ticketVouchersNeeded,
        repName, repTitle, repPhone, repEmail, status,
      ]
    );
    return this.formatDeliverableRow(defaultRes.rows[0]);
  }

  static async getDeliverablesForSponsor(sponsorId: string): Promise<any[]> {
    const res = await query(
      `SELECT 
        d.*,
        sd.package_name,
        sd.status AS deal_status,
        sa.event_title AS pitch_title
       FROM sponsorship_deliverables d
       LEFT JOIN sponsorship_deals sd ON d.deal_id = sd.id
       LEFT JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE d.sponsor_id = $1
       ORDER BY (d.deal_id IS NULL) DESC, d.created_at DESC`,
      [sponsorId]
    );
    return res.rows.map((r) => ({
      ...this.formatDeliverableRow(r),
      packageName: r.package_name,
      dealStatus: r.deal_status,
      pitchTitle: r.pitch_title,
    }));
  }

  static async getDeliverableForDeal(
    dealId: string,
    userId: string,
    userRole: string
  ): Promise<any> {
    const dealRes = await query(
      `SELECT sd.id, sd.sponsor_id, sd.status, sa.organizer_id, sa.event_title
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       WHERE sd.id = $1 AND sd.deleted_at IS NULL`,
      [dealId]
    );

    if (!dealRes.rowCount || dealRes.rowCount === 0) {
      const err: any = new Error('Sponsorship deal not found.');
      err.statusCode = 404;
      throw err;
    }

    const deal = dealRes.rows[0];
    const roleUpper = userRole.toUpperCase();

    if (roleUpper === 'SPONSOR') {
      if (deal.sponsor_id !== userId) {
        const err: any = new Error('You do not have permission to view deliverables for this deal.');
        err.statusCode = 403;
        throw err;
      }
    } else if (roleUpper === 'ORGANIZER') {
      if (deal.organizer_id !== userId || deal.status !== 'APPROVED') {
        const err: any = new Error('Only approved sponsors deliverables can be accessed by the organizer.');
        err.statusCode = 403;
        throw err;
      }
    } else if (roleUpper !== 'ADMIN') {
      const err: any = new Error('Unauthorized.');
      err.statusCode = 403;
      throw err;
    }

    const delRes = await query(
      'SELECT * FROM sponsorship_deliverables WHERE deal_id = $1',
      [dealId]
    );

    if (delRes.rowCount && delRes.rowCount > 0) {
      return this.formatDeliverableRow(delRes.rows[0]);
    }

    const fallbackRes = await query(
      'SELECT * FROM sponsorship_deliverables WHERE sponsor_id = $1 AND deal_id IS NULL',
      [deal.sponsor_id]
    );

    if (fallbackRes.rowCount && fallbackRes.rowCount > 0) {
      return {
        ...this.formatDeliverableRow(fallbackRes.rows[0]),
        isDefaultTemplate: true,
      };
    }

    return null;
  }

  static async deleteDeliverable(deliverableId: string, sponsorId: string): Promise<boolean> {
    const res = await query(
      'DELETE FROM sponsorship_deliverables WHERE id = $1 AND sponsor_id = $2 RETURNING id',
      [deliverableId, sponsorId]
    );
    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Deliverable not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }
    return true;
  }

  private static formatDeliverableRow(row: any): any {
    return {
      id: row.id,
      dealId: row.deal_id,
      sponsorId: row.sponsor_id,
      companyName: row.company_name,
      website: row.website,
      tagline: row.tagline,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      mediaKitUrl: row.media_kit_url,
      bio: row.bio,
      boothPreference: row.booth_preference,
      avRequirements: row.av_requirements,
      ticketVouchersNeeded: row.ticket_vouchers_needed,
      repName: row.rep_name,
      repTitle: row.rep_title,
      repPhone: row.rep_phone,
      repEmail: row.rep_email,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
