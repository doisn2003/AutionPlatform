-- ==============================================
-- Migration 007: Bảng hồ sơ & uy tín người dùng
-- ==============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  
  -- Thông tin cá nhân (Người dùng tự điền)
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  email VARCHAR(255),                -- (tuỳ chọn, để nhận thông báo)
  social_links JSONB DEFAULT '{}',   -- { twitter, telegram, website }
  
  -- Thông tin xác minh (Verification)
  is_verified BOOLEAN DEFAULT false, -- Admin xác minh thủ công (tuỳ chọn)
  kyc_status VARCHAR(20) DEFAULT 'none', -- 'none' | 'pending' | 'verified'
  
  -- Thống kê hoạt động (Cập nhật tự động từ Event Listener)
  total_auctions_created INTEGER DEFAULT 0,  -- Số phiên đấu giá đã tạo
  total_bids_placed INTEGER DEFAULT 0,       -- Số lần tham gia đấu giá
  total_bids_won INTEGER DEFAULT 0,          -- Số lần thắng đấu giá
  total_nfts_minted INTEGER DEFAULT 0,       -- Số NFT đã đúc
  total_disputes_filed INTEGER DEFAULT 0,    -- Số tranh chấp đã khiếu nại
  total_disputes_won INTEGER DEFAULT 0,      -- Số tranh chấp thắng
  total_disputes_lost INTEGER DEFAULT 0,     -- Số tranh chấp thua
  successful_deliveries INTEGER DEFAULT 0,   -- Số lần bàn giao thành công (xác nhận bởi buyer)
  
  -- Staking (On-chain nhưng cache ở đây)
  adf_staked_for_juror NUMERIC DEFAULT 0,    -- Lượng ADF đã stake để đủ tư cách Juror
  
  -- Điểm uy tín (Tính tự động)
  reputation_score NUMERIC(10, 2) DEFAULT 0,
  juror_eligible BOOLEAN DEFAULT false,      -- True nếu đủ điểm làm Juror
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet ON user_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation ON user_profiles(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_juror ON user_profiles(juror_eligible);
