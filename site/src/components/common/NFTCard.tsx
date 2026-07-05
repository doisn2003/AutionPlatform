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
import { useNFTImage } from '../../hooks/useNFTImage';

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
        {imageUrl ? (
          <img src={imageUrl} alt={auction.name || `NFT #${auction.nft_token_id}`} className={styles.cardImg} />
        ) : (
          <div className={styles.placeholderImage}>
            <span className="material-symbols-outlined">image_not_supported</span>
            <span>Không có ảnh</span>
          </div>
        )}
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
