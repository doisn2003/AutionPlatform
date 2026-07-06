/**
 * Marketplace — Danh sách phiên đấu giá
 * 
 * Hiển thị dữ liệu thật từ server API, lọc theo trạng thái và phân loại danh mục (8:2 split).
 * Bao gồm BidModal khi click "Đấu Giá".
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import * as LucideIcons from 'lucide-react';
import styles from './Marketplace.module.css';
import NFTCard from '../common/NFTCard';
import BidModal from './BidModal';
import { useAuctions, type AuctionFromAPI } from '../../hooks/useAuctions';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface AssetCategory {
  id: number;
  asset_type: 'DIGITAL' | 'PHYSICAL';
  category_code: string;
  display_name: string;
  icon: string;
  description: string;
  requires_escrow: boolean;
}

const toPascalCase = (str: string) =>
  str.replace(/(^\w|-\w)/g, (clearAndUpper) => clearAndUpper.replace(/-/, '').toUpperCase());

const DynamicIcon = ({ name, size = 15, className = '' }: { name: string; size?: number; className?: string }) => {
  const iconName = toPascalCase(name);
  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
};

type FilterType = 'all' | 'active' | 'ended';
type AssetTypeFilter = 'all' | 'DIGITAL' | 'PHYSICAL';

const Marketplace: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetTypeFilter>('all');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('all');
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const { data: auctions, isLoading, error } = useAuctions(filter);
  const { isConnected } = useAccount();

  // Scroll container ref for arrow navigation
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // BidModal state
  const [selectedAuction, setSelectedAuction] = useState<AuctionFromAPI | null>(null);

  // Fetch categories at mount
  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => console.error('Failed to fetch categories:', err));
  }, []);

  const handleBid = (auction: AuctionFromAPI) => {
    setSelectedAuction(auction);
  };

  // Compute auction count per category based on active status selection
  const getCategoryCount = (categoryCode: string) => {
    if (!auctions) return 0;
    return auctions.filter((a) => {
      const code = a.category_code || (a.asset_type === 'PHYSICAL' ? 'PHYSICAL_OTHER' : 'DIGITAL_NFT_ART');
      return code === categoryCode;
    }).length;
  };

  // Smooth scroll handler
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 220; // Scroll amount in px
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Filter displayed auctions
  const displayedAuctions = auctions
    ? auctions.filter((a) => {
        // Filter by Asset Type (DIGITAL / PHYSICAL)
        if (selectedAssetType !== 'all' && a.asset_type !== selectedAssetType) return false;
        // Filter by specific Category Code
        if (selectedCategoryCode !== 'all') {
          const code = a.category_code || (a.asset_type === 'PHYSICAL' ? 'PHYSICAL_OTHER' : 'DIGITAL_NFT_ART');
          if (code !== selectedCategoryCode) return false;
        }
        return true;
      })
    : [];

  return (
    <section className={styles.marketplaceSection}>
      {/* Filters Header Container (8:2 Split) */}
      <div className={styles.filterHeaderContainer}>
        <div className={styles.filterGrid}>
          {/* Part 1: Top-level Asset Type Selector (80% width) */}
          <div className={styles.assetTypeSection}>
            <button
              className={`${styles.filterTab} ${selectedAssetType === 'all' ? styles.activeTab : ''}`}
              onClick={() => {
                setSelectedAssetType('all');
                setSelectedCategoryCode('all');
              }}
            >
              Tất cả tài sản
            </button>
            <button
              className={`${styles.filterTab} ${selectedAssetType === 'DIGITAL' ? styles.activeTab : ''}`}
              onClick={() => {
                setSelectedAssetType('DIGITAL');
                setSelectedCategoryCode('all');
              }}
            >
              Tài sản kỹ thuật số
            </button>
            <button
              className={`${styles.filterTab} ${selectedAssetType === 'PHYSICAL' ? styles.activeTab : ''}`}
              onClick={() => {
                setSelectedAssetType('PHYSICAL');
                setSelectedCategoryCode('all');
              }}
            >
              Tài sản vật lý
            </button>
          </div>

          {/* Part 2: Bidding Status Filter Selector (20% width) */}
          <div className={styles.statusSection}>
            <div className={styles.statusTabs}>
              <button 
                className={`${styles.statusTab} ${filter === 'all' ? styles.activeStatusTab : ''}`}
                onClick={() => setFilter('all')}
              >
                Tất cả
              </button>
              <button 
                className={`${styles.statusTab} ${filter === 'active' ? styles.activeStatusTab : ''}`}
                onClick={() => setFilter('active')}
              >
                Đang diễn ra
              </button>
              <button 
                className={`${styles.statusTab} ${filter === 'ended' ? styles.activeStatusTab : ''}`}
                onClick={() => setFilter('ended')}
              >
                Đã kết thúc
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Category Pills (Flanked by Left/Right Arrow scroll buttons) */}
        {selectedAssetType !== 'all' && !isLoading && !error && categories.length > 0 && (
          <div className={styles.scrollWrapper}>
            {/* Scroll Left Button */}
            <button 
              className={`${styles.scrollArrow} ${styles.leftArrow}`} 
              onClick={() => handleScroll('left')}
              title="Cuộn sang trái"
            >
              <LucideIcons.ChevronLeft size={16} />
            </button>

            <div ref={scrollContainerRef} className={styles.categoriesContainer}>
              {/* Pill: All sub-categories of this type */}
              <button
                onClick={() => setSelectedCategoryCode('all')}
                className={`${styles.categoryPill} ${selectedCategoryCode === 'all' ? styles.pillActive : ''}`}
              >
                <LucideIcons.LayoutGrid size={14} className={styles.pillIcon} />
                <span>Tất cả {selectedAssetType === 'DIGITAL' ? 'số' : 'vật lý'}</span>
                <span className={styles.pillCount}>
                  {auctions ? auctions.filter(a => a.asset_type === selectedAssetType).length : 0}
                </span>
              </button>

              {/* Pills: Specific categories of selected type, sorted descending by active auction count */}
              {categories
                .filter((cat) => cat.asset_type === selectedAssetType)
                .sort((a, b) => getCategoryCount(b.category_code) - getCategoryCount(a.category_code))
                .map((cat) => {
                  const count = getCategoryCount(cat.category_code);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryCode(cat.category_code)}
                      className={`${styles.categoryPill} ${selectedCategoryCode === cat.category_code ? styles.pillActive : ''}`}
                    >
                      <DynamicIcon name={cat.icon} size={14} className={styles.pillIcon} />
                      <span>{cat.display_name}</span>
                      <span className={styles.pillCount}>{count}</span>
                    </button>
                  );
                })}
            </div>

            {/* Scroll Right Button */}
            <button 
              className={`${styles.scrollArrow} ${styles.rightArrow}`} 
              onClick={() => handleScroll('right')}
              title="Cuộn sang phải"
            >
              <LucideIcons.ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={styles.statusMessage}>
          <span className="material-symbols-outlined" style={{ animation: 'pulse 1.5s infinite' }}>hourglass_empty</span>
          <span>Đang tải dữ liệu từ blockchain...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.statusMessage}>
          <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>error</span>
          <span>Không thể tải dữ liệu. Server có đang chạy?</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && displayedAuctions.length === 0 && (
        <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', marginTop: '20px', border: '1px dashed var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <span className="material-symbols-outlined pulse-live" style={{ fontSize: '3.5rem', color: 'var(--color-primary)', display: 'inline-block' }}>inventory_2</span>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 300, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="text-gradient">Không tìm thấy vật phẩm</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 300, maxWidth: '450px', margin: '0 auto', lineHeight: 1.5 }}>
              Hiện tại không có phiên đấu giá nào phù hợp với bộ lọc danh mục này. Hãy thử chọn danh mục khác hoặc khởi tạo phiên đấu giá đầu tiên tại trang **Đúc vật phẩm**!
            </p>
          </div>
          <div style={{ marginTop: '8px' }}>
            <a href="/mint" className="btn btn-gradient btn-sm">Đúc NFT Ngay</a>
          </div>
        </div>
      )}

      {/* NFT Grid */}
      {!isLoading && !error && displayedAuctions.length > 0 && (
        <div className={styles.nftGrid}>
          {displayedAuctions.map((auction) => (
            <NFTCard 
              key={auction.auction_id} 
              auction={auction}
              onBid={isConnected ? () => handleBid(auction) : undefined}
            />
          ))}
        </div>
      )}

      {/* Bid Modal */}
      {selectedAuction && isConnected && (
        <BidModal
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
        />
      )}
    </section>
  );
};

export default Marketplace;
