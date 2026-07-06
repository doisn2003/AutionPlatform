-- ==============================================
-- Migration 009: Bảng Sổ Cái Giao Dịch & Biến Động Số Dư
-- ==============================================

CREATE TABLE IF NOT EXISTS user_transactions (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  tx_type VARCHAR(50) NOT NULL, -- SWAP_ETH_TO_ADF, SWAP_ADF_TO_ETH, TRANSFER_SEND, TRANSFER_RECEIVE, AUCTION_BID, WITHDRAW, SELLER_DEPOSIT, BUYER_DEPOSIT, ESCROW_RELEASE, DEPOSIT_BURN, JUROR_STAKE, JUROR_UNSTAKE, JUROR_REWARD, JUROR_PENALTY
  amount NUMERIC NOT NULL,
  balance_change VARCHAR(25) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uniq_tx_user_type UNIQUE (tx_hash, user_address, tx_type)
);

CREATE INDEX IF NOT EXISTS idx_user_transactions_user ON user_transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created ON user_transactions(created_at DESC);
