/**
 * NFTCard — Card hiển thị thông tin phiên đấu giá
 * 
 * Nhận dữ liệu từ server API (AuctionFromAPI) thay vì mock data.
 * Tự tính trạng thái (active/ended) từ end_time và active flag.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import styles from './NFTCard.module.css';
import { type AuctionFromAPI } from '../../hooks/useAuctions';
import { formatTimeLeftShort } from '../../utils/formatters';
import { formatUnits } from 'viem';
import { useNFTImage } from '../../hooks/useNFTImage';

// Helper to convert category icon string to PascalCase for Lucide React
const toPascalCase = (str: string) =>
  str.replace(/(^\w|-\w)/g, (clearAndUpper) => clearAndUpper.replace(/-/, '').toUpperCase());

// Dynamic Icon Component using Lucide React
const DynamicIcon = ({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) => {
  const iconName = toPascalCase(name);
  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
};

interface NFTCardProps {
  auction: AuctionFromAPI;
  onBid?: () => void;
}

const NFTCard: React.FC<NFTCardProps> = ({ auction, onBid }) => {
  const endTimeMs = new Date(auction.end_time).getTime();
  const isExpired = Date.now() >= endTimeMs;
  const isEnded = !auction.active;

  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeftShort(endTimeMs));

  useEffect(() => {
    if (isEnded || isExpired) return;

    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeftShort(endTimeMs));
    }, 60000);

    return () => clearInterval(interval);
  }, [endTimeMs, isEnded, isExpired]);

  // Format prices from wei to ADF
  const currentBid = parseFloat(formatUnits(BigInt(auction.current_top_bid || '0'), 18));
  const reservePrice = parseFloat(formatUnits(BigInt(auction.reserve_price), 18));
  const hasBids = currentBid > 0;
  
  const { imageUrl } = useNFTImage(auction.nft_token_id, auction.image);
  const sellerShort = `${auction.seller.slice(0, 6)}...${auction.seller.slice(-4)}`;

  const isPhysical = auction.asset_type === 'PHYSICAL';

  return (
    <Link 
      to={`/auction/${auction.auction_id}`} 
      className={`${styles.nftCardLink} ${isEnded ? styles.endedOpacity : ''}`}
    >
      <div className={`glass-panel ${styles.nftCard}`}>
        {/* Asset Type Badge (Physical/Digital) */}
        <div className={styles.assetTypeBadge}>
          {isPhysical ? 'VẬT LÝ' : 'KỸ THUẬT SỐ'}
        </div>

        {/* Image Container */}
        <div className={`${styles.cardImgContainer} ${isEnded ? styles.endedImg : ''}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={auction.name || `NFT #${auction.nft_token_id}`} className={styles.cardImg} />
          ) : (
            <div className={styles.placeholderImage}>
              <span className="material-symbols-outlined">image_not_supported</span>
              <span>Không có ảnh</span>
            </div>
          )}

          {/* Countdown timer on active auctions (over the image) */}
          {!isEnded && !isExpired && (
            <div className={styles.imageCountdown}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.95rem', marginRight: '4px', verticalAlign: 'middle' }}>
                schedule
              </span>
              <span>{timeLeft}</span>
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className={styles.cardContent}>
          {/* Item Category (Lucide icon + display name) */}
          {auction.category_icon && auction.category_name && (
            <div className={styles.categoryRow}>
              <DynamicIcon name={auction.category_icon} size={14} className="text-gold" />
              <span className={styles.categoryText}>{auction.category_name}</span>
            </div>
          )}

          <h3 className={styles.cardTitle} style={{ color: isEnded ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
            {auction.name || `Vật phẩm #${auction.nft_token_id}`}
          </h3>
          
          <div className={styles.cardCreator}>
            Phiên #{auction.auction_id} • Người bán: {sellerShort}
          </div>

          {/* Double Prices: Start Price and Current Bid */}
          <div className={styles.priceGrid}>
            <div className={styles.priceBox}>
              <span className={styles.priceLabel}>Khởi điểm</span>
              <span className={styles.priceValue}>{reservePrice.toFixed(2)} ADF</span>
            </div>
            <div className={`${styles.priceBox} ${styles.priceBoxHighlight}`}>
              <span className={styles.priceLabel}>{isEnded ? 'Giá chung cuộc' : 'Giá hiện tại'}</span>
              <span className={`${styles.priceValue} text-gold`}>
                {(hasBids ? currentBid : reservePrice).toFixed(2)} ADF
              </span>
            </div>
          </div>
          
          {!isEnded && !isExpired && (
            <button 
              className="btn btn-primary btn-sm w-full" 
              style={{ marginTop: '12px' }}
            >
              ĐẤU NGAY
            </button>
          )}
          
          {isExpired && !isEnded && (
            <button 
              className="btn btn-outline btn-sm w-full" 
              disabled 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{ marginTop: '12px' }}
            >
              Đang chờ kết thúc...
            </button>
          )}
          
          {isEnded && (
            <button 
              className="btn btn-disabled btn-sm w-full" 
              disabled
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{ marginTop: '12px' }}
            >
              Hoàn Thành
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default NFTCard;
