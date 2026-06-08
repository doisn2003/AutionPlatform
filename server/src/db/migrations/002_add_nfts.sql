-- ==============================================
-- Migration 002: Khởi tạo bảng nfts
-- ==============================================

CREATE TABLE IF NOT EXISTS nfts (
  id SERIAL PRIMARY KEY,
  token_id INTEGER UNIQUE NOT NULL,
  owner VARCHAR(42) NOT NULL,
  token_uri TEXT NOT NULL,
  name VARCHAR(255),
  description TEXT,
  image TEXT,
  attributes JSONB,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes cho truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner);
CREATE INDEX IF NOT EXISTS idx_nfts_token_id ON nfts(token_id);
