-- Sheeba Stage 2: Formal Sponsorship Application Workflow Migration
-- Extends sponsorship_deals to support formal applications, admin review, and resubmissions

-- 1. Update check constraint to support PENDING, APPROVED, REJECTED while preserving historical INTERESTED and DECLINED
ALTER TABLE sponsorship_deals DROP CONSTRAINT IF EXISTS sponsorship_deals_status_check;
ALTER TABLE sponsorship_deals ADD CONSTRAINT sponsorship_deals_status_check 
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'INTERESTED', 'DECLINED'));

-- Set default status to 'PENDING' for new formal applications
ALTER TABLE sponsorship_deals ALTER COLUMN status SET DEFAULT 'PENDING';

-- 2. Add formal application & admin review columns
ALTER TABLE sponsorship_deals ADD COLUMN IF NOT EXISTS proposal_message TEXT;
ALTER TABLE sponsorship_deals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE sponsorship_deals ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sponsorship_deals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 3. Replace partial unique index to support re-application after rejection:
-- An active application is one in ('PENDING', 'APPROVED', 'INTERESTED') and deleted_at IS NULL.
-- Once an application is REJECTED or DECLINED, the historical record remains intact,
-- and the sponsor can safely submit a fresh application for that pitch.
ALTER TABLE sponsorship_deals DROP CONSTRAINT IF EXISTS unique_sponsor_application_deal;
DROP INDEX IF EXISTS idx_unique_active_sponsor_deal;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_sponsor_deal 
  ON sponsorship_deals (application_id, sponsor_id) 
  WHERE deleted_at IS NULL AND status IN ('PENDING', 'APPROVED', 'INTERESTED');

-- 4. Admin query and review indexes
CREATE INDEX IF NOT EXISTS idx_sponsorship_deals_reviewed_by ON sponsorship_deals(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_sponsorship_deals_created_at ON sponsorship_deals(created_at);

