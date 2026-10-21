import { query } from '../../config/db';
import {
  SponsorPreferences,
  EventCandidate,
  ScoredEventMatch,
  MatchingWeights,
} from './matchingTypes';
import { rankEventsForSponsor } from './rankingEngine';
import { EmbeddingService } from './embeddingService';
import { computeEventDayExpiration } from '../../utils/qr.util';

export class SponsorMatchingService {
  /**
   * Derives smart initial preferences if a sponsor has not yet configured custom preferences
   */
  static getDefaultPreferencesForIndustry(
    industry?: string,
    companyName?: string,
    bio?: string
  ): SponsorPreferences {
    const ind = (industry || '').toLowerCase();
    const bioText = (bio || '').toLowerCase();

    if (ind.includes('software') || ind.includes('cloud') || ind.includes('tech') || bioText.includes('software')) {
      return {
        targetInterests: ['Technology & AI', 'Software Engineering', 'Cloud Infrastructure'],
        targetSkills: ['Software Engineer', 'Fullstack Developer', 'DevOps', 'TypeScript', 'Python'],
        sponsorshipObjectives: ['talent_recruitment', 'brand_awareness'],
        preferredEventTypes: ['hackathon', 'workshop'],
      };
    }

    if (ind.includes('venture') || ind.includes('innovation') || ind.includes('startup') || bioText.includes('venture')) {
      return {
        targetInterests: ['Startup & Entrepreneurship', 'Technology & AI'],
        targetSkills: ['Founder', 'Entrepreneur', 'Product Manager', 'Fintech'],
        sponsorshipObjectives: ['startup_discovery', 'brand_awareness'],
        preferredEventTypes: ['summit', 'meetup'],
      };
    }

    if (ind.includes('fintech') || ind.includes('financial')) {
      return {
        targetInterests: ['Fintech & Financial Services', 'Technology & AI'],
        targetSkills: ['Software Engineer', 'Fintech Specialist', 'Data Analyst'],
        sponsorshipObjectives: ['brand_awareness', 'talent_recruitment'],
        preferredEventTypes: ['summit', 'workshop', 'hackathon'],
      };
    }

    if (ind.includes('creative') || ind.includes('media')) {
      return {
        targetInterests: ['Creative & Media', 'Design & UI/UX'],
        targetSkills: ['UI/UX Designer', 'Digital Marketer', 'Content Creator'],
        sponsorshipObjectives: ['brand_awareness', 'community_impact'],
        preferredEventTypes: ['meetup', 'workshop'],
      };
    }

    if (ind.includes('edtech') || ind.includes('youth') || ind.includes('skills')) {
      return {
        targetInterests: ['Education & Youth Skills', 'Technology & AI'],
        targetSkills: ['Student', 'Junior Developer', 'Engineering Student'],
        sponsorshipObjectives: ['community_impact', 'talent_recruitment'],
        preferredEventTypes: ['workshop', 'hackathon'],
      };
    }

    // Default general tech & brand awareness
    return {
      targetInterests: ['Technology & AI', 'Software Engineering'],
      targetSkills: ['Software Developer', 'Tech Talent', 'Student'],
      sponsorshipObjectives: ['brand_awareness', 'community_impact'],
      preferredEventTypes: ['hackathon', 'workshop', 'meetup'],
    };
  }

  /**
   * Retrieves active matching preferences for a sponsor user
   */
  static async getSponsorPreferences(userId: string): Promise<{
    preferences: SponsorPreferences;
    companyName: string;
    industryCategory: string;
    isCustomized: boolean;
  }> {
    const result = await query(
      `SELECT id, role, company_name, organization, industry_category, bio, sponsor_preferences 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      const err: any = new Error('Sponsor user not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = result.rows[0];
    const companyName = user.company_name || user.organization || 'Corporate Partner';
    const industryCategory = user.industry_category || 'Technology';

    const storedPrefs = user.sponsor_preferences;
    const hasCustomPrefs =
      storedPrefs &&
      typeof storedPrefs === 'object' &&
      Array.isArray(storedPrefs.targetInterests) &&
      storedPrefs.targetInterests.length > 0;

    const preferences: SponsorPreferences = hasCustomPrefs
      ? storedPrefs
      : this.getDefaultPreferencesForIndustry(industryCategory, companyName, user.bio);

    return {
      preferences,
      companyName,
      industryCategory,
      isCustomized: Boolean(hasCustomPrefs),
    };
  }

  /**
   * Saves updated matching preferences for a sponsor
   */
  static async updateSponsorPreferences(
    userId: string,
    newPreferences: Partial<SponsorPreferences>
  ): Promise<SponsorPreferences> {
    const current = await this.getSponsorPreferences(userId);
    const updated: SponsorPreferences = {
      ...current.preferences,
      ...newPreferences,
    };

    await query(
      `UPDATE users 
       SET sponsor_preferences = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(updated), userId]
    );

    return updated;
  }

  /**
   * Core recommendation engine:
   * Aggregates live platform telemetry and returns the Top 10 ranked events
   */
  static async getRecommendationsForSponsor(
    userId: string,
    overrides?: {
      preferences?: Partial<SponsorPreferences>;
      weights?: Partial<MatchingWeights>;
      limit?: number;
    }
  ): Promise<{
    sponsor: { id: string; companyName: string; industryCategory: string };
    preferences: SponsorPreferences;
    matches: ScoredEventMatch[];
    totalEligibleEvents: number;
    generatedAt: string;
  }> {
    // 1. Get sponsor details and preferences
    const sponsorData = await this.getSponsorPreferences(userId);
    const activePreferences: SponsorPreferences = {
      ...sponsorData.preferences,
      ...(overrides?.preferences || {}),
    };

    // 2. Fetch candidate events with real telemetry
    // We select published / open events (and single-day tech events)
    const eventsQuery = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.category,
        e.event_type,
        e.location,
        e.venue_name,
        e.event_date,
        e.capacity,
        e.is_paid,
        e.ticket_price,
        e.banner_url,
        e.poster_image_url,
        e.status,
        COUNT(DISTINCT r.id) AS registered_count,
        COUNT(DISTINCT CASE 
          WHEN (ci.id IS NOT NULL AND ci.voided_at IS NULL) 
            OR t.status IN ('CHECKED_IN', 'Used')
            OR (b.id IS NOT NULL AND b.revoked_at IS NULL)
          THEN r.id 
        END) AS checked_in_count,
        COUNT(DISTINCT CASE WHEN b.badge_code = 'attended' AND b.revoked_at IS NULL THEN b.id END) AS count_attended_badges,
        COUNT(DISTINCT CASE WHEN b.badge_code = 'participant' AND b.revoked_at IS NULL THEN b.id END) AS count_participant_badges,
        COUNT(DISTINCT CASE WHEN b.badge_code = 'winner' AND b.revoked_at IS NULL THEN b.id END) AS count_winner_badges,
        COUNT(DISTINCT CASE WHEN b.badge_code = 'speaker' AND b.revoked_at IS NULL THEN b.id END) AS count_speaker_badges,
        COALESCE(AVG(er.rating), 0)::NUMERIC(3, 2) AS avg_rating,
        COUNT(DISTINCT er.id) AS review_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
      LEFT JOIN check_ins ci ON r.id = ci.registration_id AND ci.voided_at IS NULL
      LEFT JOIN tickets t ON e.id = t.event_id AND t.registration_id = r.id
      LEFT JOIN badge_awards b ON e.id = b.event_id AND b.revoked_at IS NULL
      LEFT JOIN event_reviews er ON e.id = er.event_id
      WHERE e.status NOT IN ('canceled', 'cancelled', 'draft', 'completed')
        AND e.event_date >= (CURRENT_DATE - INTERVAL '1 day')
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `;

    const eventsRes = await query(eventsQuery);

    // Filter candidate events to ensure past/completed events are excluded
    // consistently with East Africa Time (EAT) expiration
    const now = new Date();
    const candidateRows = (eventsRes.rows || []).filter((row) => {
      const statusLower = String(row.status || '').toLowerCase();
      if (['canceled', 'cancelled', 'draft', 'completed'].includes(statusLower)) {
        return false;
      }
      if (row.event_date) {
        const expDate = computeEventDayExpiration(row.event_date);
        if (now.getTime() > expDate.getTime()) {
          return false;
        }
      }
      return true;
    });

    if (candidateRows.length === 0) {
      return {
        sponsor: {
          id: userId,
          companyName: sponsorData.companyName,
          industryCategory: sponsorData.industryCategory,
        },
        preferences: activePreferences,
        matches: [],
        totalEligibleEvents: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    // 3. For all events with registrations, fetch registration answers to extract participant roles and skills
    // Grouped by event_id to ensure NO participant PII leaks
    const registrationAnswersRes = await query(`
      SELECT 
        event_id,
        answers
      FROM registrations
      WHERE status = 'registered' AND answers IS NOT NULL AND answers::text != '{}'
    `);

    const eventRolesMap = new Map<string, Record<string, number>>();
    const eventSkillsMap = new Map<string, Record<string, number>>();

    for (const row of registrationAnswersRes.rows) {
      const eventId = row.event_id;
      const answers = row.answers || {};

      if (!eventRolesMap.has(eventId)) eventRolesMap.set(eventId, {});
      if (!eventSkillsMap.has(eventId)) eventSkillsMap.set(eventId, {});

      const roles = eventRolesMap.get(eventId)!;
      const skills = eventSkillsMap.get(eventId)!;

      // Extract role
      const foundRole = answers.sheba_role || answers.role || answers.def_q_1;
      if (foundRole && typeof foundRole === 'string' && foundRole.trim()) {
        const cleanRole = foundRole.trim();
        roles[cleanRole] = (roles[cleanRole] || 0) + 1;
      }

      // Extract skills / interests
      const rawInterests = answers.sheba_interests || answers.interests || answers.def_q_2;
      if (rawInterests) {
        const list = Array.isArray(rawInterests)
          ? rawInterests
          : String(rawInterests).split(/[,;\n]/);
        for (const item of list) {
          const cleanItem = String(item).trim();
          if (cleanItem && cleanItem.length > 1 && cleanItem.toUpperCase() !== 'N/A') {
            skills[cleanItem] = (skills[cleanItem] || 0) + 1;
          }
        }
      }
    }

    // 4. Map DB rows to EventCandidate objects
    const candidates: EventCandidate[] = candidateRows.map((row) => {
      const registeredCount = parseInt(row.registered_count || '0', 10);
      const checkedInCount = parseInt(row.checked_in_count || '0', 10);
      const verifiedAttendanceRate =
        registeredCount > 0 ? Math.round((checkedInCount / registeredCount) * 100) : 0;

      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        category: row.category || 'Tech',
        eventType: row.event_type || 'workshop',
        location: row.location || 'Addis Ababa',
        eventDate: row.event_date ? new Date(row.event_date).toISOString() : new Date().toISOString(),
        capacity: parseInt(row.capacity || '100', 10),
        registeredCount,
        checkedInCount,
        verifiedAttendanceRate,
        bannerUrl: row.poster_image_url || row.banner_url || undefined,
        isPaid: Boolean(row.is_paid),
        ticketPrice: parseFloat(row.ticket_price || '0'),
        attendeeRoles: eventRolesMap.get(row.id) || {},
        attendeeSkills: eventSkillsMap.get(row.id) || {},
        badgeCounts: {
          attended: parseInt(row.count_attended_badges || '0', 10) || checkedInCount,
          participant: parseInt(row.count_participant_badges || '0', 10),
          winner: parseInt(row.count_winner_badges || '0', 10),
          speaker: parseInt(row.count_speaker_badges || '0', 10),
        },
        averageRating: parseFloat(row.avg_rating || '0'),
        reviewCount: parseInt(row.review_count || '0', 10),
      };
    });

    // 5. Compute Semantic Similarities via EmbeddingService
    const sponsorProfileText = `Sponsor: ${sponsorData.companyName}. Industry: ${sponsorData.industryCategory}. Focus: ${activePreferences.targetInterests.join(', ')}. Skills: ${activePreferences.targetSkills.join(', ')}. Objectives: ${activePreferences.sponsorshipObjectives.join(', ')}.`;

    const semanticScores = new Map<string, number>();

    try {
      const sponsorEmbedding = await EmbeddingService.getEmbedding(sponsorProfileText);

      // Batch process candidate event embeddings
      await Promise.all(
        candidates.map(async (candidate) => {
          const eventText = `Event: ${candidate.title}. Type: ${candidate.eventType}. Category: ${candidate.category}. Description: ${candidate.description}`;
          const eventEmbedding = await EmbeddingService.getEmbedding(eventText);
          const score = await EmbeddingService.computeSimilarity(sponsorProfileText, eventText);
          semanticScores.set(candidate.id, score);
        })
      );
    } catch (err) {
      console.warn('Embedding computation warning, falling back to local text similarity:', err);
    }

    // 6. Rank events using pure ranking engine
    const topRanked = rankEventsForSponsor(candidates, activePreferences, {
      sponsorIndustry: sponsorData.industryCategory,
      semanticScores,
      weights: overrides?.weights,
      topN: overrides?.limit || 10,
    });

    return {
      sponsor: {
        id: userId,
        companyName: sponsorData.companyName,
        industryCategory: sponsorData.industryCategory,
      },
      preferences: activePreferences,
      matches: topRanked,
      totalEligibleEvents: candidates.length,
      generatedAt: new Date().toISOString(),
    };
  }
}
