import React, { useEffect, useState } from 'react';
import styles from './NFTCard.module.css';
import { type NFTItem } from '../../utils/mockData';
import { formatTimeLeftShort } from '../../utils/formatters';

interface NFTCardProps {
  item: NFTItem;
}

const NFTCard: React.FC<NFTCardProps> = ({ item }) => {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeftShort(item.endTime));

  useEffect(() => {
    if (item.status === 'ended') return;

    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeftShort(item.endTime));
    }, 60000); // update every minute for short format

    return () => clearInterval(interval);
  }, [item.endTime, item.status]);

  let statusClass = '';
  let statusText = '';
  let glowClass = '';

  switch (item.status) {
    case 'active':
      statusClass = styles.statusActive;
      statusText = 'Đang diễn ra';
      glowClass = 'glow-blue';
      break;
    case 'upcoming':
      statusClass = styles.statusUpcoming;
      statusText = 'Sắp diễn ra';
      glowClass = 'glow-gold';
      break;
    case 'ended':
      statusClass = styles.statusEnded;
      statusText = 'Đã kết thúc';
      glowClass = '';
      break;
  }

  const isEnded = item.status === 'ended';

  return (
    <div className={`glass-panel ${styles.nftCard} ${glowClass} ${isEnded ? styles.endedOpacity : ''}`}>
      <div className={`${styles.cardStatus} ${statusClass}`}>{statusText}</div>
      <div className={`${styles.cardImgContainer} ${isEnded ? styles.endedImg : ''}`}>
        <img src={item.image} alt={item.title} className={styles.cardImg} />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle} style={{ color: isEnded ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {item.title}
        </h3>
        <div className={styles.cardCreator}>Người đúc: {item.creator.username}</div>
        <div className={styles.cardBidRow}>
          <div>
            <span className={styles.cardLabel}>
              {item.status === 'upcoming' ? 'Giá khởi điểm' : (item.status === 'ended' ? 'Giá bán' : 'Giá hiện tại')}
            </span>
            <span className={`${styles.cardValue} ${isEnded ? 'text-muted' : 'text-gold'}`}>
              {item.status === 'upcoming' ? item.startPrice : item.currentPrice} ADF
            </span>
          </div>
          <div className="text-right">
            <span className={styles.cardLabel}>
              {item.status === 'upcoming' ? 'Bắt đầu sau' : (item.status === 'ended' ? 'Chủ sở hữu' : 'Thời gian còn lại')}
            </span>
            <span className={`${styles.cardValue} ${item.status === 'active' ? 'text-blue' : ''} font-mono`} style={{ color: item.status === 'upcoming' ? '#a855f7' : '' }}>
              {isEnded ? item.owner?.username : timeLeft}
            </span>
          </div>
        </div>
        
        {item.status === 'active' && (
          <button className="btn btn-primary btn-sm w-full">Đấu Giá</button>
        )}
        {item.status === 'upcoming' && (
          <button className="btn btn-outline btn-sm w-full">Xem chi tiết</button>
        )}
        {item.status === 'ended' && (
          <button className="btn btn-disabled btn-sm w-full" disabled>Hoàn Thành</button>
        )}
      </div>
    </div>
  );
};

export default NFTCard;
