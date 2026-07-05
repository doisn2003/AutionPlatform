-- ==============================================
-- Migration 001: Khởi tạo bảng auctions + bids
-- ==============================================
-- Dùng cho Supabase PostgreSQL
-- Chạy migration này qua Supabase SQL Editor hoặc CLI

-- Bảng phiên đấu giá (đồng bộ từ blockchain event AuctionCreated)
CREATE TABLE IF NOT EXISTS auctions (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER UNIQUE NOT NULL,
  seller VARCHAR(42) NOT NULL,
  nft_token_id INTEGER NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reserve_price TEXT NOT NULL,
  min_bid_increment TEXT NOT NULL,
  current_top_bidder VARCHAR(42),
  current_top_bid TEXT DEFAULT '0',
  active BOOLEAN DEFAULT true,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng lịch sử bid (đồng bộ từ blockchain event BidPlaced)
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER NOT NULL,
  bidder VARCHAR(42) NOT NULL,
  amount TEXT NOT NULL,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_auction FOREIGN KEY (auction_id) REFERENCES auctions(auction_id) ON DELETE CASCADE
);

-- Bảng theo dõi block đã sync (để catchup khi restart)
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_block BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed sync_state
INSERT INTO sync_state (id, last_synced_block) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Indexes cho truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_auctions_active ON auctions(active);
CREATE INDEX IF NOT EXISTS idx_auctions_seller ON auctions(seller);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder);
