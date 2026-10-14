const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_8UYfiRk5BSIZ@ep-hidden-grass-aynhb6al.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const eId = 'e763d5f1-a236-40ba-abbf-5edcb7f0ad2f';
  const res = await pool.query(
    "SELECT b.id, b.badge_code, b.awarded_at, b.user_id, u.full_name, u.email FROM badge_awards b JOIN users u ON b.user_id = u.id WHERE b.event_id = $1",
    [eId]
  );
  console.log('BADGE HOLDERS:', res.rows);

  // Check what getEventRoster query returns
  const rosterQuery = `
    SELECT 
      r.id AS roster_id,
      r.id AS registration_id,
      u.id AS attendee_id,
      u.full_name AS name,
      u.email,
      r.registered_at,
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
  const rosterRes = await pool.query(rosterQuery, [eId]);
  console.log('ROSTER ITEMS COUNT:', rosterRes.rows.length);
  const withBadges = rosterRes.rows.filter(r => r.badges && r.badges.length > 0);
  console.log('ROSTER ITEMS WITH BADGES:', withBadges.map(r => ({ name: r.name, email: r.email, badges: r.badges, ticket_status: r.ticket_status, check_in_id: r.check_in_id })));

  await pool.end();
}

run().catch(console.error);
