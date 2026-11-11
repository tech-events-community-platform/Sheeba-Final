import pool, { query } from '../config/db';
import { EmailService } from './email.service';
import { CacheService } from './cache.service';
import { AuditService } from './audit.service';
import { signAuthToken } from '../utils/jwt.util';
import { ENV } from '../config/env';

export class AdminService {
  static async getDashboardMetrics() {
    const cacheKey = 'admin:dashboard:metrics';
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const countsRes = await query(`
      SELECT 
        (SELECT COUNT(*)::INTEGER FROM events WHERE deleted_at IS NULL) AS total_events,
        (SELECT COUNT(*)::INTEGER FROM users WHERE (role = 'attendee' OR role IS NULL) AND deleted_at IS NULL) AS total_attendees,
        (SELECT COUNT(*)::INTEGER FROM users WHERE (role = 'organizer' OR is_organizer = TRUE) AND deleted_at IS NULL) AS total_organizers,
        (SELECT COUNT(*)::INTEGER FROM users WHERE ((role = 'organizer' AND approval_status = 'pending') OR organizer_approval_status = 'pending') AND deleted_at IS NULL) AS pending_organizers,
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'sponsor' AND deleted_at IS NULL) AS total_sponsors,
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'sponsor' AND approval_status = 'pending' AND deleted_at IS NULL) AS pending_sponsors,
        (SELECT COUNT(*)::INTEGER FROM registrations WHERE status = 'registered' AND deleted_at IS NULL) AS total_registrations,
        (SELECT COUNT(DISTINCT r.id)::INTEGER 
         FROM registrations r 
         LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL 
         LEFT JOIN tickets t ON t.registration_id = r.id 
         LEFT JOIN badge_awards b ON b.event_id = r.event_id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL 
         WHERE r.deleted_at IS NULL AND ((ci.id IS NOT NULL AND ci.voided_at IS NULL) 
            OR t.status IN ('CHECKED_IN', 'Used') 
            OR (b.id IS NOT NULL AND b.revoked_at IS NULL))
        ) AS total_check_ins,
        (SELECT COUNT(*)::INTEGER FROM badge_awards WHERE revoked_at IS NULL) AS total_badges
    `);

    const row = countsRes.rows[0];
    const totalRegistrations = parseInt(row.total_registrations || '0', 10);
    const totalCheckIns = parseInt(row.total_check_ins || '0', 10);
    const turnoutRate = totalRegistrations > 0
      ? parseFloat(((totalCheckIns / totalRegistrations) * 100).toFixed(1))
      : 0;

    const metrics = {
      totalEvents: parseInt(row.total_events || '0', 10),
      totalAttendees: parseInt(row.total_attendees || '0', 10),
      totalOrganizers: parseInt(row.total_organizers || '0', 10),
      pendingOrganizers: parseInt(row.pending_organizers || '0', 10),
      totalSponsors: parseInt(row.total_sponsors || '0', 10),
      pendingSponsors: parseInt(row.pending_sponsors || '0', 10),
      totalRegistrations,
      totalCheckIns,
      turnoutRate,
      totalBadges: parseInt(row.total_badges || '0', 10),
    };

    await CacheService.set(cacheKey, metrics, 30);
    return metrics;
  }

  static async getUsersList(options?: {
    role?: 'organizer' | 'sponsor' | 'attendee';
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const mapAttendee = (u: any) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: 'ATTENDEE',
      eventsRegistered: u.events_registered || 0,
      eventsAttended: u.events_attended || 0,
      status: u.is_active ? 'Active' : 'Inactive',
      approvalStatus: u.approval_status || 'approved',
      registeredAt: u.created_at,
    });

    const mapOrganizer = (o: any) => {
      const effApproval = (o.organizer_approval_status && o.organizer_approval_status !== 'none')
        ? o.organizer_approval_status
        : (o.approval_status || 'pending');

      const isIndividual = (o.applicant_type || '').toLowerCase().includes('individual') || (!o.applicant_type && !o.organization);
      const applicantType = isIndividual ? 'Individual Organizer' : 'Organization / Institution';

      return {
        id: o.id,
        name: o.full_name,
        email: o.email,
        phone: o.phone || '',
        applicantType,
        organization: o.organization || o.full_name,
        organizationType: o.organization_type || '',
        applicantPosition: o.applicant_position || '',
        organizationDescription: o.organization_description || o.organizer_bio || '',
        organizationWebsite: o.organization_website || '',
        organizationLogo: o.organization_logo || '',
        personalIntroduction: o.bio || o.organizer_bio || '',
        bio: o.bio || o.organizer_bio || '',
        eventsCount: o.events_count || 0,
        totalCheckIns: o.total_check_ins || 0,
        status: effApproval === 'pending'
          ? 'Pending Approval'
          : effApproval === 'more_info_needed'
          ? 'More Info Needed'
          : effApproval === 'approved'
          ? 'Active'
          : 'Rejected',
        approvalStatus: effApproval,
        isActive: effApproval === 'approved',
        rejectionReason: o.organizer_rejection_reason || '',
        infoRequestedNotes: o.organizer_info_requested_notes || '',
        appliedAt: o.organizer_applied_at || o.created_at,
        registeredAt: o.created_at,
      };
    };

    const mapSponsor = (s: any) => ({
      id: s.id,
      name: s.full_name,
      email: s.email,
      companyName: s.company_name || s.organization || 'Corporate Partner',
      industryCategory: s.industry_category || 'Technology',
      phone: s.company_phone || s.phone || '',
      companyPhone: s.company_phone || s.phone || '',
      website: s.company_website || '',
      companyWebsite: s.company_website || '',
      bio: s.bio || '',
      avatarUrl: s.avatar_url || '',
      sponsorPreferences: s.sponsor_preferences || {},
      status: s.approval_status === 'pending'
        ? 'Pending Approval'
        : s.approval_status === 'approved'
        ? 'Active'
        : 'Rejected',
      approvalStatus: s.approval_status,
      isActive: s.approval_status === 'approved',
      registeredAt: s.created_at,
    });

    // Backward compatibility: If no role is passed (legacy tests or unparameterized callers), return full payload
    if (!options || !options.role) {
      const attendeesRes = await query(`
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.role, u.is_active, u.approval_status, u.created_at,
          COUNT(DISTINCT r.id)::INTEGER AS events_registered,
          COUNT(DISTINCT CASE 
            WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
              OR t.status IN ('CHECKED_IN', 'Used') 
              OR (b.id IS NOT NULL AND b.revoked_at IS NULL) 
            THEN r.id 
          END)::INTEGER AS events_attended
        FROM users u
        LEFT JOIN registrations r ON u.id = r.user_id AND r.status = 'registered'
        LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
        LEFT JOIN tickets t ON u.id = t.user_id
        LEFT JOIN badge_awards b ON b.event_id = r.event_id AND b.user_id = u.id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
        WHERE (u.role = 'attendee' OR u.role IS NULL) AND u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);

      const organizersRes = await query(`
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.organization, u.role, u.is_active, u.approval_status,
          u.is_organizer, u.organizer_approval_status, u.created_at,
          u.applicant_type, u.organization_type, u.applicant_position, u.organization_description,
          u.organization_website, u.organization_logo, u.organizer_rejection_reason,
          u.organizer_info_requested_notes, u.organizer_applied_at, u.bio, u.organizer_bio, u.avatar_url,
          COUNT(DISTINCT e.id)::INTEGER AS events_count,
          COUNT(DISTINCT CASE 
            WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
              OR t.status IN ('CHECKED_IN', 'Used') 
              OR (b.id IS NOT NULL AND b.revoked_at IS NULL) 
            THEN r.id 
          END)::INTEGER AS total_check_ins
        FROM users u
        LEFT JOIN events e ON u.id = e.organizer_id AND e.deleted_at IS NULL
        LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered' AND r.deleted_at IS NULL
        LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
        LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
        LEFT JOIN badge_awards b ON b.event_id = e.id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
        WHERE (u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')) AND u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY 
          CASE WHEN (u.organizer_approval_status = 'pending' OR u.approval_status = 'pending' OR u.organizer_approval_status = 'more_info_needed') THEN 0 ELSE 1 END,
          COALESCE(u.organizer_applied_at, u.created_at) DESC
      `);

      const sponsorsRes = await query(`
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.company_name, u.industry_category,
          u.company_phone, u.company_website, u.bio, u.avatar_url, u.sponsor_preferences, u.organization, u.role, u.is_active,
          u.approval_status, u.created_at
        FROM users u
        WHERE u.role = 'sponsor' AND u.deleted_at IS NULL
        ORDER BY 
          CASE WHEN u.approval_status = 'pending' THEN 0 ELSE 1 END,
          u.created_at DESC
      `);

      return {
        attendees: attendeesRes.rows.map(mapAttendee),
        organizers: organizersRes.rows.map(mapOrganizer),
        sponsors: sponsorsRes.rows.map(mapSponsor),
      };
    }

    // Role-specific paginated & filtered query
    const role = options.role;
    const status = (options.status || 'all').toLowerCase();
    const search = (options.search || '').trim().toLowerCase();
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 15));
    const offset = (page - 1) * limit;

    // 1. Fetch live aggregate summary counts across all roles/statuses for tab badges
    const summaryRes = await query(`
      SELECT
        COUNT(CASE WHEN (u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')) THEN 1 END)::INTEGER AS org_total,
        COUNT(CASE WHEN (u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')) 
          AND COALESCE(NULLIF(u.organizer_approval_status, 'none'), u.approval_status, 'pending') = 'pending' THEN 1 END)::INTEGER AS org_pending,
        COUNT(CASE WHEN (u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')) 
          AND COALESCE(NULLIF(u.organizer_approval_status, 'none'), u.approval_status, 'pending') = 'approved' THEN 1 END)::INTEGER AS org_approved,
        COUNT(CASE WHEN (u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')) 
          AND COALESCE(NULLIF(u.organizer_approval_status, 'none'), u.approval_status, 'pending') IN ('rejected', 'more_info_needed') THEN 1 END)::INTEGER AS org_rejected,
        COUNT(CASE WHEN (u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')) 
          AND COALESCE(NULLIF(u.organizer_approval_status, 'none'), u.approval_status, 'pending') = 'more_info_needed' THEN 1 END)::INTEGER AS org_more_info_needed,

        COUNT(CASE WHEN u.role = 'sponsor' THEN 1 END)::INTEGER AS sponsor_total,
        COUNT(CASE WHEN u.role = 'sponsor' AND COALESCE(u.approval_status, 'pending') = 'pending' THEN 1 END)::INTEGER AS sponsor_pending,
        COUNT(CASE WHEN u.role = 'sponsor' AND u.approval_status = 'approved' THEN 1 END)::INTEGER AS sponsor_approved,
        COUNT(CASE WHEN u.role = 'sponsor' AND u.approval_status = 'rejected' THEN 1 END)::INTEGER AS sponsor_rejected,

        COUNT(CASE WHEN (u.role = 'attendee' OR u.role IS NULL) THEN 1 END)::INTEGER AS attendee_total
      FROM users u
      WHERE u.deleted_at IS NULL
    `);
    const sc = summaryRes.rows[0] || {};

    let records: any[] = [];
    let total = 0;

    if (role === 'organizer') {
      let whereSql = `
        WHERE (u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')) 
          AND u.deleted_at IS NULL
      `;
      const params: any[] = [];
      let pIdx = 1;

      if (status === 'pending') {
        whereSql += ` AND COALESCE(NULLIF(u.organizer_approval_status, 'none'), u.approval_status, 'pending') = 'pending'`;
      } else if (status === 'approved') {
        whereSql += ` AND COALESCE(NULLIF(u.organizer_approval_status, 'none'), u.approval_status, 'pending') = 'approved'`;
      } else if (status === 'rejected') {
        whereSql += ` AND COALESCE(NULLIF(u.organizer_approval_status, 'none'), u.approval_status, 'pending') IN ('rejected', 'more_info_needed')`;
      }

      if (search) {
        whereSql += ` AND (LOWER(u.full_name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx} OR LOWER(COALESCE(u.organization, '')) LIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      const countRes = await query(`
        SELECT COUNT(DISTINCT u.id)::INTEGER AS total
        FROM users u
        ${whereSql}
      `, params);
      total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.organization, u.role, u.is_active, u.approval_status,
          u.is_organizer, u.organizer_approval_status, u.created_at,
          u.applicant_type, u.organization_type, u.applicant_position, u.organization_description,
          u.organization_website, u.organization_logo, u.organizer_rejection_reason,
          u.organizer_info_requested_notes, u.organizer_applied_at, u.bio, u.organizer_bio, u.avatar_url,
          COUNT(DISTINCT e.id)::INTEGER AS events_count,
          COUNT(DISTINCT CASE 
            WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
              OR t.status IN ('CHECKED_IN', 'Used') 
              OR (b.id IS NOT NULL AND b.revoked_at IS NULL) 
            THEN r.id 
          END)::INTEGER AS total_check_ins
        FROM users u
        LEFT JOIN events e ON u.id = e.organizer_id AND e.deleted_at IS NULL
        LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered' AND r.deleted_at IS NULL
        LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
        LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
        LEFT JOIN badge_awards b ON b.event_id = e.id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
        ${whereSql}
        GROUP BY u.id
        ORDER BY COALESCE(u.organizer_applied_at, u.created_at) DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      const dataRes = await query(dataSql, [...params, limit, offset]);
      records = dataRes.rows.map(mapOrganizer);

    } else if (role === 'sponsor') {
      let whereSql = `WHERE u.role = 'sponsor' AND u.deleted_at IS NULL`;
      const params: any[] = [];
      let pIdx = 1;

      if (status === 'pending') {
        whereSql += ` AND COALESCE(u.approval_status, 'pending') = 'pending'`;
      } else if (status === 'approved') {
        whereSql += ` AND u.approval_status = 'approved'`;
      } else if (status === 'rejected') {
        whereSql += ` AND u.approval_status = 'rejected'`;
      }

      if (search) {
        whereSql += ` AND (
          LOWER(u.full_name) LIKE $${pIdx} OR 
          LOWER(u.email) LIKE $${pIdx} OR 
          LOWER(COALESCE(u.company_name, '')) LIKE $${pIdx} OR 
          LOWER(COALESCE(u.industry_category, '')) LIKE $${pIdx}
        )`;
        params.push(`%${search}%`);
        pIdx++;
      }

      const countRes = await query(`
        SELECT COUNT(u.id)::INTEGER AS total
        FROM users u
        ${whereSql}
      `, params);
      total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.company_name, u.industry_category,
          u.company_phone, u.company_website, u.bio, u.avatar_url, u.sponsor_preferences, u.organization, u.role, u.is_active,
          u.approval_status, u.created_at
        FROM users u
        ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      const dataRes = await query(dataSql, [...params, limit, offset]);
      records = dataRes.rows.map(mapSponsor);

    } else if (role === 'attendee') {
      let whereSql = `WHERE (u.role = 'attendee' OR u.role IS NULL) AND u.deleted_at IS NULL`;
      const params: any[] = [];
      let pIdx = 1;

      if (search) {
        whereSql += ` AND (LOWER(u.full_name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      const countRes = await query(`
        SELECT COUNT(DISTINCT u.id)::INTEGER AS total
        FROM users u
        ${whereSql}
      `, params);
      total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.role, u.is_active, u.approval_status, u.created_at,
          COUNT(DISTINCT r.id)::INTEGER AS events_registered,
          COUNT(DISTINCT CASE 
            WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
              OR t.status IN ('CHECKED_IN', 'Used') 
              OR (b.id IS NOT NULL AND b.revoked_at IS NULL) 
            THEN r.id 
          END)::INTEGER AS events_attended
        FROM users u
        LEFT JOIN registrations r ON u.id = r.user_id AND r.status = 'registered'
        LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
        LEFT JOIN tickets t ON u.id = t.user_id
        LEFT JOIN badge_awards b ON b.event_id = r.event_id AND b.user_id = u.id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
        ${whereSql}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      const dataRes = await query(dataSql, [...params, limit, offset]);
      records = dataRes.rows.map(mapAttendee);
    }

    return {
      role,
      status,
      records,
      organizers: role === 'organizer' ? records : [],
      sponsors: role === 'sponsor' ? records : [],
      attendees: role === 'attendee' ? records : [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      counts: {
        pending: role === 'organizer' ? (sc.org_pending || 0) : role === 'sponsor' ? (sc.sponsor_pending || 0) : 0,
        approved: role === 'organizer' ? (sc.org_approved || 0) : role === 'sponsor' ? (sc.sponsor_approved || 0) : (sc.attendee_total || 0),
        rejected: role === 'organizer' ? (sc.org_rejected || 0) : role === 'sponsor' ? (sc.sponsor_rejected || 0) : 0,
        more_info_needed: role === 'organizer' ? (sc.org_more_info_needed || 0) : 0,
        total: role === 'organizer' ? (sc.org_total || 0) : role === 'sponsor' ? (sc.sponsor_total || 0) : (sc.attendee_total || 0),
      },
      summary: {
        organizersTotal: sc.org_total || 0,
        organizersPending: sc.org_pending || 0,
        organizersApproved: sc.org_approved || 0,
        organizersRejected: sc.org_rejected || 0,
        sponsorsTotal: sc.sponsor_total || 0,
        sponsorsPending: sc.sponsor_pending || 0,
        sponsorsApproved: sc.sponsor_approved || 0,
        sponsorsRejected: sc.sponsor_rejected || 0,
        attendeesTotal: sc.attendee_total || 0,
      },
    };
  }

  static async approveOrganizer(userId: string) {
    const res = await query(
      `UPDATE users
       SET role = 'organizer',
           approval_status = 'approved',
           organizer_approval_status = 'approved',
           is_organizer = TRUE,
           is_active = TRUE,
           organizer_rejection_reason = NULL,
           organizer_info_requested_notes = NULL,
           updated_at = NOW()
       WHERE id = $1 AND (role = 'organizer' OR is_organizer = TRUE OR organizer_approval_status IS NOT NULL)
       RETURNING id, full_name, email, role, organization, is_active, approval_status, is_organizer, organizer_approval_status`,
      [userId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Organizer account not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = res.rows[0];
    try {
      await EmailService.sendOrganizerApprovalEmail(
        user.email,
        user.full_name,
        user.organization || user.full_name
      );
    } catch (e) {
      console.warn('Failed to dispatch organizer approval email:', e);
    }

    await CacheService.del('admin:dashboard:metrics');
    await CacheService.delPattern('*http:*/api/admin*');

    await AuditService.logAction({
      action: 'ORGANIZER_APPROVED',
      category: 'ORGANIZER_SPONSOR',
      entityType: 'user',
      entityId: userId,
      entityTitle: user.organization || user.full_name,
      details: `Organizer application approved for ${user.full_name} (${user.email})`,
      metadata: { role: 'organizer', email: user.email, organization: user.organization },
    });

    return user;
  }

  static async rejectOrganizer(userId: string, reason?: string) {
    const res = await query(
      `UPDATE users
       SET approval_status = 'rejected',
           organizer_approval_status = 'rejected',
           role = 'attendee',
           is_organizer = FALSE,
           is_active = TRUE,
           organizer_rejection_reason = COALESCE($2, organizer_rejection_reason),
           updated_at = NOW()
       WHERE id = $1 AND (role = 'organizer' OR is_organizer = TRUE OR organizer_approval_status IS NOT NULL)
       RETURNING id, full_name, email, role, organization, is_active, approval_status, is_organizer, organizer_approval_status, organizer_rejection_reason`,
      [userId, reason ? reason.trim() : null]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Organizer account not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = res.rows[0];
    try {
      await EmailService.sendOrganizerRejectionEmail(
        user.email,
        user.full_name,
        user.organization || user.full_name,
        reason
      );
    } catch (e) {
      console.warn('Failed to dispatch organizer rejection email:', e);
    }

    await CacheService.del('admin:dashboard:metrics');
    await CacheService.delPattern('*http:*/api/admin*');

    await AuditService.logAction({
      action: 'ORGANIZER_REJECTED',
      category: 'ORGANIZER_SPONSOR',
      entityType: 'user',
      entityId: userId,
      entityTitle: user.organization || user.full_name,
      details: reason ? `Organizer application rejected: ${reason}` : 'Organizer application rejected',
      metadata: { email: user.email, reason },
    });

    return user;
  }

  static async requestOrganizerInfo(userId: string, notes: string) {
    if (!notes || !notes.trim()) {
      const err: any = new Error('Please specify the additional information requested.');
      err.statusCode = 400;
      throw err;
    }

    const res = await query(
      `UPDATE users
       SET organizer_approval_status = 'more_info_needed',
           is_organizer = FALSE,
           organizer_info_requested_notes = $2,
           updated_at = NOW()
       WHERE id = $1 AND (role = 'organizer' OR is_organizer = TRUE OR organizer_approval_status IS NOT NULL)
       RETURNING id, full_name, email, role, organization, is_active, approval_status, is_organizer, organizer_approval_status, organizer_info_requested_notes`,
      [userId, notes.trim()]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Organizer account not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = res.rows[0];
    const actionToken = signAuthToken(
      {
        userId: user.id,
        email: user.email,
        role: 'attendee',
        fullName: user.full_name,
      },
      { expiresIn: ENV.ACTION_TOKEN_EXPIRES_IN as any }
    );

    try {
      await EmailService.sendOrganizerInfoRequestedEmail(
        user.email,
        user.full_name,
        user.organization || user.full_name,
        notes.trim(),
        actionToken
      );
    } catch (e) {
      console.warn('Failed to dispatch organizer info requested email:', e);
    }

    await CacheService.del('admin:dashboard:metrics');
    await CacheService.delPattern('*http:*/api/admin*');

    await AuditService.logAction({
      action: 'ORGANIZER_INFO_REQUESTED',
      category: 'ORGANIZER_SPONSOR',
      entityType: 'user',
      entityId: userId,
      entityTitle: user.organization || user.full_name,
      details: `Additional information requested: ${notes.trim()}`,
      metadata: { email: user.email, notes: notes.trim() },
    });

    return user;
  }

  static async getOrganizerDetails(userId: string) {
    const res = await query(
      `SELECT id, full_name, email, phone, organization, role, is_active, approval_status,
              is_organizer, organizer_approval_status, created_at,
              applicant_type, organization_type, applicant_position, organization_description,
              organization_website, organization_logo, organizer_rejection_reason,
              organizer_info_requested_notes, organizer_applied_at, bio, organizer_bio, avatar_url
       FROM users
       WHERE id = $1 AND (role = 'organizer' OR is_organizer = TRUE OR organizer_approval_status IS NOT NULL) AND deleted_at IS NULL`,
      [userId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Organizer record not found.');
      err.statusCode = 404;
      throw err;
    }

    const o = res.rows[0];
    const effApproval = (o.organizer_approval_status && o.organizer_approval_status !== 'none')
      ? o.organizer_approval_status
      : (o.approval_status || 'pending');

    const isIndividual = (o.applicant_type || '').toLowerCase().includes('individual') || (!o.applicant_type && !o.organization);
    const applicantType = isIndividual ? 'Individual Organizer' : 'Organization / Institution';

    return {
      id: o.id,
      name: o.full_name,
      email: o.email,
      phone: o.phone || '',
      applicantType,
      organization: o.organization || o.full_name,
      organizationType: o.organization_type || '',
      applicantPosition: o.applicant_position || '',
      organizationDescription: o.organization_description || o.organizer_bio || '',
      organizationWebsite: o.organization_website || '',
      organizationLogo: o.organization_logo || '',
      personalIntroduction: o.bio || o.organizer_bio || '',
      bio: o.bio || o.organizer_bio || '',
      status: effApproval === 'pending'
        ? 'Pending Approval'
        : effApproval === 'more_info_needed'
        ? 'More Info Needed'
        : effApproval === 'approved'
        ? 'Active'
        : 'Rejected',
      approvalStatus: effApproval,
      isActive: effApproval === 'approved',
      rejectionReason: o.organizer_rejection_reason || '',
      infoRequestedNotes: o.organizer_info_requested_notes || '',
      appliedAt: o.organizer_applied_at || o.created_at,
      registeredAt: o.created_at,
    };
  }

  static async approveSponsor(userId: string) {
    const res = await query(
      `UPDATE users
       SET approval_status = 'approved',
           is_active = TRUE,
           updated_at = NOW()
       WHERE id = $1 AND role = 'sponsor'
       RETURNING id, full_name, email, role, company_name, organization, is_active, approval_status`,
      [userId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Sponsor account not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = res.rows[0];
    try {
      await EmailService.sendSponsorApprovalEmail(
        user.email,
        user.full_name,
        user.company_name || user.organization || 'Corporate Partner'
      );
    } catch (e) {
      console.warn('Failed to dispatch sponsor approval email:', e);
    }

    await CacheService.del('admin:dashboard:metrics');
    await CacheService.delPattern('*http:*/api/admin*');

    await AuditService.logAction({
      action: 'SPONSOR_APPROVED',
      category: 'ORGANIZER_SPONSOR',
      entityType: 'user',
      entityId: userId,
      entityTitle: user.company_name || user.organization || user.full_name,
      details: `Corporate sponsor approved: ${user.company_name || user.full_name} (${user.email})`,
      metadata: { role: 'sponsor', email: user.email, companyName: user.company_name },
    });

    return user;
  }

  static async rejectSponsor(userId: string) {
    const res = await query(
      `UPDATE users
       SET approval_status = 'rejected',
           is_active = FALSE,
           updated_at = NOW()
       WHERE id = $1 AND role = 'sponsor'
       RETURNING id, full_name, email, role, company_name, organization, is_active, approval_status`,
      [userId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Sponsor account not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = res.rows[0];
    try {
      await EmailService.sendSponsorRejectionEmail(
        user.email,
        user.full_name,
        user.company_name || user.organization || 'Corporate Partner'
      );
    } catch (e) {
      console.warn('Failed to dispatch sponsor rejection email:', e);
    }

    await CacheService.del('admin:dashboard:metrics');
    await CacheService.delPattern('*http:*/api/admin*');

    await AuditService.logAction({
      action: 'SPONSOR_REJECTED',
      category: 'ORGANIZER_SPONSOR',
      entityType: 'user',
      entityId: userId,
      entityTitle: user.company_name || user.organization || user.full_name,
      details: `Corporate sponsor application rejected for ${user.company_name || user.full_name}`,
      metadata: { role: 'sponsor', email: user.email, companyName: user.company_name },
    });

    return user;
  }

  static async getSponsorDetails(sponsorId: string) {
    const res = await query(
      `SELECT 
        u.id, u.full_name, u.email, u.phone, u.company_name, u.industry_category,
        u.company_phone, u.company_website, u.bio, u.avatar_url,
        u.sponsor_preferences, u.organization, u.role, u.is_active,
        u.approval_status, u.created_at, u.updated_at
       FROM users u
       WHERE u.id = $1 AND u.role = 'sponsor' AND u.deleted_at IS NULL`,
      [sponsorId]
    );

    if (!res.rows || res.rows.length === 0) {
      const err: any = new Error('Sponsor account not found.');
      err.statusCode = 404;
      throw err;
    }

    const s = res.rows[0];
    return {
      id: s.id,
      name: s.full_name,
      email: s.email,
      phone: s.phone || '',
      companyName: s.company_name || s.organization || 'Corporate Partner',
      industryCategory: s.industry_category || 'Technology',
      companyPhone: s.company_phone || s.phone || '',
      website: s.company_website || '',
      companyWebsite: s.company_website || '',
      bio: s.bio || '',
      avatarUrl: s.avatar_url || '',
      sponsorPreferences: s.sponsor_preferences || {},
      status: s.approval_status === 'pending'
        ? 'Pending Approval'
        : s.approval_status === 'approved'
        ? 'Active'
        : 'Rejected',
      approvalStatus: s.approval_status,
      isActive: s.approval_status === 'approved',
      registeredAt: s.created_at,
      updatedAt: s.updated_at,
    };
  }

  static async toggleUserStatus(userId: string) {
    const res = await query(
      `UPDATE users
       SET is_active = NOT is_active,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name, email, is_active, approval_status`,
      [userId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    await CacheService.del('admin:dashboard:metrics');
    await CacheService.delPattern('*http:*/api/admin*');

    const updatedUser = res.rows[0];
    await AuditService.logAction({
      action: updatedUser.is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      category: 'USER_MANAGEMENT',
      entityType: 'user',
      entityId: userId,
      entityTitle: updatedUser.full_name,
      details: `User account ${updatedUser.is_active ? 'activated' : 'deactivated'} by administrator (${updatedUser.email})`,
      metadata: { email: updatedUser.email, isActive: updatedUser.is_active },
    });

    return updatedUser;
  }

  static async getPaymentIssues() {
    const res = await query(`
      SELECT 
        p.*,
        e.title AS event_title,
        u.email AS attendee_email
      FROM payments p
      JOIN events e ON p.event_id = e.id
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    return res.rows.map((p) => ({
      id: p.id,
      transactionId: p.transaction_id,
      eventTitle: p.event_title,
      attendeeEmail: p.attendee_email,
      amount: parseFloat(p.amount),
      commissionAmount: parseFloat(p.commission_amount),
      organizerPayout: parseFloat(p.organizer_payout),
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
    }));
  }


  /**
   * Admin fetches formal sponsorship applications with filters & pagination (Stage 2)
   */
  static async getSponsorshipApplications(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM sponsorship_deals sd
      JOIN sponsorship_applications sa ON sd.application_id = sa.id
      JOIN users u_sponsor ON sd.sponsor_id = u_sponsor.id
      JOIN users u_org ON sa.organizer_id = u_org.id
      LEFT JOIN users u_rev ON sd.reviewed_by = u_rev.id
      WHERE sd.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.status) {
      baseSql += ` AND sd.status = $${paramIdx++}`;
      params.push(filters.status.toUpperCase());
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      baseSql += ` AND (
        LOWER(sa.event_title) LIKE $${paramIdx} OR
        LOWER(u_sponsor.company_name) LIKE $${paramIdx} OR
        LOWER(u_sponsor.full_name) LIKE $${paramIdx} OR
        LOWER(u_sponsor.email) LIKE $${paramIdx} OR
        LOWER(u_org.organization) LIKE $${paramIdx} OR
        LOWER(u_org.full_name) LIKE $${paramIdx}
      )`;
      params.push(term);
      paramIdx++;
    }

    const countRes = await query(`SELECT COUNT(*)::INT AS total ${baseSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    const selectSql = `
      SELECT 
        sd.id,
        sd.application_id,
        sd.sponsor_id,
        sd.status,
        sd.package_name,
        sd.pledged_amount,
        sd.proposal_message,
        sd.rejection_reason,
        sd.reviewed_by,
        sd.reviewed_at,
        sd.created_at,
        sd.updated_at,
        sa.event_title,
        sa.event_type,
        sa.category,
        sa.expected_date,
        sa.location,
        sa.funding_goal,
        sa.currency,
        sa.packages,
        u_sponsor.full_name AS sponsor_representative,
        u_sponsor.email AS sponsor_email,
        u_sponsor.phone AS sponsor_phone,
        u_sponsor.company_name,
        u_sponsor.company_phone,
        u_sponsor.company_website,
        u_sponsor.industry_category,
        u_sponsor.avatar_url AS sponsor_logo,
        u_org.full_name AS organizer_name,
        u_org.organization AS organizer_organization,
        u_org.email AS organizer_email,
        u_rev.full_name AS reviewer_name,
        u_rev.email AS reviewer_email
      ${baseSql}
      ORDER BY 
        CASE WHEN sd.status = 'PENDING' THEN 0 ELSE 1 END,
        sd.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const dataRes = await query(selectSql, [...params, limit, offset]);

    return {
      applications: dataRes.rows.map((row) => ({
        id: row.id,
        applicationId: row.application_id,
        sponsorId: row.sponsor_id,
        status: row.status,
        packageName: row.package_name,
        pledgedAmount: row.pledged_amount ? Number(row.pledged_amount) : 0,
        proposalMessage: row.proposal_message,
        rejectionReason: row.rejection_reason,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reviewer: row.reviewed_by ? {
          id: row.reviewed_by,
          name: row.reviewer_name,
          email: row.reviewer_email,
        } : null,
        pitch: {
          id: row.application_id,
          eventTitle: row.event_title,
          eventType: row.event_type,
          category: row.category,
          expectedDate: row.expected_date,
          location: row.location,
          fundingGoal: row.funding_goal ? Number(row.funding_goal) : 0,
          currency: row.currency,
          packages: row.packages,
        },
        sponsor: {
          id: row.sponsor_id,
          representative: row.sponsor_representative,
          email: row.sponsor_email,
          phone: row.company_phone || row.sponsor_phone,
          companyName: row.company_name || row.sponsor_representative,
          companyWebsite: row.company_website,
          industryCategory: row.industry_category,
          logo: row.sponsor_logo,
        },
        organizer: {
          name: row.organizer_name,
          organization: row.organizer_organization || row.organizer_name,
          email: row.organizer_email,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin fetches single formal sponsorship application with full details and history
   */
  static async getSponsorshipApplicationDetail(dealId: string) {
    const res = await query(
      `SELECT 
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
        sa.description AS pitch_description,
        sa.packages,
        sa.contact_name AS pitch_contact_name,
        sa.contact_email AS pitch_contact_email,
        sa.contact_phone AS pitch_contact_phone,
        sa.pitch_deck_url,
        sa.organizer_id,
        u_sponsor.full_name AS sponsor_representative,
        u_sponsor.email AS sponsor_email,
        u_sponsor.phone AS sponsor_phone,
        u_sponsor.company_name,
        u_sponsor.company_phone,
        u_sponsor.company_website,
        u_sponsor.bio AS company_description,
        u_sponsor.industry_category,
        u_sponsor.avatar_url AS sponsor_logo,
        u_sponsor.sponsor_preferences,
        u_org.full_name AS organizer_name,
        u_org.organization AS organizer_organization,
        u_org.email AS organizer_email,
        u_rev.full_name AS reviewer_name,
        u_rev.email AS reviewer_email
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       JOIN users u_sponsor ON sd.sponsor_id = u_sponsor.id
       JOIN users u_org ON sa.organizer_id = u_org.id
       LEFT JOIN users u_rev ON sd.reviewed_by = u_rev.id
       WHERE sd.id = $1 AND sd.deleted_at IS NULL`,
      [dealId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Sponsorship application not found.');
      err.statusCode = 404;
      throw err;
    }

    const row = res.rows[0];

    // Query previous submission attempts by this sponsor for this pitch
    const historyRes = await query(
      `SELECT id, status, package_name, pledged_amount, proposal_message, rejection_reason, reviewed_at, created_at
       FROM sponsorship_deals
       WHERE application_id = $1 AND sponsor_id = $2 AND id != $3
       ORDER BY created_at DESC`,
      [row.application_id, row.sponsor_id, dealId]
    );

    return {
      id: row.id,
      applicationId: row.application_id,
      sponsorId: row.sponsor_id,
      status: row.status,
      packageName: row.package_name,
      pledgedAmount: row.pledged_amount ? Number(row.pledged_amount) : 0,
      proposalMessage: row.proposal_message,
      rejectionReason: row.rejection_reason,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewer: row.reviewed_by ? {
        id: row.reviewed_by,
        name: row.reviewer_name,
        email: row.reviewer_email,
      } : null,
      pitch: {
        id: row.application_id,
        eventTitle: row.event_title,
        eventType: row.event_type,
        category: row.category,
        expectedDate: row.expected_date,
        location: row.location,
        expectedAttendees: row.expected_attendees,
        targetAudience: row.target_audience,
        fundingGoal: row.funding_goal ? Number(row.funding_goal) : 0,
        currency: row.currency,
        description: row.pitch_description,
        packages: row.packages,
        contactName: row.pitch_contact_name,
        contactEmail: row.pitch_contact_email,
        contactPhone: row.pitch_contact_phone,
        pitchDeckUrl: row.pitch_deck_url,
      },
      sponsor: {
        id: row.sponsor_id,
        representative: row.sponsor_representative,
        email: row.sponsor_email,
        phone: row.company_phone || row.sponsor_phone,
        companyName: row.company_name || row.sponsor_representative,
        companyWebsite: row.company_website,
        companyDescription: row.company_description,
        industryCategory: row.industry_category,
        logo: row.sponsor_logo,
        preferences: row.sponsor_preferences,
      },
      organizer: {
        id: row.organizer_id,
        name: row.organizer_name,
        organization: row.organizer_organization || row.organizer_name,
        email: row.organizer_email,
      },
      previousAttempts: historyRes.rows.map((h) => ({
        id: h.id,
        status: h.status,
        packageName: h.package_name,
        pledgedAmount: h.pledged_amount ? Number(h.pledged_amount) : 0,
        proposalMessage: h.proposal_message,
        rejectionReason: h.rejection_reason,
        reviewedAt: h.reviewed_at,
        createdAt: h.created_at,
      })),
    };
  }

  /**
   * Admin approves sponsorship application (Atomic with concurrency guard)
   */
  static async approveSponsorshipApplication(dealId: string, adminId: string, notes?: string) {
    // 1. Conditional atomic update: only PENDING applications can be approved
    const updateRes = await query(
      `UPDATE sponsorship_deals 
       SET status = 'APPROVED',
           reviewed_by = $1,
           reviewed_at = NOW(),
           sponsor_notes = COALESCE($2, sponsor_notes),
           updated_at = NOW()
       WHERE id = $3 AND status = 'PENDING' AND deleted_at IS NULL
       RETURNING *`,
      [adminId, notes || null, dealId]
    );

    if (!updateRes.rowCount || updateRes.rowCount === 0) {
      // Check why update matched 0 rows
      const checkRes = await query('SELECT id, status, deleted_at FROM sponsorship_deals WHERE id = $1', [dealId]);
      if (!checkRes.rowCount || checkRes.rowCount === 0 || checkRes.rows[0].deleted_at) {
        const err: any = new Error('Sponsorship application not found.');
        err.statusCode = 404;
        throw err;
      }
      const currentStatus = checkRes.rows[0].status;
      const err: any = new Error(`Application cannot be approved. It has already been reviewed (current status: ${currentStatus}).`);
      err.statusCode = 409;
      throw err;
    }

    const deal = updateRes.rows[0];

    // 2. Fetch sponsor, pitch, and organizer details for email dispatch
    const metaRes = await query(
      `SELECT 
        sa.event_title,
        u_sponsor.email AS sponsor_email,
        u_sponsor.full_name AS sponsor_name,
        u_sponsor.company_name,
        u_sponsor.phone AS sponsor_phone,
        u_sponsor.company_phone,
        u_org.email AS organizer_email,
        u_org.full_name AS organizer_name,
        u_org.organization AS organizer_organization
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       JOIN users u_sponsor ON sd.sponsor_id = u_sponsor.id
       JOIN users u_org ON sa.organizer_id = u_org.id
       WHERE sd.id = $1`,
      [dealId]
    );

    if (metaRes.rowCount && metaRes.rowCount > 0) {
      const meta = metaRes.rows[0];

      // Dispatch approval emails safely (failure won't roll back approval)
      try {
        await EmailService.sendSponsorshipApplicationApprovedEmail(
          meta.sponsor_email,
          meta.sponsor_name,
          meta.company_name || meta.sponsor_name,
          meta.event_title,
          deal.package_name,
          deal.pledged_amount ? Number(deal.pledged_amount) : undefined,
          meta.organizer_name,
          meta.organizer_organization
        );
      } catch (err) {
        console.warn('Failed to send sponsor application approval email:', err);
      }

      try {
        await EmailService.sendOrganizerSponsorApprovedNotificationEmail(
          meta.organizer_email,
          meta.organizer_name,
          meta.event_title,
          meta.company_name || meta.sponsor_name,
          meta.sponsor_name,
          meta.sponsor_email,
          meta.company_phone || meta.sponsor_phone,
          deal.package_name,
          deal.pledged_amount ? Number(deal.pledged_amount) : undefined,
          deal.proposal_message
        );
      } catch (err) {
        console.warn('Failed to send organizer sponsor notification email:', err);
      }
    }

    // 3. Invalidate caches
    await CacheService.delPattern('sponsorship:*');
    await CacheService.delPattern('admin:sponsorship*');

    return deal;
  }

  /**
   * Admin rejects sponsorship application (Atomic with concurrency guard)
   */
  static async rejectSponsorshipApplication(dealId: string, adminId: string, rejectionReason: string) {
    if (!rejectionReason || !rejectionReason.trim() || rejectionReason.trim().length < 5) {
      const err: any = new Error('A rejection reason of at least 5 characters is required.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Conditional atomic update: only PENDING applications can be rejected
    const updateRes = await query(
      `UPDATE sponsorship_deals 
       SET status = 'REJECTED',
           rejection_reason = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 AND status = 'PENDING' AND deleted_at IS NULL
       RETURNING *`,
      [rejectionReason.trim(), adminId, dealId]
    );

    if (!updateRes.rowCount || updateRes.rowCount === 0) {
      const checkRes = await query('SELECT id, status, deleted_at FROM sponsorship_deals WHERE id = $1', [dealId]);
      if (!checkRes.rowCount || checkRes.rowCount === 0 || checkRes.rows[0].deleted_at) {
        const err: any = new Error('Sponsorship application not found.');
        err.statusCode = 404;
        throw err;
      }
      const currentStatus = checkRes.rows[0].status;
      const err: any = new Error(`Application cannot be rejected. It has already been reviewed (current status: ${currentStatus}).`);
      err.statusCode = 409;
      throw err;
    }

    const deal = updateRes.rows[0];

    // 2. Fetch sponsor and pitch metadata for notification
    const metaRes = await query(
      `SELECT 
        sa.event_title,
        u_sponsor.email AS sponsor_email,
        u_sponsor.full_name AS sponsor_name,
        u_sponsor.company_name
       FROM sponsorship_deals sd
       JOIN sponsorship_applications sa ON sd.application_id = sa.id
       JOIN users u_sponsor ON sd.sponsor_id = u_sponsor.id
       WHERE sd.id = $1`,
      [dealId]
    );

    if (metaRes.rowCount && metaRes.rowCount > 0) {
      const meta = metaRes.rows[0];
      try {
        await EmailService.sendSponsorshipApplicationRejectedEmail(
          meta.sponsor_email,
          meta.sponsor_name,
          meta.company_name || meta.sponsor_name,
          meta.event_title,
          deal.package_name,
          rejectionReason.trim()
        );
      } catch (err) {
        console.warn('Failed to send sponsor application rejection email:', err);
      }
    }

    // 3. Invalidate caches
    await CacheService.delPattern('sponsorship:*');
    await CacheService.delPattern('admin:sponsorship*');

    return deal;
  }

  // =========================================================================
  // CONTENT MODERATION SUITE (Publicized Events & Organizer Sponsorship Pitches)
  // =========================================================================

  /**
   * Admin fetches publicized and moderated events with oversight metrics
   */
  static async getPublicizedEventsForModeration(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 30));
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.status === 'PUBLICIZED') {
      baseSql += ` AND e.is_publicized = TRUE`;
    } else if (filters?.status === 'MODERATED') {
      baseSql += ` AND e.is_publicity_moderated = TRUE`;
    } else if (filters?.status === 'DIRECT_LINK_ONLY') {
      baseSql += ` AND e.is_publicized = FALSE AND e.is_publicity_moderated = FALSE`;
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      baseSql += ` AND (
        LOWER(e.title) LIKE $${paramIdx} OR
        LOWER(e.location) LIKE $${paramIdx} OR
        LOWER(e.description) LIKE $${paramIdx} OR
        LOWER(u.full_name) LIKE $${paramIdx} OR
        LOWER(u.email) LIKE $${paramIdx} OR
        LOWER(u.organization) LIKE $${paramIdx}
      )`;
      params.push(term);
      paramIdx++;
    }

    const countRes = await query(`SELECT COUNT(*)::INT AS total ${baseSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    const selectSql = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.category,
        e.event_date,
        e.time_str,
        e.location,
        e.venue_name,
        e.capacity,
        e.status,
        e.is_paid,
        e.ticket_price,
        e.currency,
        e.share_link_token,
        e.banner_url,
        e.poster_image_url,
        e.is_publicized,
        e.is_publicity_moderated,
        e.publicity_takedown_reason,
        e.publicity_moderated_at,
        e.created_at,
        u.id AS organizer_id,
        u.full_name AS organizer_name,
        u.email AS organizer_email,
        u.phone AS organizer_phone,
        u.organization AS organizer_organization,
        u.avatar_url AS organizer_avatar,
        COALESCE((SELECT COUNT(*)::INT FROM registrations r WHERE r.event_id = e.id AND r.deleted_at IS NULL), 0) AS registered_count,
        COALESCE((SELECT COUNT(*)::INT FROM check_ins ci WHERE ci.event_id = e.id AND ci.voided_at IS NULL), 0) AS checked_in_count
      ${baseSql}
      ORDER BY e.is_publicity_moderated DESC, e.is_publicized DESC, e.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(limit, offset);
    const listRes = await query(selectSql, params);

    return {
      events: listRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Take down an event from Public Discovery (Sheeba Community feed)
   */
  static async takedownEventPublicity(params: {
    eventId: string;
    adminId: string;
    reason: string;
  }) {
    const { eventId, adminId, reason } = params;
    if (!reason || reason.trim().length < 5) {
      const err: any = new Error('A detailed reason (at least 5 characters) is required for content takedown.');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        `SELECT e.id, e.title, e.organizer_id, u.email, u.full_name 
         FROM events e 
         JOIN users u ON e.organizer_id = u.id 
         WHERE e.id = $1 AND e.deleted_at IS NULL 
         FOR UPDATE OF e`,
        [eventId]
      );

      if (!checkRes.rowCount || checkRes.rowCount === 0) {
        const err: any = new Error('Event not found or has been deleted.');
        err.statusCode = 404;
        throw err;
      }

      const event = checkRes.rows[0];

      // Update event publicity state without affecting registrations or tickets
      const updateRes = await client.query(
        `UPDATE events 
         SET is_publicized = FALSE, 
             is_publicity_moderated = TRUE, 
             publicity_takedown_reason = $2, 
             publicity_moderated_at = NOW(), 
             publicity_moderated_by = $3, 
             updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [eventId, reason.trim(), adminId]
      );

      // Insert immutable moderation audit record
      await client.query(
        `INSERT INTO content_moderation_logs (
          content_type, content_id, action, reason, performed_by, content_title, metadata
        ) VALUES ('publicized_event', $1, 'takedown', $2, $3, $4, $5)`,
        [
          eventId,
          reason.trim(),
          adminId,
          event.title,
          JSON.stringify({ organizer_id: event.organizer_id, organizer_email: event.email }),
        ]
      );

      await client.query('COMMIT');

      // Invalidate event caches
      await CacheService.delPattern('events:*');

      await AuditService.logAction({
        action: 'MODERATION_TAKEDOWN',
        category: 'MODERATION',
        entityType: 'publicized_event',
        entityId: eventId,
        entityTitle: event.title,
        performedBy: adminId,
        details: reason.trim(),
        metadata: { organizer_id: event.organizer_id, organizer_email: event.email },
      });

      // Dispatch notification email
      try {
        await EmailService.sendEventPublicityTakedownNotificationEmail({
          toEmail: event.email,
          organizerName: event.full_name,
          eventTitle: event.title,
          reason: reason.trim(),
        });
      } catch (mailErr) {
        console.warn('Failed to dispatch publicity takedown email:', mailErr);
      }

      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Restore an event to Public Discovery
   */
  static async restoreEventPublicity(params: {
    eventId: string;
    adminId: string;
    reason?: string;
  }) {
    const { eventId, adminId, reason } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        `SELECT e.id, e.title, e.organizer_id 
         FROM events e 
         WHERE e.id = $1 AND e.deleted_at IS NULL 
         FOR UPDATE`,
        [eventId]
      );

      if (!checkRes.rowCount || checkRes.rowCount === 0) {
        const err: any = new Error('Event not found.');
        err.statusCode = 404;
        throw err;
      }

      const event = checkRes.rows[0];

      const updateRes = await client.query(
        `UPDATE events 
         SET is_publicized = TRUE, 
             is_publicity_moderated = FALSE, 
             publicity_takedown_reason = NULL, 
             publicity_moderated_at = NULL, 
             publicity_moderated_by = NULL, 
             updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [eventId]
      );

      await client.query(
        `INSERT INTO content_moderation_logs (
          content_type, content_id, action, reason, performed_by, content_title, metadata
        ) VALUES ('publicized_event', $1, 'restore', $2, $3, $4, $5)`,
        [
          eventId,
          reason?.trim() || 'Restored to Public Discovery by Administrator',
          adminId,
          event.title,
          JSON.stringify({ restored_at: new Date().toISOString() }),
        ]
      );

      await client.query('COMMIT');

      await CacheService.delPattern('events:*');

      await AuditService.logAction({
        action: 'MODERATION_RESTORE',
        category: 'MODERATION',
        entityType: 'publicized_event',
        entityId: eventId,
        entityTitle: event.title,
        performedBy: adminId,
        details: reason?.trim() || 'Restored to Public Discovery by Administrator',
        metadata: { restored_at: new Date().toISOString() },
      });

      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Admin fetches organizer sponsorship pitches with comprehensive details & metrics
   */
  static async getOrganizerPitchesForModeration(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 30));
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM sponsorship_applications sa
      JOIN users u ON sa.organizer_id = u.id
      WHERE sa.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.status === 'TAKEN_DOWN') {
      baseSql += ` AND sa.is_taken_down = TRUE`;
    } else if (filters?.status === 'ACTIVE' || filters?.status === 'OPEN') {
      baseSql += ` AND (sa.is_taken_down IS NULL OR sa.is_taken_down = FALSE) AND sa.status != 'CLOSED'`;
    } else if (filters?.status === 'CLOSED') {
      baseSql += ` AND sa.status = 'CLOSED'`;
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      baseSql += ` AND (
        LOWER(sa.event_title) LIKE $${paramIdx} OR
        LOWER(sa.location) LIKE $${paramIdx} OR
        LOWER(sa.description) LIKE $${paramIdx} OR
        LOWER(u.full_name) LIKE $${paramIdx} OR
        LOWER(u.email) LIKE $${paramIdx} OR
        LOWER(u.organization) LIKE $${paramIdx}
      )`;
      params.push(term);
      paramIdx++;
    }

    const countRes = await query(`SELECT COUNT(*)::INT AS total ${baseSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    const selectSql = `
      SELECT 
        sa.id,
        sa.organizer_id,
        sa.event_title,
        sa.event_type,
        sa.category,
        sa.expected_date,
        sa.location,
        sa.expected_attendees,
        sa.target_audience,
        sa.funding_goal,
        sa.currency,
        sa.description,
        sa.packages,
        sa.contact_name,
        sa.contact_phone,
        sa.contact_email,
        sa.contact_telegram,
        sa.pitch_deck_url,
        sa.socials,
        sa.affiliations,
        sa.status,
        sa.is_taken_down,
        sa.takedown_reason,
        sa.taken_down_at,
        sa.taken_down_by,
        sa.created_at,
        sa.updated_at,
        u.full_name AS organizer_name,
        u.email AS organizer_email,
        u.phone AS organizer_phone,
        u.organization AS organizer_organization,
        u.avatar_url AS organizer_avatar,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.deleted_at IS NULL
        ), 0) AS deals_count,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM sponsorship_deals sd 
          WHERE sd.application_id = sa.id AND sd.status = 'APPROVED' AND sd.deleted_at IS NULL
        ), 0) AS approved_deals_count
      ${baseSql}
      ORDER BY sa.is_taken_down DESC, sa.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(limit, offset);
    const listRes = await query(selectSql, params);

    return {
      pitches: listRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Take down an organizer sponsorship pitch due to Code of Conduct / policy violation
   * Preserves existing confirmed deals, applications, and payments without modification.
   */
  static async takedownOrganizerPitch(params: {
    pitchId: string;
    adminId: string;
    reason: string;
  }) {
    const { pitchId, adminId, reason } = params;
    if (!reason || reason.trim().length < 5) {
      const err: any = new Error('A detailed reason (at least 5 characters) is required for content takedown.');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        `SELECT sa.id, sa.event_title, sa.organizer_id, u.email, u.full_name 
         FROM sponsorship_applications sa 
         JOIN users u ON sa.organizer_id = u.id 
         WHERE sa.id = $1 AND sa.deleted_at IS NULL 
         FOR UPDATE OF sa`,
        [pitchId]
      );

      if (!checkRes.rowCount || checkRes.rowCount === 0) {
        const err: any = new Error('Sponsorship pitch not found or has been deleted.');
        err.statusCode = 404;
        throw err;
      }

      const pitch = checkRes.rows[0];

      // Mark pitch as taken down with reason; preserve existing deals
      const updateRes = await client.query(
        `UPDATE sponsorship_applications 
         SET is_taken_down = TRUE, 
             takedown_reason = $2, 
             taken_down_at = NOW(), 
             taken_down_by = $3, 
             updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [pitchId, reason.trim(), adminId]
      );

      // Record immutable audit history
      await client.query(
        `INSERT INTO content_moderation_logs (
          content_type, content_id, action, reason, performed_by, content_title, metadata
        ) VALUES ('sponsorship_pitch', $1, 'takedown', $2, $3, $4, $5)`,
        [
          pitchId,
          reason.trim(),
          adminId,
          pitch.event_title,
          JSON.stringify({ organizer_id: pitch.organizer_id, organizer_email: pitch.email }),
        ]
      );

      await client.query('COMMIT');

      // Purge sponsorship marketplace caches
      await CacheService.delPattern('sponsorship:*');

      await AuditService.logAction({
        action: 'MODERATION_TAKEDOWN',
        category: 'MODERATION',
        entityType: 'sponsorship_pitch',
        entityId: pitchId,
        entityTitle: pitch.event_title,
        performedBy: adminId,
        details: reason.trim(),
        metadata: { organizer_id: pitch.organizer_id, organizer_email: pitch.email },
      });

      // Dispatch notification email
      try {
        await EmailService.sendPitchTakedownNotificationEmail({
          toEmail: pitch.email,
          organizerName: pitch.full_name,
          eventTitle: pitch.event_title,
          reason: reason.trim(),
        });
      } catch (mailErr) {
        console.warn('Failed to dispatch pitch takedown email:', mailErr);
      }

      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Restore a previously taken-down sponsorship pitch
   */
  static async restoreOrganizerPitch(params: {
    pitchId: string;
    adminId: string;
    reason?: string;
  }) {
    const { pitchId, adminId, reason } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        `SELECT sa.id, sa.event_title, sa.organizer_id 
         FROM sponsorship_applications sa 
         WHERE sa.id = $1 AND sa.deleted_at IS NULL 
         FOR UPDATE`,
        [pitchId]
      );

      if (!checkRes.rowCount || checkRes.rowCount === 0) {
        const err: any = new Error('Sponsorship pitch not found.');
        err.statusCode = 404;
        throw err;
      }

      const pitch = checkRes.rows[0];

      const updateRes = await client.query(
        `UPDATE sponsorship_applications 
         SET is_taken_down = FALSE, 
             takedown_reason = NULL, 
             taken_down_at = NULL, 
             taken_down_by = NULL, 
             updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [pitchId]
      );

      await client.query(
        `INSERT INTO content_moderation_logs (
          content_type, content_id, action, reason, performed_by, content_title, metadata
        ) VALUES ('sponsorship_pitch', $1, 'restore', $2, $3, $4, $5)`,
        [
          pitchId,
          reason?.trim() || 'Pitch reinstated by Administrator',
          adminId,
          pitch.event_title,
          JSON.stringify({ restored_at: new Date().toISOString() }),
        ]
      );

      await client.query('COMMIT');

      await CacheService.delPattern('sponsorship:*');

      await AuditService.logAction({
        action: 'MODERATION_RESTORE',
        category: 'MODERATION',
        entityType: 'sponsorship_pitch',
        entityId: pitchId,
        entityTitle: pitch.event_title,
        performedBy: adminId,
        details: reason?.trim() || 'Pitch reinstated by Administrator',
        metadata: { restored_at: new Date().toISOString() },
      });

      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch immutable content moderation history logs
   */
  static async getContentModerationHistory(filters?: {
    contentType?: string;
    contentId?: string;
    limit?: number;
  }) {
    const limit = Math.min(100, Math.max(1, filters?.limit || 50));

    let sql = `
      SELECT 
        l.id,
        l.content_type,
        l.content_id,
        l.action,
        l.reason,
        l.performed_by,
        l.content_title,
        l.metadata,
        l.created_at,
        u.full_name AS performer_name,
        u.email AS performer_email
      FROM content_moderation_logs l
      LEFT JOIN users u ON l.performed_by = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.contentType) {
      sql += ` AND l.content_type = $${paramIdx++}`;
      params.push(filters.contentType);
    }

    if (filters?.contentId) {
      sql += ` AND l.content_id = $${paramIdx++}`;
      params.push(filters.contentId);
    }

    sql += ` ORDER BY l.created_at DESC LIMIT $${paramIdx++}`;
    params.push(limit);

    const res = await query(sql, params);
    return res.rows;
  }
}
