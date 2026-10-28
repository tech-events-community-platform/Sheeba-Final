import { query, getClient } from '../config/db';
import { IEvent, EventType, EventStatus, UserRole, AttendeeRosterItem, RegistrationQuestion, RegistrationApprovalStatus, PaymentDestination } from '../types';
import { generateTicketToken, generateQrDataUrl, generateTicketCode, computeEventDayExpiration } from '../utils/qr.util';
import { EmailService } from './email.service';
import { CacheService } from './cache.service';
import { PaymentService } from './payment.service';
import { getFrontendUrl } from '../config/env';

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

    const expDate = computeEventDayExpiration(row.event_date || formattedDate);
    const now = new Date();
    const isPassed = now.getTime() > expDate.getTime();

    const startOfDayEAT = new Date(expDate.getTime() - 24 * 60 * 60 * 1000 + 1);
    let timeState: 'ongoing' | 'upcoming' | 'past' = 'upcoming';
    if (isPassed) {
      timeState = 'past';
    } else if (now.getTime() >= startOfDayEAT.getTime() && now.getTime() <= expDate.getTime()) {
      timeState = 'ongoing';
    }

    let effectiveStatus = row.status || 'open';
    if (isPassed && (effectiveStatus === 'open' || effectiveStatus === 'published')) {
      effectiveStatus = 'completed';
    }

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
      isFull: isFull || isPassed,
      status: effectiveStatus,
      rawStatus: row.status || 'open',
      isPassed,
      timeState,
      isPaid,
      ticketPrice,
      isPublicized: Boolean(row.is_publicized),
      currency: row.currency || 'ETB',
      paymentMethods: typeof row.payment_methods === 'string' ? JSON.parse(row.payment_methods) : row.payment_methods || [],
      requiresApproval: Boolean(row.requires_approval),
      shareLinkToken: row.share_link_token || row.id,
      customQuestions: typeof row.custom_questions === 'string' ? JSON.parse(row.custom_questions) : row.custom_questions || [],
      bannerUrl: posterUrl,
      posterImageUrl: posterUrl,
      expiresAt: expDate.toISOString(),
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
      isPublicized?: boolean;
      requiresApproval?: boolean;
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
      isPublicized = false,
      paymentMethods = [],
      requiresApproval = false,
      customQuestions = [],
      bannerUrl,
      posterImageUrl,
    } = data as any;

    const poster = posterImageUrl || bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
    const timeStr = `${startTime} - ${endTime} EAT`;
    const shareLinkToken = `shb-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query(
      `INSERT INTO events (
        organizer_id, title, description, event_type, category, event_date,
        start_time, end_time, time_str, location, venue_name, capacity,
        status, is_paid, is_publicized, ticket_price, currency, share_link_token,
        custom_questions, banner_url, poster_image_url, requires_approval, payment_methods
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open', $13, $14, $15, 'ETB', $16, $17, $18, $19, $20, $21)
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
        Boolean(isPublicized),
        ticketPrice,
        shareLinkToken,
        JSON.stringify(customQuestions),
        poster,
        poster,
        Boolean(requiresApproval),
        JSON.stringify(paymentMethods || []),
      ]
    );

    const insertedEvent = result.rows[0];
    const userRes = await query('SELECT full_name, organization, email FROM users WHERE id = $1', [organizerId]);
    const userRow = userRes.rows[0] || {};

    const formatted = this.formatEvent({
      ...insertedEvent,
      organizer_name: userRow.full_name,
      organizer_organization: userRow.organization,
      organizer_email: userRow.email,
    });

    // Invalidate cached event lists
    await CacheService.delPattern('events:list*');
    await CacheService.delPattern('*http:*/api/events*');
    await CacheService.delPattern('matching:recommendations:*');

    return formatted;
  }

  static async getEvents(filters: {
    search?: string;
    type?: string;
    status?: string;
    organizerId?: string;
    isPublicized?: boolean | string;
  } = {}) {
    const cacheKey = `events:list:${JSON.stringify(filters || {})}`;
    const cached = await CacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { search, type, status, organizerId, isPublicized } = filters;

    const conditions: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (organizerId) {
      conditions.push(`e.organizer_id = $${counter++}`);
      values.push(organizerId);
    }

    if (isPublicized !== undefined) {
      if (isPublicized === true || isPublicized === 'true') {
        conditions.push(`e.is_publicized = TRUE`);
      } else if (isPublicized === false || isPublicized === 'false') {
        conditions.push(`e.is_publicized = FALSE`);
      }
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
        COUNT(DISTINCT CASE 
          WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
            OR t.status IN ('CHECKED_IN', 'Used')
            OR (b.id IS NOT NULL AND b.revoked_at IS NULL)
          THEN r.id 
        END) AS checked_in_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
      LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
      LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
      LEFT JOIN badge_awards b ON b.event_id = e.id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
      ${whereClause}
      GROUP BY e.id, u.id
      ORDER BY e.event_date DESC
    `;

    const result = await query(queryText, values);
    const events = result.rows.map(this.formatEvent);
    await CacheService.set(cacheKey, events, 30);
    return events;
  }

  static async getEventById(identifier: string): Promise<any> {
    const cacheKey = `event:${identifier}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryText = `
      SELECT 
        e.*,
        u.full_name AS organizer_name,
        u.organization AS organizer_organization,
        u.email AS organizer_email,
        COUNT(DISTINCT r.id) AS registered_count,
        COUNT(DISTINCT CASE 
          WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
            OR t.status IN ('CHECKED_IN', 'Used')
            OR (b.id IS NOT NULL AND b.revoked_at IS NULL)
          THEN r.id 
        END) AS checked_in_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
      LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
      LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
      LEFT JOIN badge_awards b ON b.event_id = e.id AND b.user_id = r.user_id AND b.badge_code = 'attended' AND b.revoked_at IS NULL
      WHERE e.id::text = $1 OR e.share_link_token = $1
      GROUP BY e.id, u.id
    `;

    const result = await query(queryText, [identifier]);

    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    const formatted = this.formatEvent(result.rows[0]);
    await CacheService.set(cacheKey, formatted, 60);
    if (formatted.id && formatted.id !== identifier) {
      await CacheService.set(`event:${formatted.id}`, formatted, 60);
    }
    if (formatted.shareLinkToken && formatted.shareLinkToken !== identifier) {
      await CacheService.set(`event:${formatted.shareLinkToken}`, formatted, 60);
    }

    return formatted;
  }

  static async updateEvent(
    eventId: string,
    userId: string,
    userRole: UserRole,
    data: any
  ): Promise<any> {
    const existing = await query(
      'SELECT id, organizer_id, share_link_token, start_time, end_time FROM events WHERE id::text = $1 OR share_link_token = $1',
      [eventId]
    );
    if (!existing.rowCount || existing.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const realId = (existing.rows[0] as any).id;

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
      'is_publicized',
      'ticket_price',
      'event_date',
      'start_time',
      'end_time',
      'time_str',
      'banner_url',
      'poster_image_url',
      'custom_questions',
      'requires_approval',
      'payment_methods',
    ];

    const inputData: any = { ...data };
    if ((inputData.startTime || inputData.endTime) && !inputData.time && !inputData.time_str) {
      const sTime = inputData.startTime || (existing.rows[0] as any).start_time || '09:00 AM';
      const eTime = inputData.endTime || (existing.rows[0] as any).end_time || '05:00 PM';
      inputData.time_str = `${sTime} - ${eTime} EAT`;
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
                              : key === 'paymentMethods'
                                ? 'payment_methods'
                                : key === 'isPublicized'
                                  ? 'is_publicized'
                                  : key === 'requiresApproval'
                                    ? 'requires_approval'
                                    : key;
      if (allowedFields.includes(dbKey)) {
        fields.push(`${dbKey} = $${counter++}`);
        values.push(
          dbKey === 'requires_approval'
            ? Boolean(value)
            : dbKey === 'custom_questions' || dbKey === 'payment_methods'
              ? typeof value === 'string'
                ? value
                : JSON.stringify(value || [])
              : dbKey === 'event_date'
                ? new Date(value as string)
                : dbKey === 'is_publicized'
                  ? Boolean(value)
                  : value
        );
      }
    }

    if (fields.length === 0) {
      return this.getEventById(realId);
    }

    fields.push('updated_at = NOW()');
    values.push(realId);

    const queryText = `
      UPDATE events
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;

    await query(queryText, values);
    await CacheService.delPattern('events:list*');
    await CacheService.delPattern(`event:${realId}*`);
    await CacheService.delPattern(`event:${eventId}*`);
    if ((existing.rows[0] as any)?.share_link_token) {
      await CacheService.delPattern(`event:${(existing.rows[0] as any).share_link_token}*`);
    }
    await CacheService.delPattern(`*http:*/api/events/${realId}*`);
    await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
    await CacheService.delPattern('*http:*/api/events*');
    await CacheService.del(`report:${realId}`);
    await CacheService.del(`report:${eventId}`);
    await CacheService.delPattern('matching:recommendations:*');
    return this.getEventById(realId);
  }

  static async deleteEvent(eventId: string, userId: string, userRole: UserRole): Promise<boolean> {
    const existing = await query(
      'SELECT id, organizer_id, share_link_token FROM events WHERE id::text = $1 OR share_link_token = $1',
      [eventId]
    );
    if (!existing.rowCount || existing.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const realId = (existing.rows[0] as any).id;

    if (existing.rows[0].organizer_id !== userId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized to delete this event.');
      err.statusCode = 403;
      throw err;
    }

    await query('DELETE FROM events WHERE id = $1', [realId]);
    await CacheService.delPattern('events:list*');
    await CacheService.delPattern(`event:${realId}*`);
    await CacheService.delPattern(`event:${eventId}*`);
    if ((existing.rows[0] as any)?.share_link_token) {
      await CacheService.delPattern(`event:${(existing.rows[0] as any).share_link_token}*`);
    }
    await CacheService.del(`event:${realId}:roster`);
    await CacheService.del(`event:${eventId}:roster`);
    await CacheService.delPattern(`*http:*/api/events/${realId}*`);
    await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
    await CacheService.delPattern('*http:*/api/events*');
    await CacheService.del(`report:${realId}`);
    await CacheService.del(`report:${eventId}`);
    await CacheService.delPattern('matching:recommendations:*');
    return true;
  }

  static async registerForEvent(params: {
    eventId: string;
    userId: string;
    answers?: Record<string, any>;
    paymentReference?: string;
    paymentMethod?: string;
    screenshotUrl?: string;
    screenshotBase64?: string;
  }): Promise<{
    ticket: any;
    isPaymentRequired: boolean;
    checkoutUrl?: string;
    registrationId?: string;
    isPendingApproval?: boolean;
    approvalStatus?: string;
    requiresApproval?: boolean;
    message?: string;
    verifiedPayment?: any;
  }> {
    const { eventId, userId, answers = {}, paymentReference, paymentMethod, screenshotUrl, screenshotBase64 } = params;

    const event = await this.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
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

    // Validate registration answers dynamically against event.customQuestions (Step 6)
    const customQuestions: RegistrationQuestion[] = Array.isArray(event.customQuestions)
      ? event.customQuestions
      : [];

    for (const q of customQuestions) {
      const qVal = answers[q.id];
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

      // If answered and options are configured, validate option selection
      if (isFilled && q.options && q.options.length > 0) {
        const validOptionSet = new Set(q.options.map((opt: string) => opt.trim()));
        if (['choice', 'select', 'radio'].includes(q.type || '')) {
          if (typeof qVal === 'string' && !validOptionSet.has(qVal.trim())) {
            const err: any = new Error(`Invalid selection for question: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            throw err;
          }
        } else if (['multi_choice', 'checkbox'].includes(q.type || '')) {
          const selectedList = Array.isArray(qVal)
            ? qVal
            : typeof qVal === 'string'
              ? qVal.split(',').map((s: string) => s.trim())
              : [];
          const hasInvalid = selectedList.some((item: string) => !validOptionSet.has(item.trim()));
          if (hasInvalid) {
            const err: any = new Error(`Invalid options selected for question: "${q.questionText}".`);
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            throw err;
          }
        }
      }

      // Validate file/upload questions
      if (isFilled && ['file', 'upload'].includes(q.type || '')) {
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

    // Reject duplicate registration or handle pending/rejected/payment completion
    const existingReg = await query(
      'SELECT id, approval_status, payment_status FROM registrations WHERE event_id = $1 AND user_id = $2',
      [event.id, userId]
    );

    if (existingReg.rowCount && existingReg.rowCount > 0) {
      const regRow = existingReg.rows[0] as any;
      const existingStatus = regRow.approval_status;

      // Case 1: Approved attendee completing ticket payment
      if (existingStatus === 'approved' && event.isPaid && paymentReference && regRow.payment_status !== 'settled') {
        // Proceed to ticket generation below using existing registration
      } else if (existingStatus === 'pending') {
        const err: any = new Error('Your application for this event is currently under review by the organizer.');
        err.statusCode = 409;
        err.code = 'REGISTRATION_PENDING';
        throw err;
      } else if (existingStatus === 'rejected') {
        const err: any = new Error('Your application for this event was not accepted.');
        err.statusCode = 409;
        err.code = 'REGISTRATION_REJECTED';
        throw err;
      } else {
        const err: any = new Error('You are already registered for this event.');
        err.statusCode = 409;
        throw err;
      }
    }

    const requiresApproval = Boolean(event.requiresApproval);

    // Case 2: Event requires manual organizer approval
    if (requiresApproval && (!existingReg.rowCount || existingReg.rows[0]?.approval_status !== 'approved')) {
      const client = await getClient();
      try {
        await client.query('BEGIN');

        const regRes = await client.query(
          `INSERT INTO registrations (event_id, user_id, status, approval_status, answers, payment_reference, payment_status)
           VALUES ($1, $2, 'registered', 'pending', $3, $4, 'unsettled')
           RETURNING id`,
          [event.id, userId, JSON.stringify(answers), paymentReference || null]
        );
        const registrationId = regRes.rows[0].id;

        await client.query('COMMIT');

        await CacheService.delPattern('events:list*');
        await CacheService.delPattern(`event:${event.id}*`);
        await CacheService.delPattern(`event:${event.id}:roster*`);
        await CacheService.delPattern(`*http:*/api/events/${event.id}*`);
        await CacheService.del(`report:${event.id}`);

        const userRes = await query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
        const attendeeUser = userRes.rows[0] || {};

        try {
          if (attendeeUser.email) {
            await EmailService.sendApplicationSubmittedPendingEmail(
              attendeeUser.email,
              attendeeUser.full_name || 'Attendee',
              event.title
            );
          }
        } catch (emailErr) {
          console.warn('Failed to dispatch application pending email:', emailErr);
        }

        return {
          ticket: null,
          registrationId,
          isPaymentRequired: false,
          isPendingApproval: true,
          approvalStatus: 'pending',
          requiresApproval: true,
          message: 'Your application has been submitted and is pending organizer approval.',
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Case 3: Standard Instant Pass or Approved Attendee Settling Payment
    // For paid events, perform authoritative Links.et bank verification
    let verifiedPaymentInfo: any = null;
    if (event.isPaid && event.ticketPrice > 0) {
      if (!paymentReference && !screenshotUrl && !screenshotBase64) {
        return {
          ticket: null,
          isPaymentRequired: true,
          message: 'Payment verification is required for this paid event.',
        };
      }

      verifiedPaymentInfo = await PaymentService.verifyPayment({
        event: {
          id: event.id,
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
    }

    const effectivePaymentRef = verifiedPaymentInfo?.transactionId || paymentReference || null;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      let registrationId: string;
      if (existingReg.rowCount && existingReg.rowCount > 0) {
        registrationId = existingReg.rows[0].id;
        await client.query(
          `UPDATE registrations 
           SET payment_reference = $1, payment_status = 'settled', updated_at = NOW() 
           WHERE id = $2`,
          [effectivePaymentRef, registrationId]
        );
      } else {
        const regRes = await client.query(
          `INSERT INTO registrations (event_id, user_id, status, approval_status, answers, payment_reference, payment_status)
           VALUES ($1, $2, 'registered', 'approved', $3, $4, 'settled')
           RETURNING id`,
          [event.id, userId, JSON.stringify(answers), effectivePaymentRef]
        );
        registrationId = regRes.rows[0].id;
      }

      const eventDate = event.rawDate || event.date;
      const ticketCode = generateTicketCode(eventDate);
      const ticketId = (await client.query('SELECT gen_random_uuid() AS id')).rows[0].id;
      const expiresAt = computeEventDayExpiration(eventDate);
      const qrToken = generateTicketToken(ticketId, event.id, eventDate);

      const userRes = await client.query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
      const attendeeUser = userRes.rows[0] || {};
      const attendeeName = attendeeUser.full_name || 'Attendee';
      const attendeeEmail = attendeeUser.email || '';

      const frontendUrl = getFrontendUrl();
      const verifyUrl = `${frontendUrl}/verify-ticket?token=${encodeURIComponent(qrToken)}&code=${encodeURIComponent(ticketCode)}`;
      const qrPayload = [
        `SHEEBA VERIFIED PASS`,
        `Attendee: ${attendeeName}`,
        attendeeEmail ? `Email: ${attendeeEmail}` : '',
        `Event: ${event.title}`,
        `Code: ${ticketCode}`,
        `Status: Valid`,
        `Verify: ${verifyUrl}`,
      ].filter(Boolean).join('\n');

      const qrDataUrl = await generateQrDataUrl(qrPayload);

      const ticketRes = await client.query(
        `INSERT INTO tickets (
          id, ticket_code, registration_id, event_id, user_id, qr_token, qr_code_data_url,
          status, is_paid, ticket_price, currency, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ISSUED', $8, $9, 'ETB', $10)
        ON CONFLICT (registration_id) DO UPDATE SET 
          status = 'ISSUED', qr_token = EXCLUDED.qr_token, qr_code_data_url = EXCLUDED.qr_code_data_url, updated_at = NOW()
        RETURNING *`,
        [ticketId, ticketCode, registrationId, event.id, userId, qrToken, qrDataUrl, event.isPaid, event.ticketPrice, expiresAt]
      );

      // Record verified payment transaction into payments table
      if (event.isPaid && event.ticketPrice > 0) {
        const commission = event.ticketPrice * 0.03;
        const payout = event.ticketPrice - commission;
        const txId = verifiedPaymentInfo?.transactionId || effectivePaymentRef || `TX-${Date.now()}`;

        await client.query(
          `INSERT INTO payments (
            transaction_id, event_id, user_id, amount, commission_amount, organizer_payout,
            currency, status, payment_method, screenshot_url, provider_response, verified_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'ETB', 'SETTLED', $7, $8, $9, NOW())
          ON CONFLICT (transaction_id) DO NOTHING`,
          [
            txId,
            event.id,
            userId,
            verifiedPaymentInfo?.amount || event.ticketPrice,
            commission,
            payout,
            verifiedPaymentInfo?.provider || paymentMethod || 'bank',
            screenshotUrl || null,
            JSON.stringify(verifiedPaymentInfo?.rawReceipt || {}),
          ]
        );
      }

      await client.query('COMMIT');

      // Invalidate event cache, roster cache, reports, and list
      await CacheService.delPattern('events:list*');
      await CacheService.delPattern(`event:${event.id}*`);
      await CacheService.delPattern(`event:${event.id}:roster*`);
      await CacheService.delPattern(`*http:*/api/events/${event.id}*`);
      await CacheService.del(`report:${event.id}`);

      const rawTicket = ticketRes.rows[0];

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

      // Trigger confirmation email
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

      return {
        ticket: formattedTicket,
        isPaymentRequired: false,
        verifiedPayment: verifiedPaymentInfo,
      };
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

    const cacheKey = `event:${event.id}:roster`;
    const cached = await CacheService.get<AttendeeRosterItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryText = `
      SELECT 
        r.id AS roster_id,
        r.id AS registration_id,
        r.approval_status,
        r.notification_status,
        r.notification_error,
        u.id AS attendee_id,
        u.full_name AS name,
        u.email,
        u.phone,
        u.organization,
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

    const roster = result.rows.map((row) => {
      const badgesList = Array.isArray(row.badges) ? row.badges : [];
      const hasAttendedBadge = badgesList.includes('attended');
      const isCheckedIn = Boolean(
        (row.check_in_id && !row.voided_at) ||
        row.ticket_status === 'CHECKED_IN' ||
        row.ticket_status === 'Used' ||
        hasAttendedBadge
      );
      const checkInTimeDate = row.check_in_time;
      return {
        id: row.attendee_id,
        registrationId: row.registration_id,
        attendeeId: row.attendee_id,
        name: row.name,
        email: row.email,
        phone: row.phone || undefined,
        organization: row.organization || undefined,
        registrationDate: new Date(row.registered_at).toISOString().split('T')[0],
        status: (isCheckedIn ? 'Checked in' : 'Registered') as 'Checked in' | 'Registered',
        approvalStatus: (row.approval_status || 'approved') as RegistrationApprovalStatus,
        checkInTime: checkInTimeDate
          ? new Date(checkInTimeDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' EAT'
          : undefined,
        badges: row.badges || [],
        answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers || {},
        notificationStatus: row.notification_status || 'pending',
        notificationError: row.notification_error || null,
      };
    });

    await CacheService.set(cacheKey, roster, 20);
    return roster;
  }

  static async approveAttendeeRegistration(
    eventId: string,
    registrationId: string,
    userId: string,
    userRole: UserRole
  ): Promise<any> {
    const existing = await query(
      'SELECT id, organizer_id FROM events WHERE id::text = $1 OR share_link_token = $1',
      [eventId]
    );
    if (!existing.rowCount || existing.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const realEventId = (existing.rows[0] as any).id;
    if (existing.rows[0].organizer_id !== userId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. Only the event organizer can approve applications.');
      err.statusCode = 403;
      throw err;
    }

    const event = await this.getEventById(realEventId);

    // Fetch registration
    const regRes = await query(
      `SELECT r.*, u.full_name, u.email, u.phone, u.organization
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.event_id = $2`,
      [registrationId, realEventId]
    );

    if (!regRes.rowCount || regRes.rowCount === 0) {
      const err: any = new Error('Registration record not found.');
      err.statusCode = 404;
      throw err;
    }

    const reg = regRes.rows[0];
    const attendeeUser = {
      id: reg.user_id,
      full_name: reg.full_name,
      email: reg.email,
      phone: reg.phone,
      organization: reg.organization,
    };

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE registrations 
         SET approval_status = 'approved', updated_at = NOW() 
         WHERE id = $1`,
        [registrationId]
      );

      let formattedTicket: any = null;

      // If free or already settled, issue ticket and QR code pass immediately
      if (!event.isPaid || event.ticketPrice <= 0 || reg.payment_status === 'settled') {
        const existingTicket = await client.query('SELECT * FROM tickets WHERE registration_id = $1', [registrationId]);

        let rawTicket: any = null;
        if (existingTicket.rowCount && existingTicket.rowCount > 0) {
          rawTicket = existingTicket.rows[0];
          await client.query("UPDATE tickets SET status = 'ISSUED', updated_at = NOW() WHERE id = $1", [rawTicket.id]);
        } else {
          const eventDate = event.rawDate || event.date;
          const ticketCode = generateTicketCode(eventDate);
          const ticketId = (await client.query('SELECT gen_random_uuid() AS id')).rows[0].id;
          const expiresAt = computeEventDayExpiration(eventDate);
          const qrToken = generateTicketToken(ticketId, event.id, eventDate);

          const frontendUrl = getFrontendUrl();
          const verifyUrl = `${frontendUrl}/verify-ticket?token=${encodeURIComponent(qrToken)}&code=${encodeURIComponent(ticketCode)}`;
          const qrPayload = [
            `SHEEBA VERIFIED PASS`,
            `Attendee: ${attendeeUser.full_name}`,
            attendeeUser.email ? `Email: ${attendeeUser.email}` : '',
            `Event: ${event.title}`,
            `Code: ${ticketCode}`,
            `Status: Valid`,
            `Verify: ${verifyUrl}`,
          ].filter(Boolean).join('\n');

          const qrDataUrl = await generateQrDataUrl(qrPayload);

          const ticketRes = await client.query(
            `INSERT INTO tickets (
              id, ticket_code, registration_id, event_id, user_id, qr_token, qr_code_data_url,
              status, is_paid, ticket_price, currency, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ISSUED', $8, $9, 'ETB', $10)
            RETURNING *`,
            [ticketId, ticketCode, registrationId, event.id, attendeeUser.id, qrToken, qrDataUrl, event.isPaid, event.ticketPrice, expiresAt]
          );
          rawTicket = ticketRes.rows[0];
        }

        formattedTicket = {
          id: rawTicket.ticket_code || rawTicket.id,
          registrationId,
          eventId: event.id,
          eventTitle: event.title,
          eventType: event.type,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          attendeeId: attendeeUser.id,
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
      }

      await client.query('COMMIT');

      await CacheService.delPattern('events:list*');
      await CacheService.delPattern(`event:${event.id}*`);
      await CacheService.delPattern(`event:${event.id}:roster*`);
      await CacheService.delPattern(`*http:*/api/events/${event.id}*`);
      await CacheService.del(`report:${event.id}`);

      // Dispatch Email Notification
      try {
        if (attendeeUser.email) {
          const frontendUrl = getFrontendUrl();
          const ticketUrl = `${frontendUrl}/e/${event.shareLinkToken || event.id}/checkout`;
          const isPendingPayment = Boolean(event.isPaid && event.ticketPrice > 0 && reg.payment_status !== 'settled');

          await EmailService.sendApplicationApprovedEmail(
            attendeeUser.email,
            attendeeUser.full_name || 'Attendee',
            event.title,
            event.date,
            event.time,
            event.location,
            isPendingPayment,
            event.ticketPrice,
            ticketUrl
          );
        }
      } catch (emailErr) {
        console.warn('Failed to send application approval email:', emailErr);
      }

      return {
        success: true,
        approvalStatus: 'approved',
        ticket: formattedTicket,
        isPaymentRequired: Boolean(event.isPaid && event.ticketPrice > 0 && reg.payment_status !== 'settled'),
        message: 'Attendee application approved successfully.',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async rejectAttendeeRegistration(
    eventId: string,
    registrationId: string,
    userId: string,
    userRole: UserRole,
    reason?: string
  ): Promise<any> {
    const existing = await query(
      'SELECT id, organizer_id FROM events WHERE id::text = $1 OR share_link_token = $1',
      [eventId]
    );
    if (!existing.rowCount || existing.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const realEventId = (existing.rows[0] as any).id;
    if (existing.rows[0].organizer_id !== userId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. Only the event organizer can reject applications.');
      err.statusCode = 403;
      throw err;
    }

    const event = await this.getEventById(realEventId);

    const regRes = await query(
      `SELECT r.*, u.full_name, u.email
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.event_id = $2`,
      [registrationId, realEventId]
    );

    if (!regRes.rowCount || regRes.rowCount === 0) {
      const err: any = new Error('Registration record not found.');
      err.statusCode = 404;
      throw err;
    }

    const reg = regRes.rows[0];

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE registrations 
         SET approval_status = 'rejected', updated_at = NOW() 
         WHERE id = $1`,
        [registrationId]
      );

      // Cancel ticket if one existed
      await client.query(
        "UPDATE tickets SET status = 'CANCELLED', updated_at = NOW() WHERE registration_id = $1",
        [registrationId]
      );

      await client.query('COMMIT');

      await CacheService.delPattern('events:list*');
      await CacheService.delPattern(`event:${event.id}*`);
      await CacheService.delPattern(`event:${event.id}:roster*`);
      await CacheService.delPattern(`*http:*/api/events/${event.id}*`);
      await CacheService.del(`report:${event.id}`);

      try {
        if (reg.email) {
          await EmailService.sendApplicationRejectedEmail(
            reg.email,
            reg.full_name || 'Attendee',
            event.title,
            reason
          );
        }
      } catch (emailErr) {
        console.warn('Failed to send rejection email:', emailErr);
      }

      return {
        success: true,
        approvalStatus: 'rejected',
        message: 'Attendee application rejected.',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async bulkApproveRegistrations(
    eventId: string,
    userId: string,
    userRole: UserRole,
    registrationIds: string[]
  ): Promise<{ approvedCount: number; failedCount: number; results: any[] }> {
    let approvedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const regId of registrationIds) {
      try {
        const res = await this.approveAttendeeRegistration(eventId, regId, userId, userRole);
        results.push({ registrationId: regId, success: true, ...res });
        approvedCount++;
      } catch (err: any) {
        console.warn(`Bulk approve error for registration ${regId}:`, err.message);
        results.push({ registrationId: regId, success: false, error: err.message });
        failedCount++;
      }
    }

    return { approvedCount, failedCount, results };
  }

  static async removeAttendeeFromEvent(
    eventId: string,
    targetId: string,
    userId: string,
    userRole: UserRole
  ): Promise<boolean> {
    const existing = await query(
      'SELECT id, organizer_id FROM events WHERE id::text = $1 OR share_link_token = $1',
      [eventId]
    );
    if (!existing.rowCount || existing.rowCount === 0) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const realEventId = (existing.rows[0] as any).id;

    if (existing.rows[0].organizer_id !== userId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    // Delete registration for this event (matching registration id OR user_id)
    await query(
      `DELETE FROM registrations 
       WHERE event_id = $1 AND (id::text = $2 OR user_id::text = $2 OR user_id IN (SELECT id FROM users WHERE email = $2))`,
      [realEventId, targetId]
    );

    // Also delete associated tickets and check-ins if any
    await query(
      `DELETE FROM tickets WHERE event_id = $1 AND (registration_id::text = $2 OR user_id::text = $2)`,
      [realEventId, targetId]
    );
    await query(`DELETE FROM check_ins WHERE registration_id::text = $2`, [targetId]);

    // Invalidate caches
    await CacheService.delPattern('events:list*');
    await CacheService.delPattern(`event:${realEventId}*`);
    await CacheService.delPattern(`event:${eventId}*`);
    await CacheService.del(`event:${realEventId}:roster`);
    await CacheService.del(`event:${eventId}:roster`);
    await CacheService.delPattern(`*http:*/api/events/${realEventId}*`);
    await CacheService.delPattern(`*http:*/api/events/${eventId}*`);
    await CacheService.del(`report:${realEventId}`);
    await CacheService.del(`report:${eventId}`);

    return true;
  }
}
