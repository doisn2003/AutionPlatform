import React, { useEffect, useState } from 'react';
import styles from './Hero.module.css';
import { heroFeaturedMock, heroTrendingMock } from '../../utils/mockData';
import { formatTimeLeft, formatTimeLeftShort } from '../../utils/formatters';

const Hero: React.FC = () => {
  const [featuredTime, setFeaturedTime] = useState(() => formatTimeLeft(heroFeaturedMock.endTime));
  const [trendingTime, setTrendingTime] = useState(() => formatTimeLeftShort(heroTrendingMock.endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedTime(formatTimeLeft(heroFeaturedMock.endTime));
      setTrendingTime(formatTimeLeftShort(heroTrendingMock.endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className={styles.heroSection}>
      
      {/* Hero Left: Featured upcoming lot */}
      <div className={`gold-border ${styles.heroLeft}`}>
        <div className={styles.heroBadge}>
          <span className="material-symbols-outlined pulse-live">schedule</span>
          <span>Sắp Diễn Ra</span>
        </div>
        
        <div className={styles.heroContent}>
          <h1 className={`text-gradient ${styles.heroTitle}`}>{heroFeaturedMock.title}</h1>
          <p className={styles.heroDesc}>{heroFeaturedMock.description}</p>
          
          <div className={styles.heroInfoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Giá khởi điểm</span>
              <span className={`text-gold ${styles.infoValue}`}>{heroFeaturedMock.startPrice} ADF</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thời gian bắt đầu</span>
              <span className={styles.countdown}>{featuredTime}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Người sáng lập</span>
              <span className={`text-gradient font-headline ${styles.infoValue}`} style={{ fontWeight: 600 }}>
                {heroFeaturedMock.creator.username}
              </span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <button className="btn btn-gradient">Đặt thông báo</button>
            <button className="btn btn-outline">Chi tiết bộ sưu tập</button>
          </div>
        </div>
        
        <div 
          className={styles.heroBgOverlay} 
          style={{ backgroundImage: `linear-gradient(to right, rgba(10, 10, 11, 0.95) 45%, rgba(10, 10, 11, 0.3)), url('${heroFeaturedMock.image}')` }}
        ></div>
      </div>

      {/* Hero Right: Trending lot */}
      <div>
        <div className={`glass-panel blue-border glow-blue ${styles.trendingCard}`}>
          <div className={styles.trendingBadge}>
            <span className="material-symbols-outlined pulse-live">trending_up</span>
            <span>Xu Hướng</span>
          </div>
          <div className={styles.trendingImgContainer}>
            <img src={heroTrendingMock.image} alt="Trending NFT" className={styles.trendingImg} />
          </div>
          <div className={styles.trendingContent}>
            <div className={styles.creatorInfo}>
              <img src={heroTrendingMock.creator.avatar} alt="Creator" className={styles.creatorAvatar} />
              <span>Đúc bởi <strong>{heroTrendingMock.creator.username}</strong></span>
            </div>
            <h3 className={styles.trendingTitle}>{heroTrendingMock.title}</h3>
            <div className={styles.bidInfo}>
              <div>
                <span className={styles.infoLabel}>Giá cao nhất</span>
                <div className={styles.bidValue}>{heroTrendingMock.currentPrice} ADF</div>
              </div>
              <div className="text-right">
                <span className={styles.infoLabel}>Kết thúc sau</span>
                <div className={`text-blue ${styles.timer}`}>{trendingTime}</div>
              </div>
            </div>
            <button className="btn btn-primary w-full">Đấu giá ngay</button>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
