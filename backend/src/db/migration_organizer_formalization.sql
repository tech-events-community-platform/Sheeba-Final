-- ============================================================
-- Migration: Add Organizer Application Formalization Columns
-- Purpose:   Supports formal Organizer applications for both
--            Individual Organizers and Organizations / Institutions,
--            including optional organization logo upload, admin
--            review reasons, and request-for-info notes.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS applicant_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS applicant_position VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_description TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_website VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_logo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_info_requested_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_applied_at TIMESTAMPTZ;

-- Backfill organizer_applied_at for existing pending/approved organizers if null
UPDATE users
   SET organizer_applied_at = created_at
 WHERE organizer_applied_at IS NULL
   AND (is_organizer = TRUE OR organizer_approval_status != 'none');

