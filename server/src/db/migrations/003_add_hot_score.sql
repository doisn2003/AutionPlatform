-- ==============================================
-- Migration 003: Thêm cột hot_score vào bảng auctions
-- ==============================================

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS hot_score NUMERIC DEFAULT 0;
