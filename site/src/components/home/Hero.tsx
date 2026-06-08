/**
 * Hero — Banner chính trang chủ
 * 
 * Hiển thị featured auction (phiên có giá cao nhất đang active) từ server.
 * Fallback về mock data nếu chưa có phiên nào.
 */

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import styles from './Hero.module.css';
import { useAuctions, type AuctionFromAPI } from '../../hooks/useAuctions';
import { formatTimeLeft, formatTimeLeftShort } from '../../utils/formatters';
import BidModal from './BidModal';

const Hero: React.FC = () => {
  const { data: auctions } = useAuctions('active');
  const { isConnected } = useAccount();
  const [selectedAuction, setSelectedAuction] = useState<AuctionFromAPI | null>(null);

  // Pick featured auction: active auction with highest current bid
  const featured = auctions?.reduce<AuctionFromAPI | null>((best, auction) => {
    if (!best) return auction;
    const bestBid = BigInt(best.current_top_bid || '0');
    const thisBid = BigInt(auction.current_top_bid || '0');
    return thisBid > bestBid ? auction : best;
  }, null) || null;

  // Pick trending: active auction with second highest bid (or first if only one)
  const trending = auctions?.find((a) => a !== featured) || null;

  const [featuredTime, setFeaturedTime] = useState('--:--:--');
  const [trendingTime, setTrendingTime] = useState('--h --m');

  useEffect(() => {
    const update = () => {
      if (featured) setFeaturedTime(formatTimeLeft(new Date(featured.end_time).getTime()));
      if (trending) setTrendingTime(formatTimeLeftShort(new Date(trending.end_time).getTime()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [featured, trending]);

  const featuredPrice = featured
    ? parseFloat(formatUnits(BigInt(featured.current_top_bid || featured.reserve_price), 18)).toFixed(2)
    : '0.00';
  const featuredSeller = featured
    ? `${featured.seller.slice(0, 6)}...${featured.seller.slice(-4)}`
    : '--';

  const trendingPrice = trending
    ? parseFloat(formatUnits(BigInt(trending.current_top_bid || trending.reserve_price), 18)).toFixed(2)
    : '0.00';
  const trendingSeller = trending
    ? `${trending.seller.slice(0, 6)}...${trending.seller.slice(-4)}`
    : '--';

  // Placeholder images
  const featuredImage = featured
    ? `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80`
    : `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80`;

  const trendingImage = trending
    ? `https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80`
    : `https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80`;

  return (
    <section className={styles.heroSection}>
      
      {/* Hero Left: Featured auction */}
      <div className={`gold-border ${styles.heroLeft}`}>
        <div className={styles.heroBadge}>
          <span className="material-symbols-outlined pulse-live">schedule</span>
          <span>{featured ? 'Đang Diễn Ra' : 'Sắp Diễn Ra'}</span>
        </div>
        
        <div className={styles.heroContent}>
          <h1 className={`text-gradient ${styles.heroTitle}`}>
            {featured ? `Phiên Đấu Giá #${featured.auction_id}` : 'Sàn Đấu Giá NFT'}
          </h1>
          <p className={styles.heroDesc}>
            {featured
              ? `Vật phẩm NFT #${featured.nft_token_id} đang được đấu giá trên blockchain. Kết nối ví và đặt giá thầu ngay!`
              : 'Nền tảng đấu giá vật phẩm NFT phi tập trung. Kết nối ví Metamask để bắt đầu.'}
          </p>
          
          <div className={styles.heroInfoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{featured && BigInt(featured.current_top_bid || '0') > 0n ? 'Giá hiện tại' : 'Giá khởi điểm'}</span>
              <span className={`text-gold ${styles.infoValue}`}>{featuredPrice} ADF</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thời gian còn lại</span>
              <span className={styles.countdown}>{featured ? featuredTime : '--:--:--'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Người bán</span>
              <span className={`text-gradient font-headline ${styles.infoValue}`} style={{ fontWeight: 600 }}>
                {featuredSeller}
              </span>
            </div>
          </div>

          <div className={styles.heroActions}>
            {featured && isConnected ? (
              <button className="btn btn-gradient" onClick={() => setSelectedAuction(featured)}>Đấu giá ngay</button>
            ) : (
              <button className="btn btn-gradient" disabled={!featured}>
                {featured ? 'Kết nối ví để đấu giá' : 'Chưa có phiên đấu giá'}
              </button>
            )}
            <button className="btn btn-outline">Chi tiết</button>
          </div>
        </div>
        
        <div 
          className={styles.heroBgOverlay} 
          style={{ backgroundImage: `linear-gradient(to right, rgba(10, 10, 11, 0.95) 45%, rgba(10, 10, 11, 0.3)), url('${featuredImage}')` }}
        ></div>
      </div>

      {/* Hero Right: Trending auction */}
      <div>
        <div className={`glass-panel blue-border glow-blue ${styles.trendingCard}`}>
          <div className={styles.trendingBadge}>
            <span className="material-symbols-outlined pulse-live">trending_up</span>
            <span>Xu Hướng</span>
          </div>
          <div className={styles.trendingImgContainer}>
            <img src={trendingImage} alt="Trending NFT" className={styles.trendingImg} />
          </div>
          <div className={styles.trendingContent}>
            <div className={styles.creatorInfo}>
              <span>Người bán: <strong>{trendingSeller}</strong></span>
            </div>
            <h3 className={styles.trendingTitle}>
              {trending ? `Phiên #${trending.auction_id} • NFT #${trending.nft_token_id}` : 'Đang chờ dữ liệu...'}
            </h3>
            <div className={styles.bidInfo}>
              <div>
                <span className={styles.infoLabel}>
                  {trending && BigInt(trending.current_top_bid || '0') > 0n ? 'Giá cao nhất' : 'Giá khởi điểm'}
                </span>
                <div className={styles.bidValue}>{trendingPrice} ADF</div>
              </div>
              <div className="text-right">
                <span className={styles.infoLabel}>Kết thúc sau</span>
                <div className={`text-blue ${styles.timer}`}>{trending ? trendingTime : '--h --m'}</div>
              </div>
            </div>
            {trending && isConnected ? (
              <button className="btn btn-primary w-full" onClick={() => setSelectedAuction(trending)}>Đấu giá ngay</button>
            ) : (
              <button className="btn btn-primary w-full" disabled={!trending}>
                {trending ? 'Kết nối ví' : 'Đang tải...'}
              </button>
            )}
          </div>
        </div>
      </div>

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

export default Hero;
