import bcrypt from 'bcryptjs';
import { query, getClient } from '../config/db';
import { generateRandomInitialPassword } from '../utils/credential.util';
import { EmailService } from './email.service';
import { EventService } from './event.service';
import { ScannerPrivacyUtil } from '../utils/scannerPrivacy.util';
import { CacheService } from './cache.service';

export interface ScannerSummary {
  id: string; // event_scanner record id
  scannerUserId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isActive: boolean;
  assignedAt: string;
  scannedCount: number;
}

export interface AssignedEventSummary {
  id: string;
  title: string;
  type: string;
  date: string;
  timeStr?: string;
  location: string;
  venueName?: string;
  organizerName: string;
  organizerId: string;
  isEventToday: boolean;
  isEventPassed: boolean;
  myScannedCount: number;
  totalAttendeesCount: number;
}

export class ScannerService {
  /**
   * Verifies that the user is authorized to perform door scanning actions for the given event.
   * Allowed: System Admin, Event Organizer, or an active assigned scanner with requires_scanners enabled.
   */
  static async assertScannerOrOrganizerAccess(userId: string, eventId: string, userRole?: string): Promise<boolean> {
    if (userRole === 'admin') return true;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found or inactive.');
      err.statusCode = 404;
      throw err;
    }

    const realEventId = event.id;

    // 1. Native Organizer Access
    if (event.organizerId === userId) return true;

    // 2. Check if event has scanners enabled
    if (!event.requiresScanners && !(event as any).requires_scanners) {
      const err: any = new Error('Scanner door access is currently disabled for this event.');
      err.statusCode = 403;
      throw err;
    }

    // 3. Check active assignment in event_scanners table
    const scanRes = await query(
      `SELECT id FROM event_scanners 
       WHERE event_id = $1 AND scanner_user_id = $2 AND is_active = TRUE`,
      [realEventId, userId]
    );

    if (!scanRes.rowCount || scanRes.rowCount === 0) {
      const err: any = new Error('Unauthorized. You are not assigned as an active scanner for this event.');
      err.statusCode = 403;
      throw err;
    }

    return true;
  }

  /**
   * Checks if a user has any active scanner assignments across all enabled, non-deleted events.
   * Powers the conditional navbar / dropdown quick-link.
   */
  static async hasActiveScannerAssignments(userId: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM event_scanners es
       JOIN events e ON e.id = es.event_id
       WHERE es.scanner_user_id = $1 
         AND es.is_active = TRUE 
         AND e.requires_scanners = TRUE 
         AND e.deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );
    return Boolean(res.rowCount && res.rowCount > 0);
  }

  /**
   * Assigns one or more scanners to an event by email.
   * Specification v2.1:
   * - Automatically provisions new users as 'attendee' with a random initial password.
   * - Links existing users preserving their existing roles.
   * - Sends tailored invitation emails.
   */
  static async assignScanners(params: {
    eventId: string;
    organizerId: string;
    emails: string[];
    userRole?: string;
  }): Promise<{ addedCount: number; message: string }> {
    const { eventId, organizerId, emails, userRole } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (event.organizerId !== organizerId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized. You are not the organizer of this event.');
      err.statusCode = 403;
      throw err;
    }

    const realEventId = event.id;

    // Normalize and deduplicate emails
    const cleanEmails = Array.from(
      new Set(
        emails
          .map((e) => (e || '').trim().toLowerCase())
          .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    );

    if (cleanEmails.length === 0) {
      return { addedCount: 0, message: 'No valid scanner email addresses provided.' };
    }

    // Ensure event has requires_scanners enabled
    await query('UPDATE events SET requires_scanners = TRUE, updated_at = NOW() WHERE id = $1', [realEventId]);

    let addedCount = 0;
    const client = await getClient();

    try {
      for (const email of cleanEmails) {
        // 1. Check if user already exists
        const userCheck = await client.query(
          'SELECT id, email, full_name, role FROM users WHERE LOWER(email) = $1',
          [email]
        );

        let scannerUserId: string;
        let isNewUser = false;
        let initialPassword = '';
        let targetName = '';

        if (userCheck.rowCount && userCheck.rowCount > 0) {
          scannerUserId = userCheck.rows[0].id;
          targetName = userCheck.rows[0].full_name;
        } else {
          // Provision new account
          isNewUser = true;
          initialPassword = generateRandomInitialPassword(12);
          const passwordHash = await bcrypt.hash(initialPassword, 10);
          targetName = email.split('@')[0];

          const createRes = await client.query(
            `INSERT INTO users (email, password_hash, full_name, role, must_change_password)
             VALUES ($1, $2, $3, 'attendee', TRUE)
             RETURNING id, full_name`,
            [email, passwordHash, targetName]
          );
          scannerUserId = createRes.rows[0].id;
        }

        // 2. Check existing active assignment
        const activeCheck = await client.query(
          'SELECT id FROM event_scanners WHERE event_id = $1 AND scanner_user_id = $2 AND is_active = TRUE',
          [realEventId, scannerUserId]
        );

        if (activeCheck.rowCount && activeCheck.rowCount > 0) {
          // Already actively assigned
          continue;
        }

        // 3. Insert assignment
        await client.query(
          `INSERT INTO event_scanners (event_id, scanner_user_id, assigned_by, is_active)
           VALUES ($1, $2, $3, TRUE)`,
          [realEventId, scannerUserId, organizerId]
        );

        addedCount++;

        // 4. Send tailored invitation email asynchronously
        const formattedEventDate = ScannerPrivacyUtil.toLocalDayString(event.date);
        if (isNewUser) {
          EmailService.sendScannerAssignmentNewUserEmail({
            toEmail: email,
            fullName: targetName,
            eventTitle: event.title,
            organizerName: (event as any).organizerName || 'The Organizer',
            eventDate: formattedEventDate || event.date,
            location: event.location,
            initialPassword,
          }).catch((err) => console.error(`[ScannerService] Failed to send new user scanner email to ${email}:`, err));
        } else {
          EmailService.sendScannerAssignmentExistingUserEmail({
            toEmail: email,
            fullName: targetName,
            eventTitle: event.title,
            organizerName: (event as any).organizerName || 'The Organizer',
            eventDate: formattedEventDate || event.date,
            location: event.location,
          }).catch((err) => console.error(`[ScannerService] Failed to send existing user scanner email to ${email}:`, err));
        }
      }
    } finally {
      client.release();
    }

    // Invalidate event cache
    await CacheService.delPattern(`event:${realEventId}*`);

    return {
      addedCount,
      message: `Successfully assigned ${addedCount} scanner(s) to "${event.title}".`,
    };
  }

  /**
   * Immediately revokes an individual scanner's access to an event.
   */
  static async removeScanner(params: {
    eventId: string;
    organizerId: string;
    scannerUserId: string;
    userRole?: string;
  }): Promise<{ message: string }> {
    const { eventId, organizerId, scannerUserId, userRole } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (event.organizerId !== organizerId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized.');
      err.statusCode = 403;
      throw err;
    }

    const realEventId = event.id;

    // Immediately deactivate
    await query(
      `UPDATE event_scanners 
       SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
       WHERE event_id = $1 AND scanner_user_id = $2 AND is_active = TRUE`,
      [realEventId, scannerUserId]
    );

    // Invalidate caches
    await CacheService.delPattern(`event:${realEventId}*`);

    return { message: 'Scanner access immediately revoked.' };
  }

  /**
   * Toggles scanner requirement for an event.
   * Specification v2.1 Confirmed Decision:
   * - When toggled OFF: immediately deactivates all active scanner assignments for that event.
   * - When toggled ON later: starts with a FRESH, clean scanner list.
   */
  static async toggleScanners(params: {
    eventId: string;
    organizerId: string;
    enabled: boolean;
    userRole?: string;
  }): Promise<{ requiresScanners: boolean; revokedCount: number; message: string }> {
    const { eventId, organizerId, enabled, userRole } = params;

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (event.organizerId !== organizerId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized.');
      err.statusCode = 403;
      throw err;
    }

    const realEventId = event.id;
    let revokedCount = 0;

    if (!enabled) {
      // Disabling: Deactivate all active scanner assignments immediately
      const deactRes = await query(
        `UPDATE event_scanners 
         SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
         WHERE event_id = $1 AND is_active = TRUE`,
        [realEventId]
      );
      revokedCount = deactRes.rowCount || 0;

      await query(
        'UPDATE events SET requires_scanners = FALSE, updated_at = NOW() WHERE id = $1',
        [realEventId]
      );
    } else {
      // Enabling: Turn on requires_scanners; starts with fresh empty list
      await query(
        'UPDATE events SET requires_scanners = TRUE, updated_at = NOW() WHERE id = $1',
        [realEventId]
      );
    }

    // Invalidate caches
    await CacheService.delPattern(`event:${realEventId}*`);

    return {
      requiresScanners: enabled,
      revokedCount,
      message: enabled
        ? 'Scanner functionality enabled. You can now assign staff members.'
        : `Scanner functionality disabled. Immediately revoked door access for ${revokedCount} scanner(s).`,
    };
  }

  /**
   * Retrieves active assigned scanners for an event (Organizer view).
   */
  static async getEventScanners(eventId: string, organizerId: string, userRole?: string): Promise<{
    requiresScanners: boolean;
    scanners: ScannerSummary[];
  }> {
    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    if (event.organizerId !== organizerId && userRole !== 'admin') {
      const err: any = new Error('Unauthorized.');
      err.statusCode = 403;
      throw err;
    }

    const realEventId = event.id;
    const requiresScanners = Boolean(event.requiresScanners || (event as any).requires_scanners);

    const res = await query(
      `SELECT 
         es.id,
         es.scanner_user_id,
         es.is_active,
         es.created_at,
         u.full_name,
         u.email,
         u.avatar_url,
         (SELECT COUNT(*) FROM check_ins ci WHERE ci.event_id = es.event_id AND ci.approved_by = es.scanner_user_id AND ci.voided_at IS NULL)::int AS scanned_count
       FROM event_scanners es
       JOIN users u ON u.id = es.scanner_user_id
       WHERE es.event_id = $1 AND es.is_active = TRUE
       ORDER BY es.created_at ASC`,
      [realEventId]
    );

    const scanners: ScannerSummary[] = (res.rows || []).map((row) => ({
      id: row.id,
      scannerUserId: row.scanner_user_id,
      name: row.full_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      assignedAt: row.created_at,
      scannedCount: row.scanned_count || 0,
    }));

    return {
      requiresScanners,
      scanners,
    };
  }

  /**
   * Retrieves all active events assigned to the logged-in scanner across different organizers.
   */
  static async getMyAssignedEvents(userId: string): Promise<AssignedEventSummary[]> {
    const res = await query(
      `SELECT 
         e.id,
         e.title,
         e.event_type,
         e.event_date,
         e.time_str,
         e.location,
         e.venue_name,
         e.organizer_id,
         u_org.full_name AS organizer_name,
         (SELECT COUNT(*) FROM check_ins ci WHERE ci.event_id = e.id AND ci.approved_by = $1 AND ci.voided_at IS NULL)::int AS my_scanned_count,
         (SELECT COUNT(*) FROM check_ins ci WHERE ci.event_id = e.id AND ci.voided_at IS NULL)::int AS total_attendees_count
       FROM event_scanners es
       JOIN events e ON e.id = es.event_id
       LEFT JOIN users u_org ON u_org.id = e.organizer_id
       WHERE es.scanner_user_id = $1 
         AND es.is_active = TRUE 
         AND e.requires_scanners = TRUE 
         AND e.deleted_at IS NULL
       ORDER BY e.event_date ASC`,
      [userId]
    );

    return (res.rows || []).map((row) => {
      const isToday = ScannerPrivacyUtil.isEventTodayInLocalTime(row.event_date);
      const isPassed = ScannerPrivacyUtil.isEventPassedInLocalTime(row.event_date);

      return {
        id: row.id,
        title: row.title,
        type: row.event_type,
        date: row.event_date,
        timeStr: row.time_str,
        location: row.location,
        venueName: row.venue_name,
        organizerName: row.organizer_name || 'Event Organizer',
        organizerId: row.organizer_id,
        isEventToday: isToday,
        isEventPassed: isPassed,
        myScannedCount: row.my_scanned_count || 0,
        totalAttendeesCount: row.total_attendees_count || 0,
      };
    });
  }

  /**
   * Retrieves scanned attendee attendance for a specific event with Timezone-Aware Privacy redaction.
   * Specification v2.1:
   * - During Event Day (EAT): Returns attendee names, emails, ticket codes, and timestamps.
   * - After Event Day (EAT): Redacts attendee PII completely; returns only aggregate scanned count.
   */
  static async getScannerEventAttendance(userId: string, eventId: string): Promise<{
    eventId: string;
    isEventToday: boolean;
    isEventPassed: boolean;
    totalScannedCount: number;
    attendees: Array<{
      id: string;
      attendeeName: string;
      attendeeEmail?: string;
      ticketCode?: string;
      approvedAt: string;
    }>;
    privacyNotice?: string;
  }> {
    await this.assertScannerOrOrganizerAccess(userId, eventId);

    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    const realEventId = event.id;
    const isToday = ScannerPrivacyUtil.isEventTodayInLocalTime(event.date);
    const isPassed = ScannerPrivacyUtil.isEventPassedInLocalTime(event.date);

    // Count all attendees checked in by this scanner
    const countRes = await query(
      `SELECT COUNT(*)::int AS count 
       FROM check_ins 
       WHERE event_id = $1 AND approved_by = $2 AND voided_at IS NULL`,
      [realEventId, userId]
    );
    const totalScannedCount = countRes.rows[0]?.count || 0;

    if (!isToday) {
      // Data privacy rule: After or before the event day, PII is sealed
      return {
        eventId: realEventId,
        isEventToday: false,
        isEventPassed: isPassed,
        totalScannedCount,
        attendees: [],
        privacyNotice: isPassed
          ? 'Event has concluded. In accordance with attendee privacy standards, detailed records are archived. Only aggregate scan counts are retained.'
          : 'Detailed attendee records will become accessible on the event day.',
      };
    }

    // On event day: Return attendee list scanned by this gatekeeper
    const attendeeRes = await query(
      `SELECT 
         ci.id,
         ci.approved_at,
         u.full_name AS attendee_name,
         u.email AS attendee_email,
         t.ticket_code
       FROM check_ins ci
       JOIN users u ON u.id = ci.user_id
       LEFT JOIN tickets t ON t.registration_id = ci.registration_id
       WHERE ci.event_id = $1 AND ci.approved_by = $2 AND ci.voided_at IS NULL
       ORDER BY ci.approved_at DESC`,
      [realEventId, userId]
    );

    return {
      eventId: realEventId,
      isEventToday: true,
      isEventPassed: false,
      totalScannedCount,
      attendees: (attendeeRes.rows || []).map((row) => ({
        id: row.id,
        attendeeName: row.attendee_name,
        attendeeEmail: row.attendee_email,
        ticketCode: row.ticket_code,
        approvedAt: row.approved_at,
      })),
    };
  }
}

