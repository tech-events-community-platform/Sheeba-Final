import { query } from '../config/db';
import { BadgeCode, IBadgeAward, UserRole } from '../types';

export class BadgeService {
  static formatBadge(row: any): any {
    const badgeLabels: Record<string, string> = {
      attended: 'Attended',
      participant: 'Participant',
      winner: 'Winner',
      speaker: 'Speaker',
    };

    const organizerName = row.organizer_organization || row.organizer_name || row.issuer_name || 'Organizer';
    const givenBy = row.given_by || `Given by ${organizerName}`;

    return {
      id: row.id,
      badgeCode: row.badge_code as BadgeCode,
      badgeLabel: row.badge_label || badgeLabels[row.badge_code] || 'Verified Badge',
      eventId: row.event_id,
      eventTitle: row.event_title || 'Tech Event',
      eventType: row.event_type || 'workshop',
      eventDate: row.event_date ? new Date(row.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '2026',
      eventLocation: row.event_location || 'Addis Ababa',
      eventDescription: row.event_description || row.description || null,
      eventTime: row.event_time || (row.start_time ? `${row.start_time}${row.end_time ? ` - ${row.end_time}` : ''}` : null),
      organizerNote: row.organizer_note || null,
      attendeeId: row.user_id,
      attendeeName: row.attendee_name || row.user_name || 'Attendee',
      attendeeEmail: row.attendee_email || row.user_email || '',
      issuerName: organizerName,
      organizerName,
      givenBy,
      awardedBy: row.awarded_by,
      awardedAt: row.awarded_at ? new Date(row.awarded_at).toISOString() : new Date().toISOString(),
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      revocationReason: row.revocation_reason || null,
    };
  }

  static async getAllBadgeAwards(): Promise<any[]> {
    const result = await query(
      `SELECT 
        b.id, b.badge_code, b.badge_label, b.event_id, b.user_id, b.awarded_by, b.awarded_at, b.revoked_at, b.revocation_reason, b.organizer_note,
        e.title AS event_title, e.event_type, e.event_date, e.location AS event_location, e.description AS event_description, e.start_time, e.end_time,
        u.full_name AS attendee_name, u.email AS attendee_email,
        org.full_name AS issuer_name,
        COALESCE(org.organization, org.full_name, 'Organizer') AS organizer_name,
        org.organization AS organizer_organization
       FROM badge_awards b
       JOIN events e ON b.event_id = e.id
       JOIN users u ON b.user_id = u.id
       JOIN users org ON e.organizer_id = org.id
       ORDER BY b.awarded_at DESC`
    );

    return result.rows.map((row: any) => this.formatBadge(row));
  }

  static async getAttendeeBadges(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT 
        b.id, b.badge_code, b.badge_label, b.event_id, b.user_id, b.awarded_by, b.awarded_at, b.revoked_at, b.organizer_note,
        e.title AS event_title, e.event_type, e.event_date, e.location AS event_location, e.description AS event_description, e.start_time, e.end_time,
        u.full_name AS attendee_name, u.email AS attendee_email,
        org.full_name AS issuer_name,
        COALESCE(org.organization, org.full_name, 'Organizer') AS organizer_name,
        org.organization AS organizer_organization
       FROM badge_awards b
       JOIN events e ON b.event_id = e.id
       JOIN users u ON b.user_id = u.id
       JOIN users org ON e.organizer_id = org.id
       WHERE b.user_id = $1 AND b.revoked_at IS NULL
       ORDER BY b.awarded_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => this.formatBadge(row));
  }

  static async getBadgeById(badgeId: string): Promise<any> {
    const result = await query(
      `SELECT 
        b.id, b.badge_code, b.badge_label, b.event_id, b.user_id, b.awarded_by, b.awarded_at, b.revoked_at, b.revocation_reason, b.organizer_note,
        e.title AS event_title, e.event_type, e.event_date, e.location AS event_location, e.description AS event_description, e.start_time, e.end_time,
        u.full_name AS attendee_name, u.email AS attendee_email,
        org.full_name AS issuer_name,
        COALESCE(org.organization, org.full_name, 'Organizer') AS organizer_name,
        org.organization AS organizer_organization
       FROM badge_awards b
       JOIN events e ON b.event_id = e.id
       JOIN users u ON b.user_id = u.id
       JOIN users org ON e.organizer_id = org.id
       WHERE b.id = $1`,
      [badgeId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      const err: any = new Error('Badge not found.');
      err.statusCode = 404;
      throw err;
    }

    return this.formatBadge(result.rows[0]);
  }

  // Section 6: Query attendees for selected event where a non-voided CheckIn row exists
  static async getAttendedBadgeHolders(eventId: string): Promise<any[]> {
    const result = await query(
      `SELECT 
        ci.id AS checkin_id,
        ci.approved_at AS check_in_time,
        r.id AS registration_id,
        r.registered_at,
        r.answers,
        u.id AS attendee_id,
        u.full_name AS name,
        u.email,
        COALESCE(
          json_agg(b.badge_code) FILTER (WHERE b.id IS NOT NULL AND b.revoked_at IS NULL),
          '[]'::json
        ) AS badges
       FROM check_ins ci
       JOIN registrations r ON ci.registration_id = r.id
       JOIN users u ON ci.user_id = u.id
       LEFT JOIN badge_awards b ON b.event_id = ci.event_id AND b.user_id = u.id
       WHERE ci.event_id = $1 AND ci.voided_at IS NULL
       GROUP BY ci.id, r.id, u.id
       ORDER BY ci.approved_at ASC`,
      [eventId]
    );

    return result.rows.map((row) => ({
      id: row.attendee_id,
      registrationId: row.registration_id,
      attendeeId: row.attendee_id,
      name: row.name,
      email: row.email,
      registrationDate: new Date(row.registered_at).toISOString().split('T')[0],
      status: 'Checked in' as const,
      checkInTime: row.check_in_time
        ? new Date(row.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' EAT'
        : undefined,
      badges: row.badges || ['attended'],
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {},
    }));
  }

  // Section 7: Single shared badge-award action (Participant / Winner / Speaker)
  static async awardBadge(params: {
    eventId: string;
    attendeeId: string;
    badgeCode: BadgeCode;
    awardedByOrganizerId: string;
    userRole?: UserRole;
    notes?: string;
  }): Promise<any> {
    const { eventId, attendeeId, badgeCode, awardedByOrganizerId, userRole, notes } = params;

    const eventRes = await query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (!eventRes.rowCount || eventRes.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (eventRes.rows[0].organizer_id !== awardedByOrganizerId && userRole && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You cannot award badges for an event you do not organize.');
      err.statusCode = 403;
      throw err;
    }

    // Validate badge type: only participant, winner, speaker can be manually awarded
    const validHigherTierBadges = ['participant', 'winner', 'speaker'];
    if (!validHigherTierBadges.includes(badgeCode.toLowerCase())) {
      const err: any = new Error(`Invalid badge type: "${badgeCode}". Manual awards can only be Participant, Winner, or Speaker.`);
      err.statusCode = 400;
      throw err;
    }

    const normBadgeCode = badgeCode.toLowerCase() as BadgeCode;

    // Section 0 & 7: Check that attendee holds non-revoked "Attended" badge for this event (Attended is the floor)
    const attendedCheck = await query(
      `SELECT id FROM badge_awards 
       WHERE event_id = $1 AND user_id = $2 AND badge_code = 'attended' AND revoked_at IS NULL`,
      [eventId, attendeeId]
    );

    if (!attendedCheck.rowCount || attendedCheck.rowCount === 0) {
      // Also check check_ins table
      const checkinCheck = await query(
        `SELECT id FROM check_ins WHERE event_id = $1 AND user_id = $2 AND voided_at IS NULL`,
        [eventId, attendeeId]
      );
      if (!checkinCheck.rowCount || checkinCheck.rowCount === 0) {
        const err: any = new Error('Cannot award badge. Attendee must hold verified "Attended" status for this event first.');
        err.statusCode = 400;
        throw err;
      }
    }

    const badgeLabels: Record<BadgeCode, string> = {
      attended: 'Attended',
      participant: 'Participant',
      winner: 'Winner',
      speaker: 'Speaker',
    };

    const badgeLabel = badgeLabels[normBadgeCode] || 'Participant';

    const insertRes = await query(
      `INSERT INTO badge_awards (badge_code, badge_label, event_id, user_id, awarded_by, awarded_at, organizer_note)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (event_id, user_id, badge_code)
       DO UPDATE SET revoked_at = NULL, awarded_at = NOW(), revocation_reason = NULL, organizer_note = COALESCE($6, badge_awards.organizer_note)
       RETURNING *`,
      [normBadgeCode, badgeLabel, eventId, attendeeId, awardedByOrganizerId, notes?.trim() || null]
    );

    const raw = insertRes.rows[0];
    return this.getBadgeById(raw.id);
  }

  static async bulkAwardBadges(params: {
    eventId: string;
    attendeeUserIds: string[];
    badgeCode: BadgeCode;
    awardedByOrganizerId: string;
    userRole?: UserRole;
  }): Promise<{ awardedCount: number }> {
    const { eventId, attendeeUserIds, badgeCode, awardedByOrganizerId, userRole } = params;

    const eventRes = await query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (!eventRes.rowCount || eventRes.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (eventRes.rows[0].organizer_id !== awardedByOrganizerId && userRole && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You cannot award badges for an event you do not organize.');
      err.statusCode = 403;
      throw err;
    }

    let count = 0;
    for (const userId of attendeeUserIds) {
      try {
        await this.awardBadge({
          eventId,
          attendeeId: userId,
          badgeCode,
          awardedByOrganizerId,
          userRole,
        });
        count++;
      } catch (err) {
        console.warn(`Skipping award for user ${userId}:`, (err as any).message);
      }
    }

    return { awardedCount: count };
  }

  static async adminRevokeBadge(badgeAwardId: string, revokedByUserId?: string, reason?: string): Promise<boolean> {
    const res = await query(
      `UPDATE badge_awards
       SET revoked_at = NOW(),
           revoked_by = $1,
           revocation_reason = $2
       WHERE id = $3
       RETURNING id`,
      [revokedByUserId || null, reason || 'Admin revocation action', badgeAwardId]
    );

    if (!res.rowCount || res.rowCount === 0) {
      const err: any = new Error('Badge award record not found.');
      err.statusCode = 404;
      throw err;
    }

    return true;
  }
}
