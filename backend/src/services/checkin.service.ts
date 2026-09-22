import { getClient, query } from '../config/db';
import { verifyTicketToken } from '../utils/qr.util';
import { UserRole } from '../types';
import { BadgeService } from './badge.service';
import { EventService } from './event.service';
import { CacheService } from './cache.service';

export class CheckinService {
  static async lookupAttendee(eventIdOrToken: string, queryText: string, organizerId?: string, userRole?: string) {
    const event = await EventService.getEventById(eventIdOrToken);
    if (!event) return null;
    const realEventId = event.id;

    if (organizerId && event.organizerId !== organizerId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    const cleanQuery = queryText.trim();
    const isToken = cleanQuery.startsWith('eyJ') || cleanQuery.includes('shb_');
    let targetUserId: string | null = null;
    let targetTicketId: string | null = null;

    if (isToken) {
      try {
        const payload = verifyTicketToken(cleanQuery);
        targetUserId = payload.userId || null;
        targetTicketId = payload.ticketId;
      } catch {
        const tRes = await query('SELECT user_id, id FROM tickets WHERE event_id = $1 AND qr_token = $2', [realEventId, cleanQuery]);
        if (tRes.rowCount && tRes.rowCount > 0) {
          targetUserId = tRes.rows[0].user_id;
          targetTicketId = tRes.rows[0].id;
        }
      }
    } else if (cleanQuery.toUpperCase().startsWith('SHB-')) {
      const codeRes = await query('SELECT user_id, id FROM tickets WHERE event_id = $1 AND UPPER(ticket_code) = $2', [realEventId, cleanQuery.toUpperCase()]);
      if (codeRes.rowCount && codeRes.rowCount > 0) {
        targetUserId = codeRes.rows[0].user_id;
        targetTicketId = codeRes.rows[0].id;
      }
    }

    const conditions: string[] = ['r.event_id = $1', "r.status = 'registered'"];
    const values: any[] = [realEventId];

    if (targetTicketId) {
      conditions.push('t.id = $2');
      values.push(targetTicketId);
    } else if (targetUserId) {
      conditions.push('u.id = $2');
      values.push(targetUserId);
    } else {
      conditions.push('(u.full_name ILIKE $2 OR u.email ILIKE $2 OR t.ticket_code ILIKE $2)');
      values.push(`%${cleanQuery}%`);
    }

    const queryTextStr = `
      SELECT 
        r.id AS registration_id,
        u.id AS attendee_id,
        u.full_name AS name,
        u.email,
        r.registered_at,
        r.answers,
        ci.id AS check_in_id,
        ci.approved_at AS check_in_time,
        ci.voided_at,
        t.id AS ticket_id,
        t.ticket_code,
        t.status AS ticket_status,
        COALESCE(
          json_agg(b.badge_code) FILTER (WHERE b.id IS NOT NULL AND b.revoked_at IS NULL),
          '[]'::json
        ) AS badges
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN check_ins ci ON ci.registration_id = r.id AND ci.voided_at IS NULL
      LEFT JOIN tickets t ON t.registration_id = r.id
      LEFT JOIN badge_awards b ON b.event_id = r.event_id AND b.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY r.id, u.id, ci.id, t.id
      LIMIT 1
    `;

    const result = await query(queryTextStr, values);

    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    const isCheckedIn = Boolean(row.check_in_id && !row.voided_at);

    return {
      id: row.attendee_id,
      registrationId: row.registration_id,
      attendeeId: row.attendee_id,
      name: row.name,
      email: row.email,
      ticketCode: row.ticket_code,
      registrationDate: new Date(row.registered_at).toISOString().split('T')[0],
      status: isCheckedIn ? 'Checked in' : 'Registered',
      isCheckedIn,
      checkInId: row.check_in_id || null,
      checkInTime: row.check_in_time
        ? new Date(row.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' EAT'
        : undefined,
      badges: row.badges || [],
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {},
    };
  }

  // Live autocomplete search for fallback search tab
  static async searchAttendees(eventId: string, queryText: string, organizerId?: string, userRole?: string) {
    const event = await EventService.getEventById(eventId);
    if (!event) return [];

    if (organizerId && event.organizerId !== organizerId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    const clean = queryText.trim();
    if (!clean) return [];

    const cleanQuery = `%${clean}%`;
    const res = await query(`
      SELECT 
        u.id,
        u.full_name AS name,
        u.email,
        u.phone,
        u.avatar_url,
        t.ticket_code,
        t.status AS ticket_status,
        ci.approved_at AS check_in_time,
        ci.id AS check_in_id,
        ci.voided_at,
        r.registered_at,
        r.answers,
        EXISTS(SELECT 1 FROM badge_awards b WHERE b.event_id = $1 AND b.user_id = u.id AND b.badge_code = 'attended' AND b.revoked_at IS NULL) AS has_attended_badge
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN tickets t ON t.registration_id = r.id
      LEFT JOIN check_ins ci ON ci.registration_id = r.id AND ci.voided_at IS NULL
      WHERE r.event_id = $1 AND r.status = 'registered' AND (u.full_name ILIKE $2 OR u.email ILIKE $2 OR t.ticket_code ILIKE $2)
      ORDER BY u.full_name ASC
      LIMIT 10
    `, [event.id, cleanQuery]);

    return res.rows.map((row) => ({
      id: row.id,
      attendeeId: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      ticketCode: row.ticket_code,
      ticketStatus: row.ticket_status,
      isCheckedIn: Boolean(row.check_in_id && !row.voided_at),
      checkInTime: row.check_in_time,
      registrationDate: row.registered_at,
      hasAttendedBadge: Boolean(row.has_attended_badge),
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {},
    }));
  }

  // Public / Semi-Public ticket verification endpoint
  // Surfaces full attendee info, answers, event info, and checks if viewer is organizer
  static async getTicketVerification(params: {
    tokenOrCode: string;
    userId?: string;
    userRole?: UserRole;
  }) {
    const { tokenOrCode, userId, userRole } = params;
    let cleanInput = (tokenOrCode || '').trim();

    if (cleanInput.includes('token=')) {
      const match = cleanInput.match(/token=([^&]+)/);
      if (match) cleanInput = decodeURIComponent(match[1]);
    } else if (cleanInput.includes('code=')) {
      const match = cleanInput.match(/code=([^&]+)/);
      if (match) cleanInput = decodeURIComponent(match[1]);
    } else if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
      try {
        const parsedUrl = new URL(cleanInput);
        const token = parsedUrl.searchParams.get('token');
        const code = parsedUrl.searchParams.get('code');
        if (token) cleanInput = token;
        else if (code) cleanInput = code;
      } catch {}
    }

    if (!cleanInput) {
      const err: any = new Error('No ticket token or code provided.');
      err.statusCode = 400;
      throw err;
    }

    let targetTicketId: string | null = null;
    const isJwt = cleanInput.startsWith('eyJ');

    if (isJwt) {
      try {
        const payload = verifyTicketToken(cleanInput);
        targetTicketId = payload.ticketId;
      } catch {
        // Fall back to database lookup by token string or code
      }
    }

    let ticketRes;
    if (targetTicketId) {
      ticketRes = await query(
        `SELECT t.*, u.id as user_id, u.full_name, u.email, u.phone, u.avatar_url, u.organization,
                e.id as event_id, e.title as event_title, e.description as event_description,
                e.event_date, e.event_type, e.location as event_location, e.venue_name,
                e.organizer_id, e.custom_questions, e.start_time, e.end_time,
                org.full_name as organizer_name, org.organization as organizer_org, org.email as organizer_email,
                r.id as registration_id, r.registered_at, r.answers, r.status as reg_status
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         JOIN events e ON t.event_id = e.id
         JOIN users org ON e.organizer_id = org.id
         JOIN registrations r ON t.registration_id = r.id
         WHERE t.id = $1`,
        [targetTicketId]
      );
    }

    if (!ticketRes || ticketRes.rowCount === 0) {
      ticketRes = await query(
        `SELECT t.*, u.id as user_id, u.full_name, u.email, u.phone, u.avatar_url, u.organization,
                e.id as event_id, e.title as event_title, e.description as event_description,
                e.event_date, e.event_type, e.location as event_location, e.venue_name,
                e.organizer_id, e.custom_questions, e.start_time, e.end_time,
                org.full_name as organizer_name, org.organization as organizer_org, org.email as organizer_email,
                r.id as registration_id, r.registered_at, r.answers, r.status as reg_status
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         JOIN events e ON t.event_id = e.id
         JOIN users org ON e.organizer_id = org.id
         JOIN registrations r ON t.registration_id = r.id
         WHERE UPPER(t.ticket_code) = UPPER($1) OR t.qr_token = $1`,
        [cleanInput]
      );
    }

    if (!ticketRes || ticketRes.rowCount === 0) {
      const err: any = new Error('No ticket found matching this QR code or ticket code.');
      err.statusCode = 404;
      err.code = 'TICKET_NOT_FOUND';
      throw err;
    }

    const row = ticketRes.rows[0];
    const now = new Date();
    const isExpired = row.expires_at ? now > new Date(row.expires_at) : false;
    const isCancelled = row.status === 'CANCELLED' || row.reg_status === 'cancelled';

    // Check active check-in
    const ciRes = await query(
      `SELECT ci.id, ci.approved_at, ci.approved_by, u.full_name as approved_by_name
       FROM check_ins ci
       LEFT JOIN users u ON ci.approved_by = u.id
       WHERE ci.registration_id = $1 AND ci.voided_at IS NULL`,
      [row.registration_id]
    );
    const activeCheckIn = ciRes.rowCount && ciRes.rowCount > 0 ? ciRes.rows[0] : null;
    const isAlreadyCheckedIn = Boolean(activeCheckIn || row.status === 'CHECKED_IN');

    // Check attended badge
    const badgeRes = await query(
      `SELECT id, badge_label, awarded_at
       FROM badge_awards
       WHERE event_id = $1 AND user_id = $2 AND badge_code = 'attended' AND revoked_at IS NULL`,
      [row.event_id, row.user_id]
    );
    const hasAttendedBadge = Boolean(badgeRes.rowCount && badgeRes.rowCount > 0);

    // Is viewer the organizer of this event or an admin?
    const isOrganizer = Boolean(
      userId && (userId === row.organizer_id || userRole?.toLowerCase() === 'admin')
    );

    const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {};
    let questions: any[] = [];
    if (row.custom_questions) {
      questions = typeof row.custom_questions === 'string' ? JSON.parse(row.custom_questions) : row.custom_questions;
    }

    return {
      ticket: {
        id: row.id,
        ticketCode: row.ticket_code,
        status: isExpired ? 'EXPIRED' : isCancelled ? 'CANCELLED' : isAlreadyCheckedIn ? 'CHECKED_IN' : row.status,
        rawStatus: row.status,
        expiresAt: row.expires_at,
        isPaid: Boolean(row.is_paid),
        ticketPrice: parseFloat(row.ticket_price || '0'),
        currency: row.currency || 'ETB',
      },
      event: {
        id: row.event_id,
        title: row.event_title,
        description: row.event_description,
        date: row.event_date ? new Date(row.event_date).toISOString().split('T')[0] : '',
        time: row.start_time && row.end_time ? `${row.start_time} - ${row.end_time}` : row.start_time || 'Full Day',
        location: row.event_location,
        venueName: row.venue_name,
        organizerId: row.organizer_id,
        organizerName: row.organizer_org || row.organizer_name || 'Event Organizer',
      },
      attendee: {
        id: row.user_id,
        name: row.full_name,
        email: row.email,
        phone: isOrganizer ? row.phone : undefined,
        organization: row.organization,
        avatarUrl: row.avatar_url,
        registrationDate: row.registered_at,
        answers,
        customQuestions: questions,
      },
      checkIn: activeCheckIn ? {
        id: activeCheckIn.id,
        approvedAt: activeCheckIn.approved_at,
        approvedByName: activeCheckIn.approved_by_name || 'Organizer',
      } : null,
      hasAttendedBadge,
      isOrganizer,
      canCheckIn: isOrganizer && !isExpired && !isCancelled && !isAlreadyCheckedIn,
      isAlreadyCheckedIn,
      isExpired,
      isCancelled,
    };
  }

  // Dedicated verification endpoint for Organizer Scanner
  static async verifyTicketForScanner(params: {
    eventId: string;
    tokenOrCode: string;
    organizerId: string;
    userRole?: UserRole;
  }) {
    const { eventId, tokenOrCode, organizerId, userRole } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }
    const realEventId = event.id;

    if (event.organizerId !== organizerId && userRole && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    let cleanInput = (tokenOrCode || '').trim();
    if (cleanInput.includes('token=')) {
      const match = cleanInput.match(/token=([^&]+)/);
      if (match) cleanInput = decodeURIComponent(match[1]);
    } else if (cleanInput.includes('code=')) {
      const match = cleanInput.match(/code=([^&]+)/);
      if (match) cleanInput = decodeURIComponent(match[1]);
    } else if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
      try {
        const parsedUrl = new URL(cleanInput);
        const token = parsedUrl.searchParams.get('token');
        const code = parsedUrl.searchParams.get('code');
        if (token) cleanInput = token;
        else if (code) cleanInput = code;
      } catch {}
    }

    if (!cleanInput) {
      const err: any = new Error('Please scan a QR code or enter a ticket token / code.');
      err.statusCode = 400;
      throw err;
    }

    let targetTicketId: string | null = null;
    const isJwt = cleanInput.startsWith('eyJ');

    if (isJwt) {
      // Verify signature + expiration
      let payload;
      try {
        payload = verifyTicketToken(cleanInput);
      } catch (tokenErr: any) {
        if (tokenErr.code === 'TOKEN_EXPIRED') {
          const err: any = new Error('This ticket QR token has expired. Tickets are only valid until the end of the event day.');
          err.statusCode = 400;
          err.code = 'TOKEN_EXPIRED';
          throw err;
        }
        const err: any = new Error('Invalid or corrupted ticket QR token signature.');
        err.statusCode = 400;
        err.code = 'INVALID_QR_SIGNATURE';
        throw err;
      }

      targetTicketId = payload.ticketId;

      // Check event match
      if (payload.eventId && payload.eventId !== realEventId) {
        const wrongEventRes = await query('SELECT title FROM events WHERE id = $1', [payload.eventId]);
        const wrongEventTitle = wrongEventRes.rows[0]?.title || 'another event';
        const err: any = new Error(`Ticket is for "${wrongEventTitle}", not for this event.`);
        err.statusCode = 400;
        err.code = 'EVENT_MISMATCH';
        throw err;
      }
    }

    // Lookup ticket by id, qr_token, or ticket_code
    let ticketRes;
    if (targetTicketId) {
      ticketRes = await query(
        `SELECT t.*, u.full_name, u.email, u.phone, u.avatar_url, u.organization, r.registered_at, r.answers, r.status as reg_status
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         JOIN registrations r ON t.registration_id = r.id
         WHERE t.id = $1 AND t.event_id = $2`,
        [targetTicketId, realEventId]
      );
    } else {
      ticketRes = await query(
        `SELECT t.*, u.full_name, u.email, u.phone, u.avatar_url, u.organization, r.registered_at, r.answers, r.status as reg_status
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         JOIN registrations r ON t.registration_id = r.id
         WHERE (UPPER(t.ticket_code) = UPPER($1) OR t.qr_token = $1) AND t.event_id = $2`,
        [cleanInput, realEventId]
      );
    }

    if (!ticketRes.rowCount || ticketRes.rowCount === 0) {
      const otherEvt = await query(
        `SELECT e.title FROM tickets t JOIN events e ON t.event_id = e.id WHERE UPPER(t.ticket_code) = UPPER($1) OR t.qr_token = $1`,
        [cleanInput]
      );
      if (otherEvt.rowCount && otherEvt.rowCount > 0) {
        const err: any = new Error(`Ticket is for "${otherEvt.rows[0].title}", not for this event.`);
        err.statusCode = 400;
        err.code = 'EVENT_MISMATCH';
        throw err;
      }

      const err: any = new Error('No ticket found matching this QR code or ticket code.');
      err.statusCode = 404;
      err.code = 'TICKET_NOT_FOUND';
      throw err;
    }

    const row = ticketRes.rows[0];
    const now = new Date();
    const isExpired = row.expires_at ? now > new Date(row.expires_at) : false;
    const isCancelled = row.status === 'CANCELLED' || row.reg_status === 'cancelled';

    const ciRes = await query(
      `SELECT id, approved_at, approved_by, voided_at FROM check_ins WHERE registration_id = $1 AND voided_at IS NULL`,
      [row.registration_id]
    );
    const activeCheckIn = ciRes.rowCount && ciRes.rowCount > 0 ? ciRes.rows[0] : null;
    const isAlreadyCheckedIn = Boolean(activeCheckIn || row.status === 'CHECKED_IN');

    const badgeRes = await query(
      `SELECT id, badge_label, awarded_at FROM badge_awards WHERE event_id = $1 AND user_id = $2 AND badge_code = 'attended' AND revoked_at IS NULL`,
      [realEventId, row.user_id]
    );
    const hasAttendedBadge = Boolean(badgeRes.rowCount && badgeRes.rowCount > 0);
    const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {};

    let statusDisplay = row.status;
    if (isExpired) statusDisplay = 'EXPIRED';
    if (isCancelled) statusDisplay = 'CANCELLED';
    if (isAlreadyCheckedIn) statusDisplay = 'CHECKED_IN';

    return {
      success: true,
      ticket: {
        id: row.id,
        ticketCode: row.ticket_code,
        status: statusDisplay,
        rawStatus: row.status,
        expiresAt: row.expires_at,
        isPaid: row.is_paid,
        ticketPrice: row.ticket_price,
        currency: row.currency || 'ETB',
      },
      attendee: {
        id: row.user_id,
        name: row.full_name,
        email: row.email,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        organization: row.organization,
        registrationDate: row.registered_at,
        answers,
      },
      checkIn: activeCheckIn ? {
        id: activeCheckIn.id,
        approvedAt: activeCheckIn.approved_at,
        approvedBy: activeCheckIn.approved_by,
      } : null,
      hasAttendedBadge,
      isExpired,
      isCancelled,
      canCheckIn: !isExpired && !isCancelled && !isAlreadyCheckedIn,
      canUndo: isAlreadyCheckedIn,
      message: isExpired
        ? 'Ticket has expired (valid until end of event day).'
        : isCancelled
        ? 'This ticket has been cancelled.'
        : isAlreadyCheckedIn
        ? `Already checked in at ${new Date(activeCheckIn?.approved_at || row.checked_in_at || now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT.`
        : 'Valid ticket ready for check-in.',
    };
  }

  static async markAttended(params: {
    eventId: string;
    attendeeId: string;
    approvedByOrganizerId: string;
    userRole?: UserRole;
    notes?: string;
  }) {
    const { eventId, attendeeId, approvedByOrganizerId, userRole, notes } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }
    const realEventId = event.id;

    if (event.organizerId !== approvedByOrganizerId && userRole && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch registration with row lock
      const regRes = await client.query(
        `SELECT r.id, r.user_id, r.status, u.full_name, u.email 
         FROM registrations r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.event_id = $1 AND r.user_id = $2 FOR UPDATE`,
        [realEventId, attendeeId]
      );

      if (!regRes.rowCount || regRes.rowCount === 0) {
        const err: any = new Error('No active registration found for this attendee.');
        err.statusCode = 404;
        throw err;
      }

      const registration = regRes.rows[0];
      if (registration.status === 'cancelled') {
        const err: any = new Error('Cannot check in. Registration has been cancelled.');
        err.statusCode = 400;
        err.code = 'REGISTRATION_CANCELLED';
        throw err;
      }

      // Check ticket status & expiration
      const ticketRes = await client.query(
        `SELECT id, status, expires_at FROM tickets WHERE registration_id = $1 FOR UPDATE`,
        [registration.id]
      );
      if (ticketRes.rowCount && ticketRes.rowCount > 0) {
        const ticketRow = ticketRes.rows[0];
        if (ticketRow.status === 'CANCELLED') {
          const err: any = new Error('Cannot check in. This ticket has been cancelled.');
          err.statusCode = 400;
          err.code = 'TICKET_CANCELLED';
          throw err;
        }
        if (ticketRow.expires_at && new Date() > new Date(ticketRow.expires_at)) {
          const err: any = new Error('Cannot check in. This ticket has expired (valid until end of event day).');
          err.statusCode = 400;
          err.code = 'TICKET_EXPIRED';
          throw err;
        }
      }

      // 2. Prevent duplicate check-in (return 409 Conflict with timestamp)
      const existingCheckIn = await client.query(
        `SELECT id, approved_at FROM check_ins WHERE registration_id = $1 AND voided_at IS NULL`,
        [registration.id]
      );

      if (existingCheckIn.rowCount && existingCheckIn.rowCount > 0) {
        const prevCheckIn = existingCheckIn.rows[0];
        const formattedTime = new Date(prevCheckIn.approved_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const err: any = new Error(`Already Checked In! This ticket was verified at ${formattedTime} EAT.`);
        err.statusCode = 409;
        err.code = 'ALREADY_CHECKED_IN';
        err.data = {
          checkedInAt: prevCheckIn.approved_at,
          attendee: {
            id: registration.user_id,
            name: registration.full_name,
            email: registration.email,
          },
        };
        throw err;
      }

      const now = new Date();

      // Insert CheckIn row
      const ciRes = await client.query(
        `INSERT INTO check_ins (registration_id, event_id, user_id, approved_by, approved_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, approved_at`,
        [registration.id, realEventId, attendeeId, approvedByOrganizerId, now, notes?.trim() || null]
      );
      const checkInId = ciRes.rows[0].id;

      // Atomically award "Attended" badge (if not already awarded or if previously revoked)
      const badgeRes = await client.query(
        `INSERT INTO badge_awards (badge_code, badge_label, event_id, user_id, awarded_by, awarded_at, organizer_note)
         VALUES ('attended', 'Attended', $1, $2, $3, $4, $5)
         ON CONFLICT (event_id, user_id, badge_code)
         DO UPDATE SET revoked_at = NULL, awarded_at = $4, revocation_reason = NULL, organizer_note = COALESCE($5, badge_awards.organizer_note)
         RETURNING id, badge_code, badge_label, event_id, user_id, awarded_by, awarded_at, organizer_note`,
        [realEventId, attendeeId, approvedByOrganizerId, now, notes?.trim() || null]
      );

      // Update ticket status to CHECKED_IN
      await client.query(
        `UPDATE tickets
         SET status = 'CHECKED_IN',
             checked_in_at = $1,
             checked_in_by = $2,
             updated_at = $1
         WHERE registration_id = $3`,
        [now, approvedByOrganizerId, registration.id]
      );

      await client.query('COMMIT');

      // Invalidate event cache, roster, and reports
      CacheService.delPrefix(`event:${realEventId}`);
      CacheService.del(`report:${realEventId}`);
      CacheService.delPrefix('events:list');

      const updatedAttendee = await this.lookupAttendee(realEventId, attendeeId);
      const rawBadge = badgeRes.rows[0];

      const badgeAwarded = BadgeService.formatBadge({
        ...rawBadge,
        event_title: event.title,
        event_type: event.type,
        event_date: event.date,
        event_location: event.location,
        attendee_name: updatedAttendee?.name,
        attendee_email: updatedAttendee?.email,
        issuer_name: event.venueName || event.organizerName || 'GDG Addis',
      });

      return {
        success: true,
        message: 'Check-in confirmed and Attended badge awarded!',
        checkInId,
        checkedInAt: now.toISOString(),
        badgeAwarded,
        rosterItem: updatedAttendee,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async undoCheckIn(params: {
    eventId: string;
    attendeeId: string;
    undoneByOrganizerId: string;
    userRole?: UserRole;
    reason?: string;
  }) {
    const { eventId, attendeeId, undoneByOrganizerId, userRole, reason } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }
    const realEventId = event.id;

    if (event.organizerId !== undoneByOrganizerId && userRole && userRole !== 'admin') {
      const err: any = new Error('Unauthorized.');
      err.statusCode = 403;
      throw err;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const now = new Date();

      // 1. Soft-void CheckIn row (set voided_at, do not hard delete to keep audit trail)
      await client.query(
        `UPDATE check_ins
         SET voided_at = $1,
             voided_by = $2,
             updated_at = $1
         WHERE event_id = $3 AND user_id = $4 AND voided_at IS NULL`,
        [now, undoneByOrganizerId, realEventId, attendeeId]
      );

      // 2. Revoke Attended badge
      await client.query(
        `UPDATE badge_awards
         SET revoked_at = $1,
             revoked_by = $2,
             revocation_reason = COALESCE($5, 'Check-in undone by organizer'),
             updated_at = $1
         WHERE event_id = $3 AND user_id = $4 AND badge_code = 'attended'`,
        [now, undoneByOrganizerId, realEventId, attendeeId, reason || 'Check-in soft-voided by organizer']
      );

      // 3. Reset ticket status if exists
      await client.query(
        `UPDATE tickets
         SET status = 'ISSUED',
             checked_in_at = NULL,
             checked_in_by = NULL,
             updated_at = $1
         WHERE event_id = $2 AND user_id = $3`,
        [now, realEventId, attendeeId]
      );

      await client.query('COMMIT');

      // Invalidate event cache, roster, and reports
      CacheService.delPrefix(`event:${realEventId}`);
      CacheService.del(`report:${realEventId}`);
      CacheService.delPrefix('events:list');

      const updatedAttendee = await this.lookupAttendee(realEventId, attendeeId);

      return {
        success: true,
        message: 'Check-in soft-voided successfully. Ticket reset to ISSUED.',
        rosterItem: updatedAttendee,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Backward compatibility alias for approveCheckIn
  static async approveCheckIn(params: {
    eventId: string;
    attendeeId: string;
    approvedByOrganizerId: string;
    userRole: UserRole;
  }) {
    return this.markAttended(params);
  }

  static async addManualAttendee(params: {
    eventId: string;
    organizerId: string;
    name: string;
    email: string;
    phone?: string;
    userRole?: UserRole;
  }) {
    const { eventId, organizerId, name, email, phone, userRole } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }
    const realEventId = event.id;

    if (event.organizerId !== organizerId && userRole && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanPhone = phone?.trim() || null;

    if (!cleanName) {
      const err: any = new Error('Attendee name is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!cleanEmail) {
      const err: any = new Error('Attendee email is required.');
      err.statusCode = 400;
      throw err;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Find or create user
      let userId: string;
      const userLookup = await client.query('SELECT id, full_name, phone FROM users WHERE email = $1', [cleanEmail]);
      if (userLookup.rowCount && userLookup.rowCount > 0) {
        userId = userLookup.rows[0].id;
        if (cleanPhone && !userLookup.rows[0].phone) {
          await client.query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [cleanPhone, userId]);
        }
      } else {
        const dummyHash = '$2b$10$wT0o3q6/11fI0vL9fD9f1.xJ4Vb2c9P5lQ6kZ3eX4kL9wR4y7zT6e';
        const userInsert = await client.query(
          `INSERT INTO users (email, password_hash, full_name, role, phone, visibility, approval_status)
           VALUES ($1, $2, $3, 'attendee', $4, 'public', 'approved')
           RETURNING id`,
          [cleanEmail, dummyHash, cleanName, cleanPhone]
        );
        userId = userInsert.rows[0].id;
      }

      // 2. Find or create registration
      let registrationId: string;
      const regLookup = await client.query(
        `SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2`,
        [realEventId, userId]
      );
      if (regLookup.rowCount && regLookup.rowCount > 0) {
        registrationId = regLookup.rows[0].id;
        await client.query(
          `UPDATE registrations SET status = 'registered', updated_at = NOW() WHERE id = $1`,
          [registrationId]
        );
      } else {
        const regInsert = await client.query(
          `INSERT INTO registrations (event_id, user_id, status, answers)
           VALUES ($1, $2, 'registered', $3)
           RETURNING id`,
          [realEventId, userId, JSON.stringify({ Phone: cleanPhone || 'N/A' })]
        );
        registrationId = regInsert.rows[0].id;
      }

      const now = new Date();

      // 3. Insert or update CheckIn row
      const checkInLookup = await client.query(
        `SELECT id FROM check_ins WHERE registration_id = $1`,
        [registrationId]
      );
      if (checkInLookup.rowCount && checkInLookup.rowCount > 0) {
        await client.query(
          `UPDATE check_ins SET voided_at = NULL, approved_by = $1, approved_at = $2, updated_at = $2 WHERE id = $3`,
          [organizerId, now, checkInLookup.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO check_ins (registration_id, event_id, user_id, approved_by, approved_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [registrationId, realEventId, userId, organizerId, now]
        );
      }

      // 4. Atomically award "Attended" badge
      await client.query(
        `INSERT INTO badge_awards (badge_code, badge_label, event_id, user_id, awarded_by, awarded_at)
         VALUES ('attended', 'Attended', $1, $2, $3, $4)
         ON CONFLICT (event_id, user_id, badge_code)
         DO UPDATE SET revoked_at = NULL, awarded_at = $4, revocation_reason = NULL`,
        [realEventId, userId, organizerId, now]
      );

      // 5. Create or update ticket
      const ticketLookup = await client.query(
        `SELECT id FROM tickets WHERE event_id = $1 AND user_id = $2`,
        [realEventId, userId]
      );
      if (ticketLookup.rowCount && ticketLookup.rowCount > 0) {
        await client.query(
          `UPDATE tickets SET status = 'CHECKED_IN', checked_in_at = $1, checked_in_by = $2, updated_at = $1 WHERE id = $3`,
          [now, organizerId, ticketLookup.rows[0].id]
        );
      } else {
        const ticketCode = `SHB-${Math.floor(1000 + Math.random() * 9000)}-2026`;
        await client.query(
          `INSERT INTO tickets (
            ticket_code, registration_id, event_id, user_id, qr_token, qr_code_data_url,
            status, checked_in_at, checked_in_by, is_paid, ticket_price, currency
          ) VALUES ($1, $2, $3, $4, $5, $6, 'CHECKED_IN', $7, $8, FALSE, 0, 'ETB')`,
          [ticketCode, registrationId, realEventId, userId, `shb_walkin_${Date.now()}`, '', now, organizerId]
        );
      }

      await client.query('COMMIT');

      // Invalidate event cache, roster, and reports
      CacheService.delPrefix(`event:${realEventId}`);
      CacheService.del(`report:${realEventId}`);
      CacheService.delPrefix('events:list');

      const updatedAttendee = await this.lookupAttendee(realEventId, userId);

      return {
        success: true,
        message: `Successfully added ${cleanName} as an attended participant!`,
        rosterItem: updatedAttendee,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
