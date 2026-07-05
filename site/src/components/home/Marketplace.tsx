/**
 * Marketplace — Danh sách phiên đấu giá
 * 
 * Hiển thị dữ liệu thật từ server API
 * Bao gồm BidModal khi click "Đấu Giá".
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import styles from './Marketplace.module.css';
import NFTCard from '../common/NFTCard';
import BidModal from './BidModal';
import { useAuctions, type AuctionFromAPI } from '../../hooks/useAuctions';

type FilterType = 'all' | 'active' | 'ended';

const Marketplace: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: auctions, isLoading, error } = useAuctions(filter);
  const { isConnected } = useAccount();

  // BidModal state
  const [selectedAuction, setSelectedAuction] = useState<AuctionFromAPI | null>(null);

  const handleBid = (auction: AuctionFromAPI) => {
    setSelectedAuction(auction);
  };

  return (
    <section className={styles.marketplaceSection}>
      <div className={styles.sectionHeader}>
        <h2 className={`text-gradient ${styles.sectionTitle}`}>Khám Phá Vật Phẩm</h2>
        
        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button 
            className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả
          </button>
          <button 
            className={`${styles.filterTab} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            Đang diễn ra
          </button>
          <button 
            className={`${styles.filterTab} ${filter === 'ended' ? styles.active : ''}`}
            onClick={() => setFilter('ended')}
          >
            Đã kết thúc
          </button>
        </div>
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
      {!isLoading && !error && auctions && auctions.length === 0 && (
        <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', marginTop: '20px', border: '1px dashed var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <span className="material-symbols-outlined pulse-live" style={{ fontSize: '3.5rem', color: 'var(--color-primary)', display: 'inline-block' }}>inventory_2</span>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 300, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="text-gradient">Chưa có phiên đấu giá nào</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 300, maxWidth: '450px', margin: '0 auto', lineHeight: 1.5 }}>
              Hiện tại không có phiên đấu giá nào phù hợp với bộ lọc này. Hãy kết nối ví, đúc NFT mới và khởi tạo phiên đấu giá đầu tiên tại trang **Đúc vật phẩm**!
            </p>
          </div>
          <div style={{ marginTop: '8px' }}>
            <a href="/mint" className="btn btn-gradient btn-sm">Đúc NFT Ngay</a>
          </div>
        </div>
      )}

      {/* NFT Grid */}
      {auctions && auctions.length > 0 && (
        <div className={styles.nftGrid}>
          {auctions.map((auction) => (
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
