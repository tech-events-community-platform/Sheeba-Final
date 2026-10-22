import { query } from '../config/db';
import { ITicket, EventType } from '../types';
import { computeEventDayExpiration } from '../utils/qr.util';

export class TicketService {
  static formatTicket(row: any) {
    const now = new Date();
    const expiresAtDate = row.expires_at
      ? new Date(row.expires_at)
      : row.event_date
      ? computeEventDayExpiration(row.event_date)
      : null;
    const isExpired = expiresAtDate ? now.getTime() > expiresAtDate.getTime() : false;

    const isPaymentPending = row.payment_status === 'unsettled';
    const approvalStatus = row.approval_status || (row.qr_token ? 'approved' : 'pending');
    let computedStatus = row.status || (approvalStatus === 'pending' ? 'Pending Approval' : 'Valid');
    if (isPaymentPending) {
      computedStatus = 'Pending Payment';
    } else if (approvalStatus === 'pending') {
      computedStatus = 'Pending Approval';
    } else if (approvalStatus === 'rejected') {
      computedStatus = 'Rejected';
    } else if (row.status === 'CHECKED_IN') {
      computedStatus = 'Used';
    } else if (row.status === 'CANCELLED') {
      computedStatus = 'Cancelled';
    } else if (isExpired) {
      computedStatus = 'Expired';
    } else if (row.status === 'ISSUED') {
      computedStatus = 'Valid';
    }

    const isEligibleForActiveQr = !isPaymentPending && approvalStatus === 'approved' && row.status !== 'CANCELLED';

    return {
      id: row.ticket_code || row.ticket_raw_id || row.id || row.registration_id,
      rawId: row.ticket_raw_id || row.id,
      ticketCode: isEligibleForActiveQr ? (row.ticket_code || 'SHB-8921') : (isPaymentPending ? 'PENDING_PAYMENT' : 'PENDING'),
      registrationId: row.registration_id,
      eventId: row.event_id,
      eventTitle: row.event_title || 'Tech Event',
      eventType: (row.event_type || 'workshop') as EventType,
      eventDate: row.event_date ? new Date(row.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
      rawEventDate: row.event_date,
      eventTime: row.time_str || `${row.start_time || '09:00 AM'} - ${row.end_time || '05:00 PM'} EAT`,
      eventLocation: row.event_location || row.location,
      venueName: row.venue_name || row.event_location,
      attendeeId: row.user_id,
      attendeeName: row.attendee_name || row.full_name,
      attendeeEmail: row.attendee_email || row.email,
      qrToken: isEligibleForActiveQr ? (row.qr_token || null) : null,
      qrDataUrl: isEligibleForActiveQr ? (row.qr_code_data_url || null) : null,
      status: computedStatus,
      rawStatus: row.status,
      approvalStatus,
      paymentStatus: row.payment_status,
      isPending: isPaymentPending || approvalStatus === 'pending',
      isExpired,
      isPaid: Boolean(row.is_paid),
      ticketPrice: parseFloat(row.ticket_price || '0'),
      currency: row.currency || 'ETB',
      issuedAt: row.created_at,
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : row.expires_at,
      checkedInAt: row.checked_in_at,
    };
  }

  static async getAttendeeTickets(userId: string): Promise<any[]> {
    const sql = `
      SELECT 
        r.id AS registration_id,
        r.approval_status,
        r.payment_status,
        t.id AS ticket_raw_id,
        t.ticket_code,
        t.qr_token,
        t.qr_code_data_url,
        t.status,
        t.is_paid,
        t.ticket_price,
        t.currency,
        t.expires_at,
        t.checked_in_at,
        t.created_at,
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
        u.id AS user_id,
        u.full_name AS attendee_name,
        u.email AS attendee_email,
        org.full_name AS organizer_name
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN users u ON r.user_id = u.id
      JOIN users org ON e.organizer_id = org.id
      LEFT JOIN tickets t ON t.registration_id = r.id
      WHERE r.user_id = $1 AND r.status = 'registered'
      ORDER BY e.event_date DESC
    `;

    const result = await query(sql, [userId]);
    return result.rows.map(this.formatTicket);
  }

  static async getTicketByEventAndUser(eventId: string, userId: string): Promise<any> {
    const sql = `
      SELECT 
        r.id AS registration_id,
        r.approval_status,
        r.payment_status,
        t.id AS ticket_raw_id,
        t.ticket_code,
        t.qr_token,
        t.qr_code_data_url,
        t.status,
        t.is_paid,
        t.ticket_price,
        t.currency,
        t.expires_at,
        t.checked_in_at,
        t.created_at,
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
        u.id AS user_id,
        u.full_name AS attendee_name,
        u.email AS attendee_email,
        org.full_name AS organizer_name
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN users u ON r.user_id = u.id
      JOIN users org ON e.organizer_id = org.id
      LEFT JOIN tickets t ON t.registration_id = r.id
      WHERE (r.event_id::text = $1 OR e.share_link_token = $1) AND r.user_id = $2 AND r.status = 'registered'
    `;

    const result = await query(sql, [eventId, userId]);

    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    return this.formatTicket(result.rows[0]);
  }

  static async getTicketById(ticketId: string, userId?: string, userRole?: string): Promise<any> {
    const sql = `
      SELECT 
        t.*,
        e.title AS event_title,
        e.event_type,
        e.event_date,
        e.start_time,
        e.end_time,
        e.time_str,
        e.location AS event_location,
        e.venue_name,
        e.organizer_id,
        u.full_name AS attendee_name,
        u.email AS attendee_email
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id::text = $1 OR t.ticket_code = $1
    `;

    const result = await query(sql, [ticketId]);

    if (!result.rowCount || result.rowCount === 0) {
      const err: any = new Error('Ticket not found.');
      err.statusCode = 404;
      throw err;
    }

    const row = result.rows[0];

    // Authorization check: Ticket owner, event organizer, or platform admin only
    if (userId && row.user_id !== userId && row.organizer_id !== userId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not authorized to view this ticket.');
      err.statusCode = 403;
      throw err;
    }

    return this.formatTicket(row);
  }

  static async getTicketQrImageBuffer(ticketCode: string): Promise<Buffer | null> {
    const cleanCode = (ticketCode || '').trim();
    if (!cleanCode) return null;

    const sql = `
      SELECT t.ticket_code, t.qr_code_data_url, t.status, r.payment_status, r.approval_status
      FROM tickets t
      JOIN registrations r ON t.registration_id = r.id
      WHERE UPPER(t.ticket_code) = UPPER($1) OR t.id::text = $1
    `;

    const result = await query(sql, [cleanCode]);
    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    const isPaymentPending = row.payment_status === 'unsettled';
    const isApproved = row.approval_status === 'approved' || (!row.approval_status && row.qr_token);
    const isCancelled = row.status === 'CANCELLED';

    // Strict ticket eligibility check: Must be approved, paid/settled, non-cancelled, and have a valid QR code
    if (isPaymentPending || !isApproved || isCancelled || !row.qr_code_data_url) {
      const err: any = new Error('Ticket is not eligible for active QR code delivery.');
      err.statusCode = 403;
      throw err;
    }

    const base64Data = row.qr_code_data_url.replace(/^data:image\/[a-z]+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }
}

