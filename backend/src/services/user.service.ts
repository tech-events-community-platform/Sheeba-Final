import { query } from '../config/db';
import { AuthService } from './auth.service';
import { BadgeService } from './badge.service';

export class UserService {
  static async getUserProfile(userId: string) {
    return AuthService.getCurrentUser(userId);
  }

  static async getPublicProfile(userId: string, viewerId?: string, viewerRole?: string) {
    const result = await query(
      `SELECT id, email, full_name, role, phone, bio, organization, avatar_url, visibility, member_since, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      const err: any = new Error('Public profile not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = result.rows[0];
    const isOwner = viewerId === user.id;
    const isAdmin = viewerRole?.toLowerCase() === 'admin';
    const isPrivate = user.visibility === 'private';

    // If profile is private and viewer is neither the owner nor admin, return restricted view without leaking PII or badges
    if (isPrivate && !isOwner && !isAdmin) {
      return {
        isPrivate: true,
        user: {
          id: user.id,
          name: user.full_name,
          avatarUrl: user.avatar_url,
          memberSince: user.member_since,
          visibility: 'private',
        },
        badges: [],
        message: 'This attendee has made their verified profile private.',
      };
    }

    const stats = await AuthService.computeUserStats(user.id);
    const badges = await BadgeService.getAttendeeBadges(user.id);
    const formatted = AuthService.formatUserResponse(user, stats);

    // Sanitize contact info from public exposure if viewer is not the user themselves or an admin
    if (!isOwner && !isAdmin) {
      formatted.email = undefined;
      formatted.phone = undefined;
      formatted.companyPhone = undefined;
    }

    return {
      isPrivate: false,
      isOwnerPreview: isOwner && isPrivate,
      user: formatted,
      badges,
    };
  }

  static async updateUserProfile(
    userId: string,
    data: {
      full_name?: string;
      phone?: string;
      bio?: string;
      organization?: string;
      visibility?: 'public' | 'private';
      avatar_url?: string;
    }
  ) {
    const fields: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (data.full_name !== undefined) {
      fields.push(`full_name = $${counter++}`);
      values.push(data.full_name);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${counter++}`);
      values.push(data.phone);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${counter++}`);
      values.push(data.bio);
    }
    if (data.organization !== undefined) {
      fields.push(`organization = $${counter++}`);
      values.push(data.organization);
    }
    if (data.visibility !== undefined) {
      fields.push(`visibility = $${counter++}`);
      values.push(data.visibility);
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${counter++}`);
      values.push(data.avatar_url);
    }

    if (fields.length === 0) {
      return this.getUserProfile(userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const queryText = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING id, email, full_name, role, phone, bio, organization, avatar_url, visibility, member_since, created_at, updated_at
    `;

    const result = await query(queryText, values);

    if (!result.rowCount || result.rowCount === 0) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const stats = await AuthService.computeUserStats(userId);
    return AuthService.formatUserResponse(result.rows[0], stats);
  }

  static async updateVisibility(userId: string, visibility: 'public' | 'private') {
    await query('UPDATE users SET visibility = $1, updated_at = NOW() WHERE id = $2', [visibility, userId]);
    return true;
  }

  static async deleteAccount(userId: string) {
    // Section 9: Block account deletion while the organizer has an upcoming or ongoing event
    const activeEventsRes = await query(
      `SELECT id, title, event_date FROM events 
       WHERE organizer_id = $1 
         AND (event_date >= CURRENT_DATE - INTERVAL '1 day')`,
      [userId]
    );

    if (activeEventsRes.rowCount && activeEventsRes.rowCount > 0) {
      const err: any = new Error(
        `Cannot delete account: You have active, ongoing, or upcoming events associated with this organizer profile. Complete or conclude them first.`
      );
      err.statusCode = 400;
      throw err;
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }

  static async exportUserData(userId: string, format: 'json' | 'csv' = 'json') {
    const userRes = await query('SELECT id, email, full_name, role, visibility, member_since, created_at FROM users WHERE id = $1', [userId]);
    const ticketsRes = await query('SELECT * FROM tickets WHERE user_id = $1', [userId]);
    const badgesRes = await query('SELECT * FROM badge_awards WHERE user_id = $1', [userId]);

    const user = userRes.rows[0];
    const tickets = ticketsRes.rows;
    const badges = badgesRes.rows;

    if (format === 'csv') {
      const header = 'Type,ID,Name_Or_Title,Date,Details\n';
      const userRow = `User,"${user.id}","${user.full_name}","${user.member_since}","${user.email}"\n`;
      const ticketRows = tickets.map((t) => `Ticket,"${t.id}","Ticket ${t.ticket_code || t.id}","${t.created_at}","${t.status}"`).join('\n');
      const badgeRows = badges.map((b) => `Badge,"${b.id}","${b.badge_label}","${b.awarded_at}","${b.badge_code}"`).join('\n');
      return header + userRow + ticketRows + (ticketRows ? '\n' : '') + badgeRows;
    }

    return {
      user,
      tickets,
      badges,
      exportedAt: new Date().toISOString(),
    };
  }

  static async getUserAttendanceHistory(userId: string) {
    const result = await query(
      `SELECT 
        t.id AS ticket_id,
        t.ticket_code,
        t.status AS ticket_status,
        t.checked_in_at,
        t.qr_token,
        r.id AS registration_id,
        r.registered_at,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_type,
        e.event_date,
        e.start_time,
        e.end_time,
        e.time_str,
        e.location AS event_location,
        e.venue_name,
        e.banner_url AS event_banner_url,
        u.full_name AS organizer_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', b.id,
              'badgeCode', b.badge_code,
              'badgeLabel', b.badge_label,
              'awardedAt', b.awarded_at
            )
          ) FILTER (WHERE b.id IS NOT NULL AND b.revoked_at IS NULL),
          '[]'::json
        ) AS badges
       FROM tickets t
       JOIN registrations r ON t.registration_id = r.id
       JOIN events e ON t.event_id = e.id
       JOIN users u ON e.organizer_id = u.id
       LEFT JOIN badge_awards b ON b.event_id = e.id AND b.user_id = t.user_id
       WHERE t.user_id = $1 AND t.status = 'CHECKED_IN'
       GROUP BY t.id, r.id, e.id, u.id
       ORDER BY t.checked_in_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.event_id,
      ticketId: row.ticket_id,
      ticketCode: row.ticket_code || 'SHB-8921',
      title: row.event_title,
      type: row.event_type || 'workshop',
      date: new Date(row.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: row.time_str || `${row.start_time} - ${row.end_time}`,
      location: row.event_location,
      organizerName: row.organizer_name,
      checkedInAt: row.checked_in_at,
      badges: row.badges || [],
    }));
  }
}
