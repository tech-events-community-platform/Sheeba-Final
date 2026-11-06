-- Stage 4: Sponsor Deliverables Persistence
CREATE TABLE IF NOT EXISTS sponsorship_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES sponsorship_deals(id) ON DELETE CASCADE,
    sponsor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    tagline VARCHAR(255),
    primary_color VARCHAR(50) DEFAULT '#63474D',
    secondary_color VARCHAR(50) DEFAULT '#FFA686',
    media_kit_url TEXT,
    bio TEXT,
    booth_preference TEXT,
    av_requirements TEXT,
    ticket_vouchers_needed TEXT,
    rep_name VARCHAR(255) NOT NULL,
    rep_title VARCHAR(255) NOT NULL,
    rep_phone VARCHAR(50) NOT NULL,
    rep_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'FULFILLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_deliverables_deal_id ON sponsorship_deliverables(deal_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_deliverables_sponsor_id ON sponsorship_deliverables(sponsor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_deal_deliverable ON sponsorship_deliverables (deal_id) WHERE deal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_sponsor_default_deliverable ON sponsorship_deliverables (sponsor_id) WHERE deal_id IS NULL;

