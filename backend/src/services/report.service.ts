import { query } from '../config/db';
import { UserRole, SponsorReportData } from '../types';
import { EventService } from './event.service';
import { GeminiService } from './gemini.service';
import { CacheService } from './cache.service';

export class ReportService {
  static async getEventReport(
    eventId: string,
    userId?: string,
    userRole?: UserRole,
    forceRefresh: boolean = false
  ): Promise<SponsorReportData> {
    const event = await EventService.getEventById(eventId);

    if (!event) {
      const err: any = new Error('Event not found.');
      err.statusCode = 404;
      throw err;
    }

    // Only the event organizer or an admin can view the report.
    const isOwner = event.organizerId === userId;
    const isAdmin = userRole?.toLowerCase() === 'admin';

    if (!isOwner && !isAdmin) {
      const err: any = new Error(
        'Forbidden. You are not authorized to view reports for this event.'
      );
      err.statusCode = 403;
      throw err;
    }

    // Check the cache first.
    const cacheKey = `report:${eventId}`;

    if (!forceRefresh) {
      const cached = CacheService.get<SponsorReportData>(cacheKey);

      if (cached) {
        return cached;
      }
    }

    // 1. Get attendee roster.
    const roster = await EventService.getEventRoster(event.id);

    const checkedIn = roster.filter(
      (attendee) => attendee.status === 'Checked in'
    );

    // 2. Count badges awarded at this event.
    const badgesRes = await query(
      `SELECT badge_code, COUNT(*)::INTEGER AS count
       FROM badge_awards
       WHERE event_id = $1
         AND revoked_at IS NULL
       GROUP BY badge_code`,
      [event.id]
    );

    const badgeCounts: Record<string, number> = {
      attended: 0,
      participant: 0,
      winner: 0,
      speaker: 0,
    };

    for (const badge of badgesRes.rows) {
      badgeCounts[badge.badge_code] = parseInt(badge.count, 10);
    }

    // If attendance badges do not exist, use actual check-ins.
    if (badgeCounts.attended === 0 && checkedIn.length > 0) {
      badgeCounts.attended = checkedIn.length;
    }

    // 3. Registration timeline.
    const velocityRes = await query(
      `SELECT
        TO_CHAR(registered_at, 'Mon DD') AS reg_date,
        COUNT(*)::INTEGER AS count
       FROM registrations
       WHERE event_id = $1
         AND status = 'registered'
       GROUP BY reg_date, DATE_TRUNC('day', registered_at)
       ORDER BY DATE_TRUNC('day', registered_at) ASC`,
      [event.id]
    );

    const registrationsOverTime =
      velocityRes.rows.length > 0
        ? velocityRes.rows.map((row) => ({
            date: row.reg_date,
            count: parseInt(row.count, 10),
          }))
        : [{ date: event.date, count: roster.length || 1 }];

    // 4. Hourly check-in distribution.
    const hourlyRes = await query(
      `SELECT
        TO_CHAR(checked_in_at, 'HH12:00 AM') AS checkin_hour,
        COUNT(*)::INTEGER AS count
       FROM tickets
       WHERE event_id = $1
         AND status = 'CHECKED_IN'
         AND checked_in_at IS NOT NULL
       GROUP BY checkin_hour
       ORDER BY checkin_hour ASC`,
      [event.id]
    );

    const hourlyCheckIns = hourlyRes.rows.map((row) => ({
      hour: row.checkin_hour,
      count: parseInt(row.count, 10),
    }));

    // 5. Attendance rate.
    const attendanceRate =
      roster.length > 0
        ? parseFloat(
            ((checkedIn.length / roster.length) * 100).toFixed(1)
          )
        : 0;

    // 6. Demographics and impact analysis.
    const roleCounts: Record<string, number> = {};
    const orgCounts: Record<string, number> = {};
    const goalCounts: Record<string, number> = {};
    const sampleInterests: string[] = [];

    // Prepare custom question lookup.
    const questionList: Array<{
      id: string;
      text: string;
    }> = [];

    if (
      event.customQuestions &&
      Array.isArray(event.customQuestions)
    ) {
      event.customQuestions.forEach((question: any) => {
        const text = (
          question.questionText ||
          question.title ||
          ''
        ).trim();

        if (text) {
          questionList.push({
            id: String(question.id || ''),
            text,
          });
        }
      });
    }

    // Analyze every attendee.
    roster.forEach((attendee) => {
      const answers = attendee.answers || {};

      // -----------------------------
      // ROLE
      // -----------------------------
      let foundRole =
        answers.sheba_role ||
        answers.role ||
        '';

      if (!foundRole) {
        for (const [key, value] of Object.entries(answers)) {
          if (!value) continue;

          const matchedQuestion = questionList.find(
            (question) => question.id === key
          );

          const questionText = (
            matchedQuestion
              ? matchedQuestion.text
              : key
          ).toLowerCase();

          if (
            questionText.includes('best describes you') ||
            questionText.includes('role') ||
            questionText.includes('profession') ||
            questionText.includes('occupation')
          ) {
            foundRole = String(value).trim();
            break;
          }
        }
      }

      if (foundRole && String(foundRole).trim()) {
        const cleanedRole = String(foundRole).trim();

        roleCounts[cleanedRole] =
          (roleCounts[cleanedRole] || 0) + 1;
      }

      // -----------------------------
      // ORGANIZATION
      // -----------------------------
      let foundOrg =
        answers.sheba_organization ||
        answers.organization ||
        attendee.organization ||
        '';

      if (!foundOrg) {
        for (const [key, value] of Object.entries(answers)) {
          if (!value) continue;

          const matchedQuestion = questionList.find(
            (question) => question.id === key
          );

          const questionText = (
            matchedQuestion
              ? matchedQuestion.text
              : key
          ).toLowerCase();

          if (
            questionText.includes('organization') ||
            questionText.includes('institution') ||
            questionText.includes('company') ||
            questionText.includes('affiliated')
          ) {
            foundOrg = String(value).trim();
            break;
          }
        }
      }

      if (foundOrg && String(foundOrg).trim()) {
        const cleanedOrg = String(foundOrg).trim();

        orgCounts[cleanedOrg] =
          (orgCounts[cleanedOrg] || 0) + 1;
      }

      // -----------------------------
      // INTERESTS
      // -----------------------------
      let foundInterests =
        answers.sheba_interests ||
        answers.interests ||
        '';

      if (!foundInterests) {
        for (const [key, value] of Object.entries(answers)) {
          if (!value) continue;

          const matchedQuestion = questionList.find(
            (question) => question.id === key
          );

          const questionText = (
            matchedQuestion
              ? matchedQuestion.text
              : key
          ).toLowerCase();

          if (
            questionText.includes('interest') ||
            questionText.includes('expertise') ||
            questionText.includes('skills')
          ) {
            foundInterests = value;
            break;
          }
        }
      }

      if (foundInterests) {
        const interestList = Array.isArray(foundInterests)
          ? foundInterests
          : String(foundInterests).split(/[,;\n]/);

        interestList.forEach((item: any) => {
          const cleaned = String(item).trim();

          if (
            cleaned &&
            !sampleInterests.includes(cleaned)
          ) {
            sampleInterests.push(cleaned);
          }
        });
      }

      // -----------------------------
      // GOALS
      // -----------------------------
      let foundGoals =
        answers.sheba_goals ||
        answers.goals ||
        '';

      if (!foundGoals) {
        for (const [key, value] of Object.entries(answers)) {
          if (!value) continue;

          const matchedQuestion = questionList.find(
            (question) => question.id === key
          );

          const questionText = (
            matchedQuestion
              ? matchedQuestion.text
              : key
          ).toLowerCase();

          if (
            questionText.includes('hoping to gain') ||
            questionText.includes('goal') ||
            questionText.includes('motivation')
          ) {
            foundGoals = value;
            break;
          }
        }
      }

      if (foundGoals) {
        const goalList = Array.isArray(foundGoals)
          ? foundGoals
          : String(foundGoals).split(/[,;\n]/);

        goalList.forEach((item: any) => {
          const cleaned = String(item).trim();

          if (cleaned) {
            goalCounts[cleaned] =
              (goalCounts[cleaned] || 0) + 1;
          }
        });
      }
    });

    // 7. Calculate role percentages.
    const rolesBreakdown = Object.entries(roleCounts).map(
      ([role, count]) => ({
        role,
        count,
        percentage:
          roster.length > 0
            ? Math.round((count / roster.length) * 100)
            : 0,
      })
    );

    // 8. Calculate goal percentages.
    const goalsBreakdown = Object.entries(goalCounts).map(
      ([goal, count]) => ({
        goal,
        count,
        percentage:
          roster.length > 0
            ? Math.round((count / roster.length) * 100)
            : 0,
      })
    );

    // 9. Rank organizations by attendee count.
    const topOrganizations = Object.entries(orgCounts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 10. Extract custom question responses.
    const customQAMap: Record<string, string[]> = {};

    if (
      event.customQuestions &&
      Array.isArray(event.customQuestions)
    ) {
      event.customQuestions.forEach((question: any) => {
        const text =
          question.questionText ||
          question.title ||
          '';

        if (text) {
          customQAMap[text] = [];
        }
      });
    }

    questionList.forEach((question) => {
      customQAMap[question.text] = [];
    });

    roster.forEach((attendee) => {
      const answers = attendee.answers || {};

      Object.entries(answers).forEach(([key, value]) => {
        if (key.startsWith('sheba_') || !value) {
          return;
        }

        const matchedQuestion = questionList.find(
          (question) => question.id === key
        );

        const questionLabel = matchedQuestion
          ? matchedQuestion.text
          : key;

        if (!customQAMap[questionLabel]) {
          customQAMap[questionLabel] = [];
        }

        const valueString = Array.isArray(value)
          ? value.join(', ')
          : String(value).trim();

        if (
          valueString &&
          !customQAMap[questionLabel].includes(valueString)
        ) {
          customQAMap[questionLabel].push(valueString);
        }
      });
    });

    const customQA = Object.entries(customQAMap)
      .filter(([_, answers]) => answers.length > 0)
      .map(([question, answers]) => ({
        question,
        sampleAnswers: answers.slice(0, 10),
      }));

    // 11. Generate AI report narrative.
    const aiNarrative =
      await GeminiService.generateReportNarrative(
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

    // 12. Build the complete report.
    const reportData: SponsorReportData = {
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
      rolesBreakdown,
      topOrganizations,
      goalsBreakdown,
      sampleInterests: sampleInterests.slice(0, 10),
      aiNarrative,
    };

    // Cache the generated report for 10 minutes.
    CacheService.set(cacheKey, reportData, 600);

    return reportData;
  }

  // CSV export for raw attendee data.
  static async exportEventReportCsv(
    eventId: string,
    userId?: string,
    userRole?: UserRole
  ): Promise<{
    filename: string;
    csvContent: string;
  }> {
    const report = await this.getEventReport(
      eventId,
      userId,
      userRole
    );

    const escapeCsv = (value: any) => {
      if (value === null || value === undefined) {
        return '""';
      }

      const clean = String(value).replace(/"/g, '""');

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

    const rows = (report.attendees || []).map((attendee) => {
      const answers = attendee.answers || {};

      return [
        escapeCsv(attendee.name),
        escapeCsv(attendee.email),
        escapeCsv(attendee.registrationDate),
        escapeCsv(attendee.status),
        escapeCsv(attendee.checkInTime || '—'),
        escapeCsv(attendee.badges?.join('; ') || '—'),
        escapeCsv(
          answers.sheba_role ||
            answers.role ||
            '—'
        ),
        escapeCsv(
          attendee.organization ||
            answers.sheba_organization ||
            answers.organization ||
            '—'
        ),
      ].join(',');
    });

    const csvContent = [
      headers.join(','),
      ...rows,
    ].join('\n');

    const safeTitle = report.eventTitle
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();

    const filename =
      `sheba_sponsor_report_${safeTitle}_` +
      `${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      filename,
      csvContent,
    };
  }
}