import { query } from '../config/db';
import { ITicket, EventType } from '../types';

export class TicketService {
  static formatTicket(row: any) {
    return {
      id: row.ticket_code || row.id,
      rawId: row.id,
      ticketCode: row.ticket_code || 'SHB-8921',
      registrationId: row.registration_id,
      eventId: row.event_id,
      eventTitle: row.event_title || 'Tech Event',
      eventType: (row.event_type || 'workshop') as EventType,
      eventDate: row.event_date ? new Date(row.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
      eventTime: row.time_str || `${row.start_time || '09:00 AM'} - ${row.end_time || '05:00 PM'} EAT`,
      eventLocation: row.event_location || row.location,
      venueName: row.venue_name || row.event_location,
      attendeeId: row.user_id,
      attendeeName: row.attendee_name || row.full_name,
      attendeeEmail: row.attendee_email || row.email,
      qrToken: row.qr_token,
      qrDataUrl: row.qr_code_data_url,
      status: row.status === 'CHECKED_IN' ? 'Used' : row.status === 'ISSUED' ? 'Valid' : row.status,
      isPaid: Boolean(row.is_paid),
      ticketPrice: parseFloat(row.ticket_price || '0'),
      currency: row.currency || 'ETB',
      issuedAt: row.created_at,
      expiresAt: row.expires_at,
      checkedInAt: row.checked_in_at,
    };
  }

  static async getAttendeeTickets(userId: string): Promise<any[]> {
    const sql = `
      SELECT 
        t.*,
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
        u.full_name AS attendee_name,
        u.email AS attendee_email,
        org.full_name AS organizer_name
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      JOIN users u ON t.user_id = u.id
      JOIN users org ON e.organizer_id = org.id
      WHERE t.user_id = $1
      ORDER BY e.event_date DESC
    `;

    const result = await query(sql, [userId]);
    return result.rows.map(this.formatTicket);
  }

  static async getTicketByEventAndUser(eventId: string, userId: string): Promise<any> {
    const sql = `
      SELECT 
        t.*,
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
        u.full_name AS attendee_name,
        u.email AS attendee_email,
        org.full_name AS organizer_name
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      JOIN users u ON t.user_id = u.id
      JOIN users org ON e.organizer_id = org.id
      WHERE (t.event_id = $1 OR e.share_link_token = $1) AND t.user_id = $2
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
      WHERE t.id = $1 OR t.ticket_code = $1
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
}
