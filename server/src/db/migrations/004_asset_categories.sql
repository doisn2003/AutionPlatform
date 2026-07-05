-- ==============================================
-- Migration 004: Bảng danh mục vật phẩm
-- ==============================================

CREATE TABLE IF NOT EXISTS asset_categories (
  id SERIAL PRIMARY KEY,
  asset_type VARCHAR(10) NOT NULL CHECK (asset_type IN ('DIGITAL', 'PHYSICAL')),
  category_code VARCHAR(30) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),                           -- Tên icon của Lucide React (VD: 'image', 'gamepad-2')
  description TEXT,
  requires_escrow BOOLEAN DEFAULT false,      -- true nếu PHYSICAL
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed dữ liệu danh mục (Sử dụng icon chuẩn Lucide React)
INSERT INTO asset_categories (asset_type, category_code, display_name, icon, requires_escrow, sort_order) VALUES
  -- Tài sản số (Digital) — Không cần escrow
  ('DIGITAL', 'DIGITAL_NFT_ART',       'Ảnh Nghệ thuật NFT',             'image', false, 1),
  ('DIGITAL', 'DIGITAL_GAME_ITEM',     'Vật phẩm Game',                  'sword', false, 2),
  ('DIGITAL', 'DIGITAL_SOCIAL_ACCOUNT','Tài khoản Mạng xã hội',         'smartphone', false, 3),
  ('DIGITAL', 'DIGITAL_GAME_ACCOUNT',  'Tài khoản Game',                 'gamepad-2', false, 4),
  ('DIGITAL', 'DIGITAL_DOCUMENT',      'Tài liệu / Bản quyền số',       'file-text', false, 5),
  ('DIGITAL', 'DIGITAL_MUSIC_VIDEO',   'Âm nhạc / Video NFT',            'music', false, 6),
  ('DIGITAL', 'DIGITAL_DOMAIN',        'Tên miền / Domain',              'globe', false, 7),
  ('DIGITAL', 'DIGITAL_OTHER',         'Khác (Digital)',                  'monitor', false, 8),
  -- Tài sản vật lý (Physical) — Bắt buộc escrow
  ('PHYSICAL', 'PHYSICAL_DIAMOND',     'Kim cương & Đá quý',             'gem', true, 10),
  ('PHYSICAL', 'PHYSICAL_WATCH',       'Đồng hồ',                        'watch', true, 11),
  ('PHYSICAL', 'PHYSICAL_VEHICLE',     'Xe cộ',                           'car', true, 12),
  ('PHYSICAL', 'PHYSICAL_BONSAI',      'Cây cảnh',                        'tree-deciduous', true, 13),
  ('PHYSICAL', 'PHYSICAL_PAINTING',    'Tranh / Tác phẩm',               'palette', true, 14),
  ('PHYSICAL', 'PHYSICAL_JEWELRY',     'Trang sức & Phụ kiện',            'gem', true, 15),
  ('PHYSICAL', 'PHYSICAL_REAL_ESTATE', 'Bất động sản',                    'home', true, 16),
  ('PHYSICAL', 'PHYSICAL_COLLECTIBLE', 'Sưu tầm (Tem, cổ vật)',          'package', true, 17),
  ('PHYSICAL', 'PHYSICAL_OTHER',       'Khác (Physical)',                 'box', true, 18)
ON CONFLICT (category_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_categories_type ON asset_categories(asset_type);
