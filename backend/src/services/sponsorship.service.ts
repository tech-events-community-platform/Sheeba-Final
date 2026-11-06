import { query } from '../config/db';
import { ISponsorshipApplication, ISponsorshipDeal, SponsorshipDealStatus, IApplicationAffiliations } from '../types';
import { CacheService } from './cache.service';
import { RecycleBinService } from './recycleBin.service';
import { EmailService } from './email.service';

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
      WHERE sa.status != 'CLOSED' AND sa.deleted_at IS NULL
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
  static async getApplicationById(id: string): Promise<ISponsorshipApplication & { organizer_events_count?: number }> {
    const cacheKey = `sponsorship:app:${id}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

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
          WHERE sd.application_id = sa.id AND sd.status IN ('APPROVED', 'INTERESTED') AND sd.deleted_at IS NULL
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

    await CacheService.set(cacheKey, res.rows[0], 60);
    return res.rows[0];
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
    }>(
      `SELECT id, event_title, status, packages, organizer_id 
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
    const appRes = await query('SELECT id FROM sponsorship_applications WHERE id = $1 AND deleted_at IS NULL', [applicationId]);
    if (!appRes.rowCount || appRes.rowCount === 0) {
      const err: any = new Error('Application does not exist.');
      err.statusCode = 404;
      throw err;
    }

    const { package_name, pledged_amount, sponsor_notes, proposal_message } = data || {};

    const activeRes = await query<ISponsorshipDeal>(
      `SELECT id FROM sponsorship_deals 
       WHERE application_id = $1 AND sponsor_id = $2 AND deleted_at IS NULL 
         AND status IN ('PENDING', 'APPROVED', 'INTERESTED')
       LIMIT 1`,
      [applicationId, sponsorId]
    );

    let deal: ISponsorshipDeal;
    if (activeRes.rowCount && activeRes.rowCount > 0) {
      const res = await query<ISponsorshipDeal>(
        `UPDATE sponsorship_deals SET
          status = $1,
          package_name = COALESCE($2, package_name),
          pledged_amount = COALESCE($3, pledged_amount),
          proposal_message = COALESCE($4, proposal_message),
          sponsor_notes = COALESCE($5, sponsor_notes),
          updated_at = NOW()
        WHERE id = $6
        RETURNING *`,
        [
          status,
          package_name || null,
          pledged_amount ? Number(pledged_amount) : null,
          proposal_message || null,
          sponsor_notes || null,
          activeRes.rows[0].id,
        ]
      );
      deal = res.rows[0];
    } else {
      const res = await query<ISponsorshipDeal>(
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
      deal = res.rows[0];
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
      sql += ` AND sd.status = $2`;
      params.push(statusFilter);
    }

    sql += ` ORDER BY sd.created_at DESC, sd.updated_at DESC`;

    const res = await query(sql, params);
    return res.rows.map((row: any) => ({
      id: row.id,
      application_id: row.application_id,
      sponsor_id: row.sponsor_id,
      status: row.status,
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
    }));
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
   * Delete or close an application (Organizer)
   */
  static async deleteApplication(applicationId: string, organizerId: string): Promise<boolean> {
    const titleRes = await query('SELECT event_title FROM sponsorship_applications WHERE id = $1 AND organizer_id = $2', [applicationId, organizerId]);
    const eventTitle = titleRes.rows[0]?.event_title || 'Sponsorship Application';

    const res = await query(
      `UPDATE sponsorship_applications SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND organizer_id = $2`,
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
      await CacheService.delPattern('*http:*/api/sponsorship*');
      await CacheService.delPattern('matching:recommendations:*');
    }

    return isDeleted;
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
