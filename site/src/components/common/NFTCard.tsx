/**
 * NFTCard — Card hiển thị thông tin phiên đấu giá
 * 
 * Nhận dữ liệu từ server API (AuctionFromAPI) thay vì mock data.
 * Tự tính trạng thái (active/ended) từ end_time và active flag.
 */

import React, { useEffect, useState } from 'react';
import styles from './NFTCard.module.css';
import { type AuctionFromAPI } from '../../hooks/useAuctions';
import { formatTimeLeftShort } from '../../utils/formatters';
import { formatUnits } from 'viem';

// Placeholder images mapped by NFT token ID
const PLACEHOLDER_IMAGES: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1644024276223-4411136b672e?w=500&auto=format&fit=crop&q=80',
  2: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&auto=format&fit=crop&q=80',
  3: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
  4: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=80',
  5: 'https://images.unsplash.com/photo-1617791160505-6f006e121980?w=500&auto=format&fit=crop&q=80',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80';

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
  
  const resolveIPFS = (url?: string) => {
    if (!url) return DEFAULT_IMAGE;
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    return url;
  };

  const image = auction.image ? resolveIPFS(auction.image) : (PLACEHOLDER_IMAGES[auction.nft_token_id] || DEFAULT_IMAGE);
  const sellerShort = `${auction.seller.slice(0, 6)}...${auction.seller.slice(-4)}`;

  // Status logic
  let statusClass = '';
  let statusText = '';
  let glowClass = '';

  if (isEnded) {
    statusClass = styles.statusEnded;
    statusText = 'Đã kết thúc';
    glowClass = '';
  } else if (isExpired) {
    statusClass = styles.statusExpiring;
    statusText = 'Đang chờ kết thúc';
    glowClass = '';
  } else {
    statusClass = styles.statusActive;
    statusText = 'Đang diễn ra';
    glowClass = 'glow-blue';
  }

  return (
    <div className={`glass-panel ${styles.nftCard} ${glowClass} ${isEnded ? styles.endedOpacity : ''}`}>
      <div className={`${styles.cardStatus} ${statusClass}`}>{statusText}</div>
      <div className={`${styles.cardImgContainer} ${isEnded ? styles.endedImg : ''}`}>
        <img src={image} alt={auction.name || `NFT #${auction.nft_token_id}`} className={styles.cardImg} />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle} style={{ color: isEnded ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {auction.name || `Vật phẩm #${auction.nft_token_id}`}
        </h3>
        <div className={styles.cardCreator}>
          Phiên #{auction.auction_id} • Người bán: {sellerShort}
        </div>
        <div className={styles.cardBidRow}>
          <div>
            <span className={styles.cardLabel}>
              {isEnded ? 'Giá bán' : hasBids ? 'Giá hiện tại' : 'Giá khởi điểm'}
            </span>
            <span className={`${styles.cardValue} ${isEnded ? 'text-muted' : 'text-gold'}`}>
              {hasBids ? currentBid.toFixed(2) : reservePrice.toFixed(2)} ADF
            </span>
          </div>
          <div className="text-right">
            <span className={styles.cardLabel}>
              {isEnded ? 'Người thắng' : 'Thời gian còn lại'}
            </span>
            <span className={`${styles.cardValue} ${!isEnded ? 'text-blue' : ''} font-mono`}>
              {isEnded
                ? (auction.current_top_bidder
                  ? `${auction.current_top_bidder.slice(0, 6)}...`
                  : 'Không có')
                : timeLeft}
            </span>
          </div>
        </div>
        
        {!isEnded && !isExpired && (
          <button 
            className="btn btn-primary btn-sm w-full" 
            onClick={onBid}
            disabled={!onBid}
          >
            {onBid ? 'Đấu Giá' : 'Kết nối ví để đấu giá'}
          </button>
        )}
        {isExpired && !isEnded && (
          <button className="btn btn-outline btn-sm w-full" disabled>
            Đang chờ kết thúc...
          </button>
        )}
        {isEnded && (
          <button className="btn btn-disabled btn-sm w-full" disabled>Hoàn Thành</button>
        )}
      </div>
    </div>
  );
};

export default NFTCard;
