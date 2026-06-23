-- ==============================================
-- Migration 005: Thêm danh mục vào bảng auctions
-- ==============================================

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS asset_type VARCHAR(10) DEFAULT 'DIGITAL';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS category_code VARCHAR(30);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS dispute_type VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS escrow_duration INTEGER DEFAULT 0;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS phase VARCHAR(20) DEFAULT 'BIDDING';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS escrow_deadline TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_auctions_category ON auctions(category_code);
CREATE INDEX IF NOT EXISTS idx_auctions_phase ON auctions(phase);
