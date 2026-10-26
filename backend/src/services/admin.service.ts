import { query } from '../config/db';
import { EmailService } from './email.service';

export class AdminService {
  static async getDashboardMetrics() {
    const countsRes = await query(`
      SELECT 
        (SELECT COUNT(*)::INTEGER FROM events) AS total_events,
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'attendee' OR role IS NULL) AS total_attendees,
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'organizer' OR is_organizer = TRUE) AS total_organizers,
        (SELECT COUNT(*)::INTEGER FROM users WHERE (role = 'organizer' AND approval_status = 'pending') OR organizer_approval_status = 'pending') AS pending_organizers,
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'sponsor') AS total_sponsors,
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'sponsor' AND approval_status = 'pending') AS pending_sponsors,
        (SELECT COUNT(*)::INTEGER FROM registrations WHERE status = 'registered') AS total_registrations,
        (SELECT COUNT(DISTINCT r.id)::INTEGER 
         FROM registrations r 
         LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL 
         LEFT JOIN tickets t ON t.registration_id = r.id 
         LEFT JOIN badge_awards b ON b.event_id = r.event_id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL 
         WHERE (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
            OR t.status IN ('CHECKED_IN', 'Used') 
            OR (b.id IS NOT NULL AND b.revoked_at IS NULL)
        ) AS total_check_ins,
        (SELECT COUNT(*)::INTEGER FROM badge_awards WHERE revoked_at IS NULL) AS total_badges
    `);

    const row = countsRes.rows[0];
    const totalRegistrations = parseInt(row.total_registrations || '0', 10);
    const totalCheckIns = parseInt(row.total_check_ins || '0', 10);
    const turnoutRate = totalRegistrations > 0
      ? parseFloat(((totalCheckIns / totalRegistrations) * 100).toFixed(1))
      : 0;

    return {
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
  }

  static async getUsersList() {
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
      WHERE u.role = 'attendee' OR u.role IS NULL
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const organizersRes = await query(`
      SELECT 
        u.id, u.full_name, u.email, u.phone, u.organization, u.role, u.is_active, u.approval_status,
        u.is_organizer, u.organizer_approval_status, u.created_at,
        COUNT(DISTINCT e.id)::INTEGER AS events_count,
        COUNT(DISTINCT CASE 
          WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
            OR t.status IN ('CHECKED_IN', 'Used') 
            OR (b.id IS NOT NULL AND b.revoked_at IS NULL) 
          THEN r.id 
        END)::INTEGER AS total_check_ins
      FROM users u
      LEFT JOIN events e ON u.id = e.organizer_id
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
      LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
      LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
      LEFT JOIN badge_awards b ON b.event_id = e.id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
      WHERE u.role = 'organizer' OR u.is_organizer = TRUE OR (u.organizer_approval_status IS NOT NULL AND u.organizer_approval_status != 'none')
      GROUP BY u.id
      ORDER BY 
        CASE WHEN (u.organizer_approval_status = 'pending' OR u.approval_status = 'pending') THEN 0 ELSE 1 END,
        u.created_at DESC
    `);

    const sponsorsRes = await query(`
      SELECT 
        u.id, u.full_name, u.email, u.phone, u.company_name, u.industry_category,
        u.company_phone, u.company_website, u.organization, u.role, u.is_active,
        u.approval_status, u.created_at
      FROM users u
      WHERE u.role = 'sponsor'
      ORDER BY 
        CASE WHEN u.approval_status = 'pending' THEN 0 ELSE 1 END,
        u.created_at DESC
    `);

    const attendees = attendeesRes.rows.map((u) => ({
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
    }));

    const organizers = organizersRes.rows.map((o) => {
      const effApproval = (o.organizer_approval_status && o.organizer_approval_status !== 'none')
        ? o.organizer_approval_status
        : (o.approval_status || 'pending');

      return {
        id: o.id,
        name: o.full_name,
        email: o.email,
        phone: o.phone,
        organization: o.organization || o.full_name,
        eventsCount: o.events_count || 0,
        totalCheckIns: o.total_check_ins || 0,
        status: effApproval === 'pending'
          ? 'Pending Approval'
          : effApproval === 'approved'
          ? 'Active'
          : 'Rejected',
        approvalStatus: effApproval,
        isActive: effApproval === 'approved',
        registeredAt: o.created_at,
      };
    });

    const sponsors = sponsorsRes.rows.map((s) => ({
      id: s.id,
      name: s.full_name,
      email: s.email,
      companyName: s.company_name || s.organization || 'Corporate Partner',
      industryCategory: s.industry_category || 'Technology',
      phone: s.company_phone || s.phone || '',
      website: s.company_website || '',
      status: s.approval_status === 'pending'
        ? 'Pending Approval'
        : s.approval_status === 'approved'
        ? 'Active'
        : 'Rejected',
      approvalStatus: s.approval_status,
      isActive: s.approval_status === 'approved',
      registeredAt: s.created_at,
    }));

    return { attendees, organizers, sponsors };
  }

  static async approveOrganizer(userId: string) {
    const res = await query(
      `UPDATE users
       SET role = 'organizer',
           approval_status = 'approved',
           organizer_approval_status = 'approved',
           is_organizer = TRUE,
           is_active = TRUE,
           updated_at = NOW()
       WHERE id = $1 AND (role = 'organizer' OR is_organizer = TRUE OR organizer_approval_status IS NOT NULL)
       RETURNING id, full_name, email, role, organization, is_active, approval_status, organizer_approval_status`,
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

    return user;
  }

  static async rejectOrganizer(userId: string) {
    const res = await query(
      `UPDATE users
       SET approval_status = 'rejected',
           organizer_approval_status = 'rejected',
           role = 'attendee',
           is_active = TRUE,
           updated_at = NOW()
       WHERE id = $1 AND (role = 'organizer' OR is_organizer = TRUE OR organizer_approval_status IS NOT NULL)
       RETURNING id, full_name, email, role, organization, is_active, approval_status, organizer_approval_status`,
      [userId]
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
        user.organization || user.full_name
      );
    } catch (e) {
      console.warn('Failed to dispatch organizer rejection email:', e);
    }

    return user;
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

    return user;
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

    return res.rows[0];
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
}
