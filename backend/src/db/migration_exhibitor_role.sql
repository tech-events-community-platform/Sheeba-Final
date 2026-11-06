-- ============================================================
-- Migration: Add is_exhibitor column to users table
-- Purpose:   Enables multi-role accounts — a user can have
--            is_exhibitor = TRUE regardless of their primary role.
--            This mirrors the existing is_organizer pattern.
-- Run once against the database (safe to run multiple times
-- thanks to IF NOT EXISTS).
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_exhibitor BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing accounts that registered with role='exhibitor'
-- so they retain exhibitor access under the new flag-based system.
UPDATE users
   SET is_exhibitor = TRUE
 WHERE LOWER(role) = 'exhibitor'
   AND is_exhibitor = FALSE;

-- Verification query
SELECT
  COUNT(*) FILTER (WHERE is_exhibitor = TRUE)  AS exhibitor_flag_count,
  COUNT(*) FILTER (WHERE LOWER(role) = 'exhibitor') AS exhibitor_role_count
FROM users;

