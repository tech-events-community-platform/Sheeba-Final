import { query } from '../config/db';
import { AuthService } from './auth.service';

export class SearchService {
  static async searchPublic(searchQuery: string) {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return { attendees: [], events: [] };
    }

    // Search public attendees
    const usersRes = await query(
      `SELECT id, email, full_name, role, phone, bio, organization, avatar_url, visibility, member_since
       FROM users
       WHERE visibility = 'public' AND (full_name ILIKE $1 OR email ILIKE $1)
       LIMIT 20`,
      [`%${q}%`]
    );

    const attendees = await Promise.all(
      usersRes.rows.map(async (u) => {
        const stats = await AuthService.computeUserStats(u.id);
        return AuthService.formatUserResponse(u, stats);
      })
    );

    // Sheeba events are private / direct-link only, not public
    return {
      attendees,
      events: [],
    };
  }
}
