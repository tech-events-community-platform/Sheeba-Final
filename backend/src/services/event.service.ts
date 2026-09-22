    import { query, getClient } from '../config/db';
import { IEvent, EventType, EventStatus, UserRole, AttendeeRosterItem } from '../types';
import { generateTicketToken, generateQrDataUrl, generateTicketCode, computeEventDayExpiration } from '../utils/qr.util';
import { EmailService } from './email.service';

export class EventService {
  static formatEvent(row: any): any {
    const isPaid = Boolean(row.is_paid);
    const ticketPrice = parseFloat(row.ticket_price || '0');

    let formattedDate = '2026-09-20';
    if (row.event_date) {
      try {
        const d = new Date(row.event_date);
        formattedDate = d.toISOString().split('T')[0];
      } catch {
        formattedDate = String(row.event_date);
      }
    }

    const registeredCount = parseInt(row.registered_count || '0', 10);
    const capacity = parseInt(row.capacity || '100', 10);
    const isFull = registeredCount >= capacity;
    const posterImageUrl = row.poster_image_url || row.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
    const posterUrl = row.poster_image_url || row.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

    return {
      id: row.id,
      organizerId: row.organizer_id,
      organizerName: row.organizer_organization || row.organization || row.organizer_name || 'Organizer',
      organizationName: row.organizer_organization || row.organization || '',
      organizerEmail: row.organizer_email || '',
      title: row.title,
      description: row.description,
      type: (row.event_type || 'workshop') as EventType,
      category: row.category || 'Tech',
      date: formattedDate,
      rawDate: row.event_date,
      startTime: row.start_time || '09:00 AM',
      endTime: row.end_time || '05:00 PM',
      time: row.time_str || `${row.start_time || '09:00 AM'} - ${row.end_time || '05:00 PM'} EAT`,
      location: row.location,
      venueName: row.venue_name || row.location,
      capacity,
      registeredCount,
      checkedInCount: parseInt(row.checked_in_count || '0', 10),
      isFull,
      status: row.status || 'open',
      isPaid,
      ticketPrice,
      currency: row.currency || 'ETB',
      shareLinkToken: row.share_link_token || row.id,
      customQuestions: typeof row.custom_questions === 'string' ? JSON.parse(row.custom_questions) : row.custom_questions || [],
      bannerUrl: posterUrl,
      posterImageUrl: posterUrl,
      createdAt: row.created_at,
    };
  }

  static async createEvent(
    organizerId: string,
    data: {
      title: string;
      description: string;
      type?: EventType;
      date: string;
      startTime?: string;
      endTime?: string;
      location: string;
      venueName?: string;
      capacity: number;
      isPaid?: boolean;
      ticketPrice?: number;
      customQuestions?: any[];
      bannerUrl?: string;
      posterImageUrl?: string;
      organizerName?: string;
    }
  ): Promise<any> {
    const {
      title,
      description,
      type = 'workshop',
      date,
      startTime = '09:00 AM',
      endTime = '05:00 PM',
      location,
      venueName = location,
      capacity,
      isPaid = false,
      ticketPrice = 0,
      customQuestions = [],
      bannerUrl,
      posterImageUrl,
    } = data;

    const poster = posterImageUrl || bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
    const timeStr = `${startTime} - ${endTime} EAT`;
    const shareLinkToken = `shb-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query(
      `INSERT INTO events (
        organizer_id, title, description, event_type, category, event_date,
        start_time, end_time, time_str, location, venue_name, capacity,
        status, is_paid, ticket_price, currency, share_link_token,
        custom_questions, banner_url, poster_image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open', $13, $14, 'ETB', $15, $16, $17, $18)
      RETURNING *`,
      [
        organizerId,
        title,
        description,
        type,
        type.charAt(0).toUpperCase() + type.slice(1),
        new Date(date),
        startTime,
        endTime,
        timeStr,
        location,
        venueName,
        capacity,
        isPaid,
        ticketPrice,
        shareLinkToken,
        JSON.stringify(customQuestions),
        poster,
        poster,
      ]
    );

    const insertedEvent = result.rows[0];
    const userRes = await query('SELECT full_name, organization, email FROM users WHERE id = $1', [organizerId]);
    const userRow = userRes.rows[0] || {};

    return this.formatEvent({
      ...insertedEvent,
      organizer_name: userRow.full_name,
      organizer_organization: userRow.organization,
      organizer_email: userRow.email,
    });
  }

  static async getEvents(filters: {
    search?: string;
    type?: string;
    status?: string;
    organizerId?: string;
  } = {}) {
    const { search, type, status, organizerId } = filters;

    const conditions: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (organizerId) {
      conditions.push(`e.organizer_id = $${counter++}`);
      values.push(organizerId);
    }

    if (status && status !== 'All') {
      conditions.push(`e.status = $${counter++}`);
      values.push(status);
    }

    if (type && type !== 'All') {
      conditions.push(`e.event_type = $${counter++}`);
      values.push(type);
    }

    if (search) {
      conditions.push(`(e.title ILIKE $${counter} OR e.description ILIKE $${counter} OR e.location ILIKE $${counter} OR u.full_name ILIKE $${counter})`);
      values.push(`%${search}%`);
      counter++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Section 2: Count registered rows, count non-voided check_ins (or checked-in tickets) on request
    const queryText = `
      SELECT 
        e.*,
        u.full_name AS organizer_name,
        u.organization AS organizer_organization,
        u.email AS organizer_email,
        COUNT(DISTINCT r.id) AS registered_count,
        COUNT(DISTINCT CASE WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) OR t.status = 'CHECKED_IN' THEN r.id END) AS checked_in_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
      LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
      LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
      ${whereClause}
      GROUP BY e.id, u.id
      ORDER BY e.event_date DESC
    `;

    const result = await query(queryText, values);
    return result.rows.map(this.formatEvent);
  }

  static async getEventById(identifier: string): Promise<any> {
    const queryText = `
      SELECT 
        e.*,
        u.full_name AS organizer_name,
        u.organization AS organizer_organization,
        u.email AS organizer_email,
        COUNT(DISTINCT r.id) AS registered_count,
        COUNT(DISTINCT CASE WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) OR t.status = 'CHECKED_IN' THEN r.id END) AS checked_in_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
      LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
      LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
      WHERE e.id::text = $1 OR e.share_link_token = $1
      GROUP BY e.id, u.id
    `;

    const result = await query(queryText, [identifier]);

    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    return this.formatEvent(result.rows[0]);
  }

  static async updateEvent(
    eventId: string,
    userId: string,
    userRole: UserRole,
    data: Partial<IEvent>
  ): Promise<any> {
    const existing = await query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (!existing.rowCount || existing.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (existing.rows[0].organizer_id !== userId && userRole !== 'admin') {
      const err: any = new Error('You are not authorized to update this event.');
      err.statusCode = 403;
      throw err;
    }

    const fields: string[] = [];
    const values: any[] = [];
    let counter = 1;

    const allowedFields = [
      'title',
      'description',
      'event_type',
      'location',
      'venue_name',
      'capacity',
      'status',
      'is_paid',
      'ticket_price',
      'event_date',
      'start_time',
      'end_time',
      'time_str',
      'banner_url',
      'poster_image_url',
      'custom_questions',
    ];

    const inputData = { ...data };
    if ((inputData.startTime || inputData.endTime) && !inputData.time && !inputData.time_str) {
      const sTime = inputData.startTime || (existing.rows[0] as any).start_time || '09:00 AM';
      const eTime = inputData.endTime || (existing.rows[0] as any).end_time || '05:00 PM';
      (inputData as any).time_str = `${sTime} - ${eTime} EAT`;
    }

    for (const [key, value] of Object.entries(inputData)) {
      const dbKey =
        key === 'type'
          ? 'event_type'
          : key === 'ticketPrice'
          ? 'ticket_price'
          : key === 'isPaid'
          ? 'is_paid'
          : key === 'date'
          ? 'event_date'
          : key === 'startTime'
          ? 'start_time'
          : key === 'endTime'
          ? 'end_time'
          : key === 'time'
          ? 'time_str'
          : key === 'venueName'
          ? 'venue_name'
          : key === 'posterImageUrl'
          ? 'poster_image_url'
          : key === 'bannerUrl'
          ? 'banner_url'
          : key === 'customQuestions'
          ? 'custom_questions'
          : key;
      if (allowedFields.includes(dbKey)) {
        fields.push(`${dbKey} = $${counter++}`);
        values.push(
          dbKey === 'custom_questions'
            ? typeof value === 'string'
              ? value
              : JSON.stringify(value || [])
            : dbKey === 'event_date'
            ? new Date(value as string)
            : value
        );
      }
    }

    if (fields.length === 0) {
      return this.getEventById(eventId);
    }

    fields.push('updated_at = NOW()');
    values.push(eventId);

    const queryText = `
      UPDATE events
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;

    await query(queryText, values);
    return this.getEventById(eventId);
  }

  static async deleteEvent(eventId: string, userId: string, userRole: UserRole): Promise<boolean> {
    const existing = await query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (!existing.rowCount || existing.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (existing.rows[0].organizer_id !== userId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized to delete this event.');
      err.statusCode = 403;
      throw err;
    }

    await query('DELETE FROM events WHERE id = $1', [eventId]);
    return true;
  }

  static async registerForEvent(params: {
    eventId: string;
    userId: string;
    answers?: Record<string, any>;
    paymentReference?: string;
  }): Promise<{ ticket: any; isPaymentRequired: boolean; checkoutUrl?: string }> {
    const { eventId, userId, answers = {}, paymentReference } = params;

    const event = await this.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
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

    // Reject duplicate registration server-side (Section 3)
    const existingReg = await query('SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2', [event.id, userId]);
    if (existingReg.rowCount && existingReg.rowCount > 0) {
      const err: any = new Error('You are already registered for this event.');
      err.statusCode = 409;
      throw err;
    }

    // Handle Paid Event Check (Chapa ETB)
    if (event.isPaid && !paymentReference) {
      return {
        ticket: null,
        isPaymentRequired: true,
        checkoutUrl: `https://checkout.chapa.co/checkout/payment-simulation?amount=${event.ticketPrice}&currency=ETB`,
      };
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const regRes = await client.query(
        `INSERT INTO registrations (event_id, user_id, status, answers, payment_reference, payment_status)
         VALUES ($1, $2, 'registered', $3, $4, 'settled')
         RETURNING id`,
        [event.id, userId, JSON.stringify(answers), paymentReference || null]
      );
      const registrationId = regRes.rows[0].id;

      const eventDate = event.rawDate || event.date;
      const ticketCode = generateTicketCode(eventDate);
      const ticketId = (await client.query('SELECT gen_random_uuid() AS id')).rows[0].id;
      const expiresAt = computeEventDayExpiration(eventDate);
      const qrToken = generateTicketToken(ticketId, event.id, eventDate);
      const qrDataUrl = await generateQrDataUrl(qrToken);

      const ticketRes = await client.query(
        `INSERT INTO tickets (
          id, ticket_code, registration_id, event_id, user_id, qr_token, qr_code_data_url,
          status, is_paid, ticket_price, currency, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ISSUED', $8, $9, 'ETB', $10)
        RETURNING *`,
        [ticketId, ticketCode, registrationId, event.id, userId, qrToken, qrDataUrl, event.isPaid, event.ticketPrice, expiresAt]
      );

      // Record Chapa payment transaction if paid
      if (event.isPaid && event.ticketPrice > 0) {
        const commission = event.ticketPrice * 0.03;
        const payout = event.ticketPrice - commission;
        const txId = paymentReference || `TX-CHAPA-${Math.floor(100000 + Math.random() * 900000)}`;

        await client.query(
          `INSERT INTO payments (transaction_id, event_id, user_id, amount, commission_amount, organizer_payout, currency, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'ETB', 'SETTLED')
           ON CONFLICT (transaction_id) DO NOTHING`,
          [txId, event.id, userId, event.ticketPrice, commission, payout]
        );
      }

      await client.query('COMMIT');

      const rawTicket = ticketRes.rows[0];
      const userRes = await query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
      const attendeeUser = userRes.rows[0] || {};

      const formattedTicket = {
        id: rawTicket.ticket_code || rawTicket.id,
        registrationId,
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.type,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        attendeeId: userId,
        attendeeName: attendeeUser.full_name,
        attendeeEmail: attendeeUser.email,
        qrToken: rawTicket.qr_token,
        qrDataUrl: rawTicket.qr_code_data_url,
        status: 'Valid',
        issuedAt: rawTicket.created_at,
        expiresAt: rawTicket.expires_at,
        isPaid: rawTicket.is_paid,
        ticketPrice: rawTicket.ticket_price,
        currency: 'ETB',
      };

      // Trigger separate registration-confirmation email with date, time, location (Section 4)
      try {
        if (attendeeUser.email) {
          await EmailService.sendRegistrationConfirmationEmail(
            attendeeUser.email,
            attendeeUser.full_name || 'Attendee',
            event.title,
            event.date,
            event.time,
            event.location
          );
        }
      } catch (emailErr) {
        console.warn('Registration confirmation email dispatch failed:', emailErr);
      }

      return { ticket: formattedTicket, isPaymentRequired: false };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getEventRoster(eventId: string, userId?: string, userRole?: string): Promise<AttendeeRosterItem[]> {
    const event = await this.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (userId && event.organizerId !== userId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    const queryText = `
      SELECT 
        r.id AS roster_id,
        r.id AS registration_id,
        u.id AS attendee_id,
        u.full_name AS name,
        u.email,
        r.registered_at,
        r.answers,
        ci.id AS check_in_id,
        ci.approved_at AS check_in_time,
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
      WHERE r.event_id = $1 AND r.status = 'registered'
      GROUP BY r.id, u.id, ci.id, t.id
      ORDER BY r.registered_at ASC
    `;

    const result = await query(queryText, [event.id]);

    return result.rows.map((row) => {
      const isCheckedIn = Boolean((row.check_in_id && !row.voided_at) || row.ticket_status === 'CHECKED_IN');
      const checkInTimeDate = row.check_in_time;
      return {
        id: row.attendee_id,
        registrationId: row.registration_id,
        attendeeId: row.attendee_id,
        name: row.name,
        email: row.email,
        registrationDate: new Date(row.registered_at).toISOString().split('T')[0],
        status: isCheckedIn ? 'Checked in' : 'Registered',
        checkInTime: checkInTimeDate
          ? new Date(checkInTimeDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' EAT'
          : undefined,
        badges: row.badges || [],
        answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {},
      };
    });
  }
}
