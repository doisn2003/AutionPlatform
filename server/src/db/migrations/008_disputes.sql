-- ==============================================
-- Migration 008: Bảng tranh chấp & lịch sử bỏ phiếu trọng tài
-- ==============================================

-- Bảng tranh chấp (đồng bộ từ DisputeResolution events)
CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER UNIQUE NOT NULL,
  auction_id INTEGER UNIQUE NOT NULL,
  buyer VARCHAR(42) NOT NULL,
  seller VARCHAR(42) NOT NULL,
  initiator VARCHAR(42) NOT NULL,
  buyer_evidence_ipfs TEXT,
  seller_evidence_ipfs TEXT,
  buyer_description TEXT,
  buyer_images TEXT[],
  seller_description TEXT,
  seller_images TEXT[],
  selected_jurors VARCHAR(42)[] DEFAULT '{}',
  phase VARCHAR(20) DEFAULT 'EVIDENCE', -- 'EVIDENCE' | 'COMMIT' | 'REVEAL' | 'RESOLVED'
  evidence_deadline TIMESTAMPTZ,
  commit_deadline TIMESTAMPTZ,
  reveal_deadline TIMESTAMPTZ,
  buyer_votes INTEGER DEFAULT 0,
  seller_votes INTEGER DEFAULT 0,
  abstain_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  winner VARCHAR(42),
  tx_hash VARCHAR(66),
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_dispute_auction FOREIGN KEY (auction_id) REFERENCES auctions(auction_id) ON DELETE CASCADE
);

-- Bảng chi tiết phiếu bầu của từng trọng tài
CREATE TABLE IF NOT EXISTS dispute_votes (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER NOT NULL,
  juror VARCHAR(42) NOT NULL,
  has_committed BOOLEAN DEFAULT false,
  has_revealed BOOLEAN DEFAULT false,
  commit_hash VARCHAR(66),
  revealed_vote INTEGER DEFAULT 0, -- 0: abstain, 1: buyer, 2: seller
  reward_amount NUMERIC DEFAULT 0,
  penalty_amount NUMERIC DEFAULT 0,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_dispute_vote_dispute FOREIGN KEY (dispute_id) REFERENCES disputes(dispute_id) ON DELETE CASCADE,
  CONSTRAINT unique_dispute_juror UNIQUE (dispute_id, juror)
);

-- Tạo indexes
CREATE INDEX IF NOT EXISTS idx_disputes_auction ON disputes(auction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_resolved ON disputes(resolved);
CREATE INDEX IF NOT EXISTS idx_dispute_votes_dispute ON dispute_votes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_votes_juror ON dispute_votes(juror);
