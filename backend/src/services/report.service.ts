import { query } from '../config/db';
import { UserRole, SponsorReportData } from '../types';
import { EventService } from './event.service';
import { GeminiService } from './gemini.service';

export class ReportService {
  static async getEventReport(eventId: string, userId?: string, userRole?: UserRole): Promise<SponsorReportData> {
    const event = await EventService.getEventById(eventId);
    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    // Security check: Only the event organizer or an admin can access reports
    const isOwner = event.organizerId === userId;
    const isAdmin = userRole?.toLowerCase() === 'admin';

    if (!isOwner && !isAdmin) {
      const err: any = new Error('Forbidden. You are not authorized to view reports for this event.');
      err.statusCode = 403;
      throw err;
    }

    // 1. Fetch the full attendee roster
    const roster = await EventService.getEventRoster(event.id);
    const checkedIn = roster.filter((r) => r.status === 'Checked in');

    // 2. Tally badges awarded at this event
    const badgesRes = await query(
      `SELECT badge_code, COUNT(*)::INTEGER AS count
       FROM badge_awards
       WHERE event_id = $1 AND revoked_at IS NULL
       GROUP BY badge_code`,
      [event.id]
    );

    const badgeCounts: Record<string, number> = {
      attended: 0,
      participant: 0,
      winner: 0,
      speaker: 0,
    };

    for (const b of badgesRes.rows) {
      badgeCounts[b.badge_code] = parseInt(b.count, 10);
    }

    if (badgeCounts.attended === 0 && checkedIn.length > 0) {
      badgeCounts.attended = checkedIn.length;
    }

    // 3. Registrations timeline (how many people registered each day)
    const velocityRes = await query(
      `SELECT 
        TO_CHAR(registered_at, 'Mon DD') AS reg_date,
        COUNT(*)::INTEGER AS count
       FROM registrations
       WHERE event_id = $1 AND status = 'registered'
       GROUP BY reg_date, DATE_TRUNC('day', registered_at)
       ORDER BY DATE_TRUNC('day', registered_at) ASC`,
      [event.id]
    );

    const registrationsOverTime = velocityRes.rows.length > 0
      ? velocityRes.rows.map((r) => ({ date: r.reg_date, count: parseInt(r.count, 10) }))
      : [{ date: event.date, count: roster.length || 1 }];

    // 4. Hourly check-in distribution (what times people arrived)
    const hourlyRes = await query(
      `SELECT 
        TO_CHAR(checked_in_at, 'HH12:00 AM') AS checkin_hour,
        COUNT(*)::INTEGER AS count
       FROM tickets
       WHERE event_id = $1 AND status = 'CHECKED_IN' AND checked_in_at IS NOT NULL
       GROUP BY checkin_hour
       ORDER BY checkin_hour ASC`,
      [event.id]
    );

    const hourlyCheckIns = hourlyRes.rows.map((h) => ({
      hour: h.checkin_hour,
      count: parseInt(h.count, 10),
    }));

    const attendanceRate = roster.length > 0
      ? parseFloat(((checkedIn.length / roster.length) * 100).toFixed(1))
      : 0;

    // 5. DEMOGRAPHICS & IMPACT ANALYSIS (From Sheeba's 4 Standard Questions)
    const roleCounts: Record<string, number> = {};
    const orgCounts: Record<string, number> = {};
    const goalCounts: Record<string, number> = {};
    const sampleInterests: string[] = [];

    roster.forEach((attendee) => {
      const ans = attendee.answers || {};

      // Standard Question 1: Role
      const role = ans.sheba_role || 'Other';
      roleCounts[role] = (roleCounts[role] || 0) + 1;

      // Standard Question 2: Interests
      const interest = (ans.sheba_interests || '').trim();
      if (interest) {
        sampleInterests.push(interest);
      }

      // Standard Question 3: Organization / Affiliation
      const org = (ans.sheba_organization || '').trim();
      if (org) {
        orgCounts[org] = (orgCounts[org] || 0) + 1;
      }

      // Standard Question 4: Goals
      const rawGoals = ans.sheba_goals;
      const goals: string[] = Array.isArray(rawGoals)
        ? rawGoals
        : typeof rawGoals === 'string' && rawGoals
        ? rawGoals.split(', ')
        : [];

      goals.forEach((g) => {
        const cleaned = g.trim();
        if (cleaned) {
          goalCounts[cleaned] = (goalCounts[cleaned] || 0) + 1;
        }
      });
    });

    // Calculate percentages for roles
    const rolesBreakdown = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
      percentage: roster.length > 0 ? Math.round((count / roster.length) * 100) : 0,
    }));

    // Calculate percentages for goals
    const goalsBreakdown = Object.entries(goalCounts).map(([goal, count]) => ({
      goal,
      count,
      percentage: roster.length > 0 ? Math.round((count / roster.length) * 100) : 0,
    }));

    // Rank top organizations by attendee count
    const topOrganizations = Object.entries(orgCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Extract custom question responses for AI analysis
    const customQAMap: Record<string, string[]> = {};
    if (event.customQuestions && Array.isArray(event.customQuestions)) {
      event.customQuestions.forEach((q: any) => {
        const text = q.questionText || q.title || '';
        if (text) customQAMap[text] = [];
      });
    }

    roster.forEach((attendee) => {
      const ans = attendee.answers || {};
      Object.entries(ans).forEach(([key, val]) => {
        if (!key.startsWith('sheba_') && val) {
          if (!customQAMap[key]) customQAMap[key] = [];
          customQAMap[key].push(String(val).trim());
        }
      });
    });

    const customQA = Object.entries(customQAMap)
      .filter(([_, answers]) => answers.length > 0)
      .map(([question, answers]) => ({
        question,
        sampleAnswers: answers.slice(0, 10),
      }));

    // 6. Generate the Comprehensive AI Impact Story with Gemini
    const aiNarrative = await GeminiService.generateReportNarrative(
      {
        title: event.title,
        description: event.description,
        type: event.type,
        date: event.date,
        location: event.location,
        venueName: event.venueName,
        organizerName: event.organizerName,
      },
      {
        totalRegistered: roster.length,
        totalAttended: checkedIn.length,
        attendanceRate,
        badgeDistribution: {
          attended: badgeCounts.attended,
          participant: badgeCounts.participant,
          winner: badgeCounts.winner,
          speaker: badgeCounts.speaker,
        },
        rolesBreakdown,
        topOrganizations,
        goalsBreakdown,
        sampleInterests,
        hourlyCheckIns,
        customQA,
      }
    );


    // 7. Return all data for the Report Dashboard & AI
    return {
      eventId: event.id,
      eventTitle: event.title,
      eventDescription: event.description,
      eventType: event.type,
      eventDate: event.date,
      eventLocation: event.location,
      organizerName: event.organizerName,
      customQuestions: event.customQuestions || [],
      totalRegistered: roster.length,
      totalAttended: checkedIn.length,
      attendanceRate,
      badgeDistribution: {
        attended: badgeCounts.attended,
        participant: badgeCounts.participant,
        winner: badgeCounts.winner,
        speaker: badgeCounts.speaker,
      },
      registrationsOverTime,
      hourlyCheckIns,
      attendees: roster,
      // Newly added demographic impact metrics:
      rolesBreakdown,
      topOrganizations,
      goalsBreakdown,
      sampleInterests: sampleInterests.slice(0, 10),
      aiNarrative,
    };
  }

  // CSV Exporter for raw data download
  static async exportEventReportCsv(
    eventId: string,
    userId?: string,
    userRole?: UserRole
  ): Promise<{ filename: string; csvContent: string }> {
    const report = await this.getEventReport(eventId, userId, userRole);

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headers = [
      'Attendee Name',
      'Email',
      'Registration Date',
      'Status',
      'Check-in Time',
      'Badges Awarded',
      'Role',
      'Organization',
    ];

    const rows = report.attendees.map((a) => {
      const ans = a.answers || {};
      return [
        escapeCsv(a.name),
        escapeCsv(a.email),
        escapeCsv(a.registrationDate),
        escapeCsv(a.status),
        escapeCsv(a.checkInTime || '—'),
        escapeCsv(a.badges.join('; ')),
        escapeCsv(ans.sheba_role || '—'),
        escapeCsv(ans.sheba_organization || '—'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const safeTitle = report.eventTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `sheba_sponsor_report_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;

    return { filename, csvContent };
  }
}