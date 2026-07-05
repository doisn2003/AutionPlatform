-- ==============================================
-- Migration 006: Bảng lịch sử swap AMM
-- ==============================================

CREATE TABLE IF NOT EXISTS swap_history (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  swap_type VARCHAR(15) NOT NULL CHECK (swap_type IN ('ETH_TO_ADF', 'ADF_TO_ETH')),
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC NOT NULL,
  fee_collected NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swap_history_user ON swap_history(user_address);
CREATE INDEX IF NOT EXISTS idx_swap_history_created ON swap_history(created_at DESC);
