-- ==============================================
-- Migration 010: Bổ sung thông tin địa điểm bàn giao tài sản vật lý
-- ==============================================

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS location_province VARCHAR(100);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS location_district VARCHAR(100);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS location_ward VARCHAR(100);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS location_detail TEXT;
