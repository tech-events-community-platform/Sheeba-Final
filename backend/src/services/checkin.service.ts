import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getClient, query } from '../config/db';
import {
  generateTicketToken,
  generateQrDataUrl,
  generateTicketCode,
  verifyTicketToken,
  computeEventDayExpiration,
} from '../utils/qr.util';
import { UserRole } from '../types';
import { BadgeService } from './badge.service';
import { EventService } from './event.service';
import { CacheService } from './cache.service';
import { EmailService } from './email.service';
import { PaymentService } from './payment.service';
import { NotificationQueueService } from './notificationQueue.service';
import { generateRandomInitialPassword, encryptCredential } from '../utils/credential.util';
import { getFrontendUrl } from '../config/env';

function extractCleanTokenOrCode(input: string): string {
  const raw = (input || '').trim();
  if (!raw) return '';

  const tokenParamMatch = raw.match(/token=([^&\s\n\r]+)/i);
  if (tokenParamMatch) return decodeURIComponent(tokenParamMatch[1]);

  const tokenLabelMatch = raw.match(/Token:\s*([^\s\n\r]+)/i);
  if (tokenLabelMatch) return tokenLabelMatch[1].trim();

  const codeParamMatch = raw.match(/code=([^&\s\n\r]+)/i);
  if (codeParamMatch) return decodeURIComponent(codeParamMatch[1]);

  const codeLabelMatch = raw.match(/(?:Ticket Code|Ticket|Code|Pass Code):\s*([^\s\n\r]+)/i);
  if (codeLabelMatch) return codeLabelMatch[1].trim();

  const shbMatch = raw.match(/SHB-[A-Z0-9]+-[0-9]{4}/i);
  if (shbMatch) return shbMatch[0].trim();

  const attendeeMatch = raw.match(/Attendee:\s*([^\n\r]+)/i);
  if (attendeeMatch) return attendeeMatch[1].trim();

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsedUrl = new URL(raw);
      const token = parsedUrl.searchParams.get('token');
      const code = parsedUrl.searchParams.get('code');
      if (token) return token;
      if (code) return code;
    } catch {}
  }

  return raw;
}

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

    const conditions: string[] = ['r.event_id = $1', "r.status = 'registered'", 'r.deleted_at IS NULL'];
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
    const cleanInput = extractCleanTokenOrCode(tokenOrCode);

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
                e.organizer_id, e.custom_questions, e.start_time, e.end_time, e.deleted_at as event_deleted_at,
                org.full_name as organizer_name, org.organization as organizer_org, org.email as organizer_email,
                r.id as registration_id, r.registered_at, r.answers, r.status as reg_status, r.deleted_at as reg_deleted_at
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
                e.organizer_id, e.custom_questions, e.start_time, e.end_time, e.deleted_at as event_deleted_at,
                org.full_name as organizer_name, org.organization as organizer_org, org.email as organizer_email,
                r.id as registration_id, r.registered_at, r.answers, r.status as reg_status, r.deleted_at as reg_deleted_at
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         JOIN events e ON t.event_id = e.id
         JOIN users org ON e.organizer_id = org.id
         JOIN registrations r ON t.registration_id = r.id
         WHERE UPPER(t.ticket_code) = UPPER($1) OR t.qr_token = $1 OR UPPER(u.full_name) = UPPER($1) OR u.email ILIKE $1`,
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

    if (row.event_deleted_at) {
      const err: any = new Error(`Cannot check in: The event "${row.event_title}" is currently in the Recycle Bin.`);
      err.statusCode = 400;
      err.code = 'EVENT_DELETED';
      throw err;
    }

    if (row.reg_deleted_at) {
      const err: any = new Error('Cannot check in: This attendee registration is currently in the Recycle Bin.');
      err.statusCode = 400;
      err.code = 'REGISTRATION_DELETED';
      throw err;
    }

    const now = new Date();
    const expDate = row.expires_at ? new Date(row.expires_at) : (row.event_date ? computeEventDayExpiration(row.event_date) : null);
    const isExpired = expDate ? now.getTime() > expDate.getTime() : false;
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
      const deletedCheck = await query('SELECT title, deleted_at FROM events WHERE id::text = $1', [eventId]);
      if (deletedCheck.rowCount && deletedCheck.rows[0].deleted_at) {
        const err: any = new Error(`Cannot check in: The event "${deletedCheck.rows[0].title}" is currently in the Recycle Bin.`);
        err.statusCode = 400;
        err.code = 'EVENT_DELETED';
        throw err;
      }
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

    const cleanInput = extractCleanTokenOrCode(tokenOrCode);

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
        `SELECT t.*, u.full_name, u.email, u.phone, u.avatar_url, u.organization, r.registered_at, r.answers, r.status as reg_status, r.deleted_at as reg_deleted_at
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         JOIN registrations r ON t.registration_id = r.id
         WHERE t.id = $1 AND t.event_id = $2`,
        [targetTicketId, realEventId]
      );
    } else {
      ticketRes = await query(
        `SELECT t.*, u.full_name, u.email, u.phone, u.avatar_url, u.organization, r.registered_at, r.answers, r.status as reg_status, r.deleted_at as reg_deleted_at
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         JOIN registrations r ON t.registration_id = r.id
         WHERE (UPPER(t.ticket_code) = UPPER($1) OR t.qr_token = $1 OR UPPER(u.full_name) = UPPER($1) OR u.email ILIKE $1) AND t.event_id = $2`,
        [cleanInput, realEventId]
      );
    }

    if (!ticketRes.rowCount || ticketRes.rowCount === 0) {
      const otherEvt = await query(
        `SELECT e.title FROM tickets t JOIN events e ON t.event_id = e.id JOIN users u ON t.user_id = u.id WHERE UPPER(t.ticket_code) = UPPER($1) OR t.qr_token = $1 OR UPPER(u.full_name) = UPPER($1) OR u.email ILIKE $1`,
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
    if (row.reg_deleted_at) {
      const err: any = new Error('Cannot check in: This attendee registration is currently in the Recycle Bin.');
      err.statusCode = 400;
      err.code = 'REGISTRATION_DELETED';
      throw err;
    }
    const now = new Date();
    const expDate = row.expires_at ? new Date(row.expires_at) : (row.event_date ? computeEventDayExpiration(row.event_date) : null);
    const isExpired = expDate ? now.getTime() > expDate.getTime() : false;
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
      const deletedCheck = await query('SELECT title, deleted_at FROM events WHERE id::text = $1', [eventId]);
      if (deletedCheck.rowCount && deletedCheck.rows[0].deleted_at) {
        const err: any = new Error(`Cannot check in: The event "${deletedCheck.rows[0].title}" is currently in the Recycle Bin.`);
        err.statusCode = 400;
        err.code = 'EVENT_DELETED';
        throw err;
      }
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
        `SELECT r.id, r.user_id, r.status, r.deleted_at, u.full_name, u.email 
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
      if (registration.deleted_at) {
        const err: any = new Error('Cannot check in: This registration is currently in the Recycle Bin.');
        err.statusCode = 400;
        err.code = 'REGISTRATION_DELETED';
        throw err;
      }
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
        const ticketExp = ticketRow.expires_at ? new Date(ticketRow.expires_at) : (event.date ? computeEventDayExpiration(event.date) : null);
        if (ticketExp && new Date().getTime() > ticketExp.getTime()) {
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
      await CacheService.delPattern(`event:${realEventId}*`);
      await CacheService.delPattern(`report:${realEventId}*`);
      if (eventId !== realEventId) {
        await CacheService.delPattern(`event:${eventId}*`);
        await CacheService.delPattern(`report:${eventId}*`);
        await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
      }
      await CacheService.delPattern('*http:*/api/reports*');
      await CacheService.delPattern(`events:list*`);
      await CacheService.delPattern(`*http:*/api/events/${realEventId}*`);
      await CacheService.delPattern(`*http:*user:${attendeeId}*`);
      await CacheService.delPattern('matching:recommendations:*');

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
      await CacheService.delPattern(`event:${realEventId}*`);
      await CacheService.delPattern(`report:${realEventId}*`);
      if (eventId !== realEventId) {
        await CacheService.delPattern(`event:${eventId}*`);
        await CacheService.delPattern(`report:${eventId}*`);
        await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
      }
      await CacheService.delPattern('*http:*/api/reports*');
      await CacheService.delPattern(`events:list*`);
      await CacheService.delPattern(`*http:*/api/events/${realEventId}*`);
      await CacheService.delPattern(`*http:*user:${attendeeId}*`);
      await CacheService.delPattern('matching:recommendations:*');

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
    answers?: Record<string, any>;
    paymentReference?: string;
    paymentMethod?: string;
    screenshotUrl?: string;
    screenshotBase64?: string;
    paymentStatus?: string;
  }) {
    const regStartTime = Date.now();
    const {
      eventId,
      organizerId,
      name,
      email,
      phone,
      userRole,
      answers = {},
      paymentReference,
      paymentMethod,
      screenshotUrl,
      screenshotBase64,
    } = params;

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

    const eventDate = event.rawDate || event.date;
    const expiresAt = computeEventDayExpiration(eventDate);
    if (new Date().getTime() > expiresAt.getTime() || event.isPassed || event.status === 'completed' || event.status === 'closed') {
      const err: any = new Error('This event has already passed. Registration is closed.');
      err.statusCode = 400;
      err.code = 'EVENT_PASSED';
      throw err;
    }

    if (event.status !== 'open' && event.status !== 'published') {
      const err: any = new Error('Registration for this event is closed.');
      err.statusCode = 400;
      throw err;
    }

    if (event.registeredCount >= event.capacity || event.isFull) {
      const err: any = new Error('Event has reached maximum capacity.');
      err.statusCode = 400;
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const err: any = new Error('Invalid email address format.');
      err.statusCode = 400;
      err.code = 'INVALID_EMAIL';
      throw err;
    }

    // Dynamic registration answers validation against event.customQuestions
    const customQuestions: any[] = Array.isArray(event.customQuestions) ? event.customQuestions : [];
    const submittedAnswers: Record<string, any> = { ...(answers || {}) };

    if (cleanPhone && !submittedAnswers.Phone && !submittedAnswers.phone) {
      submittedAnswers.Phone = cleanPhone;
    }

    for (const q of customQuestions) {
      const qVal = submittedAnswers[q.id];
      const isFilled =
        typeof qVal === 'string'
          ? qVal.trim().length > 0
          : Array.isArray(qVal)
            ? qVal.length > 0
            : qVal !== undefined && qVal !== null && qVal !== '';

      if (q.isRequired && !isFilled) {
        const err: any = new Error(`Please answer required question: "${q.questionText}"`);
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (isFilled) {
        const qType = (q.type || 'text').toLowerCase();
        if (['choice', 'select', 'radio', 'dropdown'].includes(qType) && q.options && q.options.length > 0) {
          const validSet = new Set(q.options.map((opt: string) => opt.trim()));
          if (typeof qVal === 'string' && !validSet.has(qVal.trim())) {
            const err: any = new Error(`Invalid selection for question: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            throw err;
          }
        } else if (['multi_choice', 'checkbox'].includes(qType) && q.options && q.options.length > 0) {
          const validSet = new Set(q.options.map((opt: string) => opt.trim()));
          const selectedList = Array.isArray(qVal)
            ? qVal
            : typeof qVal === 'string'
              ? qVal.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [];
          const hasInvalid = selectedList.some((item: string) => !validSet.has(item.trim()));
          if (hasInvalid) {
            const err: any = new Error(`Invalid options selected for question: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            throw err;
          }
        } else if (qType === 'email' && typeof qVal === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(qVal.trim())) {
            const err: any = new Error(`Please enter a valid email address for: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            throw err;
          }
        } else if (qType === 'date' && typeof qVal === 'string') {
          const d = new Date(qVal);
          if (isNaN(d.getTime())) {
            const err: any = new Error(`Please enter a valid date for: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            throw err;
          }
        } else if (['file', 'upload'].includes(qType)) {
          if (typeof qVal !== 'string' || !qVal.trim()) {
            const err: any = new Error(`Please provide a valid file upload for: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'INVALID_FILE_UPLOAD';
            throw err;
          }

          let parsedUrl: URL;
          try {
            parsedUrl = new URL(qVal.trim());
          } catch {
            const err: any = new Error(`Invalid URL format for uploaded file: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'INVALID_FILE_URL';
            throw err;
          }

          if (parsedUrl.protocol !== 'https:') {
            const err: any = new Error(`File upload URL must use secure HTTPS protocol for question: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'INSECURE_UPLOAD_URL';
            throw err;
          }

          if (parsedUrl.hostname !== 'res.cloudinary.com') {
            const err: any = new Error(`Untrusted file source. Uploads must be hosted on Cloudinary for question: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'UNAUTHORIZED_UPLOAD_HOST';
            throw err;
          }

          const pathname = parsedUrl.pathname.toLowerCase();
          if (!pathname.includes('/upload/')) {
            const err: any = new Error(`Invalid Cloudinary resource path for uploaded file: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'INVALID_UPLOAD_PATH';
            throw err;
          }

          const isPdfAllowed =
            (q.options && q.options.some((opt: string) => opt.toLowerCase().includes('pdf'))) ||
            q.questionText.toLowerCase().includes('resume') ||
            q.questionText.toLowerCase().includes('cv') ||
            q.questionText.toLowerCase().includes('document') ||
            q.questionText.toLowerCase().includes('pdf');

          const cleanPath = pathname.split('?')[0];
          const extMatch = cleanPath.match(/\.([a-z0-9]+)$/i);
          const ext = extMatch ? extMatch[1].toLowerCase() : '';

          const allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
          const allowedExts = isPdfAllowed ? [...allowedImageExts, 'pdf'] : allowedImageExts;

          if (ext && !allowedExts.includes(ext)) {
            const err: any = new Error(
              `Unsupported file format (.${ext}) for question "${q.questionText}". Allowed formats: ${allowedExts.map((e) => e.toUpperCase()).join(', ')}.`
            );
            err.statusCode = 400;
            err.code = 'UNSUPPORTED_FILE_TYPE';
            throw err;
          }

          if (pathname.includes('/raw/upload/') && ext !== 'pdf') {
            const err: any = new Error(`Unsupported raw file format for question "${q.questionText}". Only PDF documents are allowed.`);
            err.statusCode = 400;
            err.code = 'UNSUPPORTED_FILE_TYPE';
            throw err;
          }
        }
      }
    }

    const client = await getClient();
    let isExistingUser = false;
    let issuedTicketCode = '';
    let issuedQrDataUrl = '';
    let encryptedInitialPassword: any = null;

    try {
      await client.query('BEGIN');

      // 1. Identify or create user account
      let userId: string;
      const userLookup = await client.query('SELECT id, full_name, phone FROM users WHERE email = $1', [cleanEmail]);
      if (userLookup.rowCount && userLookup.rowCount > 0) {
        // Scenario A: Existing Sheeba Account (never modify password or must_change_password)
        isExistingUser = true;
        userId = userLookup.rows[0].id;
        if (cleanPhone && !userLookup.rows[0].phone) {
          await client.query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [cleanPhone, userId]);
        }
      } else {
        // Scenario B: New Sheeba Account (strong random initial password)
        isExistingUser = false;
        const initialPassword = generateRandomInitialPassword(12);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(initialPassword, salt);

        const userInsert = await client.query(
          `INSERT INTO users (email, password_hash, full_name, role, phone, visibility, approval_status, must_change_password)
           VALUES ($1, $2, $3, 'attendee', $4, 'public', 'approved', TRUE)
           RETURNING id`,
          [cleanEmail, passwordHash, cleanName, cleanPhone]
        );
        userId = userInsert.rows[0].id;

        // Encrypt the initial password using AES-256-GCM for short-lived delivery in outbox
        encryptedInitialPassword = encryptCredential(initialPassword);
      }

      // 2. Duplicate registration check: do not create duplicate registration or ticket!
      const regLookup = await client.query(
        `SELECT id, approval_status, payment_status FROM registrations WHERE event_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [realEventId, userId]
      );
      if (regLookup.rowCount && regLookup.rowCount > 0) {
        const err: any = new Error('This attendee is already registered for this event.');
        err.statusCode = 409;
        err.code = 'ALREADY_REGISTERED';
        throw err;
      }

      // 3. Payment verification for paid vs free events
      let isPaymentSettled = true;
      let effectivePaymentRef = paymentReference || null;
      let verifiedPaymentInfo: any = null;

      if (event.isPaid && event.ticketPrice > 0) {
        if (paymentReference || screenshotUrl || screenshotBase64) {
          // Verify via Links.et authoritative service (strict verification: unverified proof is never treated as paid)
          verifiedPaymentInfo = await PaymentService.verifyPayment({
            event: {
              id: realEventId,
              title: event.title,
              ticketPrice: event.ticketPrice,
              currency: event.currency,
              paymentMethods: event.paymentMethods,
            },
            paymentReference,
            paymentMethod,
            screenshotUrl,
            screenshotBase64,
          });
          isPaymentSettled = true;
          effectivePaymentRef = verifiedPaymentInfo?.transactionId || paymentReference || null;
        } else if (params.paymentStatus === 'settled') {
          // Explicit authorization check: only the event's organizer or an admin may mark offline payment as settled
          const isAuthorizedOrganizer = event.organizerId === organizerId || userRole === 'admin';
          if (!isAuthorizedOrganizer) {
            const err: any = new Error('Unauthorized: Only the verified event organizer or administrator may manually mark offline payments as settled.');
            err.statusCode = 403;
            err.code = 'UNAUTHORIZED_OFFLINE_SETTLEMENT';
            throw err;
          }
          isPaymentSettled = true;
        } else {
          // Unsettled / Pending payment
          isPaymentSettled = false;
        }
      }

      const regApprovalStatus = event.requiresApproval ? 'pending' : 'approved';
      const regPaymentStatus = isPaymentSettled ? 'settled' : 'unsettled';

      // 4. Create registration record
      const regInsert = await client.query(
        `INSERT INTO registrations (event_id, user_id, status, approval_status, answers, payment_reference, payment_status, notification_status)
         VALUES ($1, $2, 'registered', $3, $4, $5, $6, 'pending')
         RETURNING id`,
        [realEventId, userId, regApprovalStatus, JSON.stringify(submittedAnswers), effectivePaymentRef, regPaymentStatus]
      );
      const registrationId = regInsert.rows[0].id;

      // 5. Generate and activate QR ticket only when permitted by payment & approval rules
      let ticketId: string | null = null;
      if (isPaymentSettled && regApprovalStatus === 'approved') {
        const ticketCode = generateTicketCode(eventDate);
        const newTicketId: string = (await client.query('SELECT gen_random_uuid() AS id')).rows[0].id;
        ticketId = newTicketId;
        const qrToken = generateTicketToken(newTicketId, realEventId, eventDate);
        const frontendUrl = getFrontendUrl();
        const verifyUrl = `${frontendUrl}/verify-ticket?token=${encodeURIComponent(qrToken)}&code=${encodeURIComponent(ticketCode)}`;
        const qrPayload = [
          `SHEEBA VERIFIED PASS`,
          `Attendee: ${cleanName}`,
          `Email: ${cleanEmail}`,
          `Event: ${event.title}`,
          `Code: ${ticketCode}`,
          `Status: Valid`,
          `Verify: ${verifyUrl}`,
        ].join('\n');

        issuedQrDataUrl = await generateQrDataUrl(qrPayload);
        issuedTicketCode = ticketCode;

        await client.query(
          `INSERT INTO tickets (
            id, ticket_code, registration_id, event_id, user_id, qr_token, qr_code_data_url,
            status, is_paid, ticket_price, currency, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ISSUED', $8, $9, 'ETB', $10)`,
          [ticketId, ticketCode, registrationId, realEventId, userId, qrToken, issuedQrDataUrl, event.isPaid, event.ticketPrice, expiresAt]
        );

        // Record settled transaction in payments table if paid event with auditable settlement metadata
        if (event.isPaid && event.ticketPrice > 0) {
          const commission = event.ticketPrice * 0.03;
          const payout = event.ticketPrice - commission;
          const txId = verifiedPaymentInfo?.transactionId || effectivePaymentRef || `MANUAL-${crypto.randomUUID()}`;

          const providerAuditResponse = verifiedPaymentInfo?.rawReceipt || {
            settlement_type: 'manual_offline',
            settled_by_user_id: organizerId,
            settled_by_role: userRole || 'organizer',
            settlement_method: paymentMethod || 'cash_offline',
            settled_at: new Date().toISOString(),
            reason: 'Authorized manual offline settlement by event organizer at registration',
          };

          await client.query(
            `INSERT INTO payments (
              transaction_id, event_id, user_id, amount, commission_amount, organizer_payout,
              currency, status, payment_method, screenshot_url, provider_response, verified_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'ETB', 'SETTLED', $7, $8, $9, NOW())
            ON CONFLICT (transaction_id) DO NOTHING`,
            [
              txId,
              realEventId,
              userId,
              verifiedPaymentInfo?.amount || event.ticketPrice,
              commission,
              payout,
              verifiedPaymentInfo?.provider || paymentMethod || 'manual_offline',
              screenshotUrl || null,
              JSON.stringify(providerAuditResponse),
            ]
          );
        }
      }

      // 5b. Persist durable background notification job within the SAME transaction
      const jobPayload = isExistingUser
        ? {
            toEmail: cleanEmail,
            fullName: cleanName,
            eventTitle: event.title,
            ticketCode: issuedTicketCode || undefined,
            qrDataUrl: issuedQrDataUrl || undefined,
            isPaymentPending: !isPaymentSettled,
            eventId: realEventId,
          }
        : {
            toEmail: cleanEmail,
            fullName: cleanName,
            eventTitle: event.title,
            encryptedInitialPassword,
            ticketCode: issuedTicketCode || undefined,
            qrDataUrl: issuedQrDataUrl || undefined,
            isPaymentPending: !isPaymentSettled,
            eventId: realEventId,
          };

      await NotificationQueueService.enqueueJob(client, {
        registrationId,
        recipientEmail: cleanEmail,
        recipientName: cleanName,
        jobType: isExistingUser ? 'manual_registration_existing_user' : 'manual_registration_new_user',
        payload: jobPayload,
      });

      await client.query('COMMIT');

      const regDurationMs = Date.now() - regStartTime;
      console.log(`[CheckinService] ⚡ Manual registration committed in ${regDurationMs}ms (Registration ID: ${registrationId}).`);

      // Trigger asynchronous background email delivery immediately after commit without blocking
      NotificationQueueService.triggerAsyncProcessing();

      // Invalidate caches
      await CacheService.delPattern(`event:${realEventId}*`);
      await CacheService.delPattern(`report:${realEventId}*`);
      await CacheService.delPattern(`events:list*`);
      await CacheService.delPattern(`*http:*/api/events/${realEventId}*`);
      await CacheService.delPattern(`*http:*user:${userId}*`);

      let updatedAttendee: any = null;
      try {
        updatedAttendee = await this.lookupAttendee(realEventId, userId);
      } catch {
        updatedAttendee = {
          id: userId,
          attendeeId: userId,
          registrationId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          status: 'registered',
          paymentStatus: regPaymentStatus,
          answers: submittedAnswers,
          notificationStatus: 'pending',
        };
      }

      const successNotice = isExistingUser
        ? `Successfully registered "${cleanName}"! Registration confirmed; invitation email queued.`
        : `Successfully registered "${cleanName}"! Registration confirmed; account setup email queued.`;

      return {
        success: true,
        message: successNotice,
        isExistingUser,
        isPaymentSettled,
        notificationStatus: 'pending',
        registrationId,
        rosterItem: updatedAttendee,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505' && String(err.detail || '').includes('unique_event_user_registration')) {
        const conflictErr: any = new Error('This attendee is already registered for this event.');
        conflictErr.statusCode = 409;
        conflictErr.code = 'ALREADY_REGISTERED';
        throw conflictErr;
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Resend manual registration email notification to an attendee
   */
  static async resendManualNotification(params: {
    eventId: string;
    registrationId: string;
    organizerId: string;
    userRole?: UserRole;
  }): Promise<{ success: boolean; message: string }> {
    const { eventId, registrationId, organizerId, userRole } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (event.organizerId !== organizerId && userRole && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    // Enforce server-side 2-minute cooldown per registration atomically (prevents concurrent race conditions)
    const cooldownRes = await query(
      `UPDATE registrations 
       SET notification_sent_at = NOW() 
       WHERE id = $1 AND (notification_sent_at IS NULL OR notification_sent_at < NOW() - INTERVAL '2 minutes')
       RETURNING id, notification_sent_at`,
      [registrationId]
    );

    if (!cooldownRes.rowCount || cooldownRes.rowCount === 0) {
      const err: any = new Error('Notification resend cooldown active. Please wait 2 minutes between notification attempts for this registration.');
      err.statusCode = 429;
      err.code = 'RESEND_COOLDOWN_ACTIVE';
      throw err;
    }

    const regRes = await query(
      `SELECT r.id, r.event_id, r.user_id, r.payment_status, r.approval_status,
              u.email, u.full_name, u.password_hash, u.google_id, u.must_change_password,
              t.ticket_code, t.qr_code_data_url
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN tickets t ON t.registration_id = r.id
       WHERE r.id = $1 AND r.event_id = $2`,
      [registrationId, event.id]
    );

    if (!regRes.rowCount || regRes.rowCount === 0) {
      const err: any = new Error('Registration record not found.');
      err.statusCode = 404;
      throw err;
    }

    const reg = regRes.rows[0];
    const isPaymentSettled = reg.payment_status === 'settled';

    // Account state check: determine if attendee still requires initial password onboarding
    const isNewUserNeedingSetup = Boolean(reg.must_change_password);

    let jobPayload: Record<string, any>;
    let jobType: 'manual_registration_new_user' | 'manual_registration_existing_user';

    if (isNewUserNeedingSetup) {
      jobType = 'manual_registration_new_user';
      // Generate a fresh cryptographically secure random initial password
      const freshInitialPassword = generateRandomInitialPassword(12);
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(freshInitialPassword, salt);

      await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, reg.user_id]);
      const encryptedInitialPassword = encryptCredential(freshInitialPassword);

      jobPayload = {
        toEmail: reg.email,
        fullName: reg.full_name,
        eventTitle: event.title,
        encryptedInitialPassword,
        ticketCode: reg.ticket_code || undefined,
        qrDataUrl: reg.qr_code_data_url || undefined,
        isPaymentPending: !isPaymentSettled,
        eventId: event.id,
      };
    } else {
      jobType = 'manual_registration_existing_user';
      jobPayload = {
        toEmail: reg.email,
        fullName: reg.full_name,
        eventTitle: event.title,
        ticketCode: reg.ticket_code || undefined,
        qrDataUrl: reg.qr_code_data_url || undefined,
        isPaymentPending: !isPaymentSettled,
        eventId: event.id,
      };
    }

    await query(
      `UPDATE registrations 
       SET notification_status = 'pending', notification_error = NULL 
       WHERE id = $1`,
      [registrationId]
    );

    await NotificationQueueService.enqueueJob(
      { query },
      {
        registrationId,
        recipientEmail: reg.email,
        recipientName: reg.full_name,
        jobType,
        payload: jobPayload,
      }
    );

    NotificationQueueService.triggerAsyncProcessing();

    return {
      success: true,
      message: `Registration notification queued for delivery to ${reg.email}.`,
    };
  }
}

