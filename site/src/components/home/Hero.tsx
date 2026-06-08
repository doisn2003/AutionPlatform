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

  // Convert IPFS URL to HTTP gateway
  const resolveIPFS = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    return url;
  };

  // Pick featured auction: active auction with highest current bid
  const featured = auctions?.reduce<AuctionFromAPI | null>((best, auction) => {
    if (!best) return auction;
    const bestBid = BigInt(best.current_top_bid || '0');
    const thisBid = BigInt(auction.current_top_bid || '0');
    return thisBid > bestBid ? auction : best;
  }, null) || null;

  // Pick trending: active auction (excluding featured) with highest hot_score
  const trending = auctions
    ?.filter((a) => a !== featured)
    ?.reduce<AuctionFromAPI | null>((best, auction) => {
      if (!best) return auction;
      const bestScore = Number(best.hot_score || 0);
      const thisScore = Number(auction.hot_score || 0);
      return thisScore > bestScore ? auction : best;
    }, null) || null;

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

  const featuredImage = featured && featured.image
    ? resolveIPFS(featured.image)
    : `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80`;

  const trendingImage = trending && trending.image
    ? resolveIPFS(trending.image)
    : `https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80`;

  return (
    <section className={styles.heroSection}>
      
      {/* Hero Left: Featured auction */}
      {featured ? (
        <div className={`gold-border ${styles.heroLeft}`}>
          <div className={styles.heroBadge}>
            <span className="material-symbols-outlined pulse-live">schedule</span>
            <span>Đang Diễn Ra</span>
          </div>
          
          <div className={styles.heroContent}>
            <h1 className={`text-gradient ${styles.heroTitle}`}>
              {featured.name || `Phiên Đấu Giá #${featured.auction_id}`}
            </h1>
            <p className={styles.heroDesc}>
              {featured.description || `Vật phẩm NFT #${featured.nft_token_id} đang được đấu giá trên blockchain. Kết nối ví và đặt giá thầu ngay!`}
            </p>
            
            <div className={styles.heroInfoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{BigInt(featured.current_top_bid || '0') > 0n ? 'Giá hiện tại' : 'Giá khởi điểm'}</span>
                <span className={`text-gold ${styles.infoValue}`}>{featuredPrice} ADF</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Thời gian còn lại</span>
                <span className={styles.countdown}>{featuredTime}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Người bán</span>
                <span className={`text-gradient font-headline ${styles.infoValue}`} style={{ fontWeight: 600 }}>
                  {featuredSeller}
                </span>
              </div>
            </div>

            <div className={styles.heroActions}>
              {isConnected ? (
                <button className="btn btn-gradient" onClick={() => setSelectedAuction(featured)}>Đấu giá ngay</button>
              ) : (
                <button className="btn btn-gradient" disabled>
                  Kết nối ví để đấu giá
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
      ) : (
        <div className={`gold-border ${styles.heroLeft}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '48px' }}>
          <div className={styles.heroBadge}>
            <span className="material-symbols-outlined pulse-live" style={{ color: 'var(--color-primary)' }}>schedule</span>
            <span>Chưa Có Đấu Giá</span>
          </div>
          <div style={{ maxWidth: '500px', zIndex: 3 }}>
            <span className="material-symbols-outlined floating" style={{ fontSize: '4.5rem', color: 'var(--color-primary)', marginBottom: '20px' }}>diamond</span>
            <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '16px', fontWeight: 200 }}>Không có phiên đấu giá nào đang diễn ra!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 300, marginBottom: '28px', lineHeight: 1.6 }}>
              Sàn giao dịch hiện tại chưa có vật phẩm nào được niêm yết đấu giá. Hãy truy cập trang **Đúc vật phẩm** để tạo phiên đấu giá đầu tiên của bạn!
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <a href="/mint" className="btn btn-gradient">Đúc NFT & Bán</a>
              <a href="/guide" className="btn btn-outline">Hướng Dẫn</a>
            </div>
          </div>
          <div 
            className={styles.heroBgOverlay} 
            style={{ backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 11, 0.98), rgba(10, 10, 11, 0.9))` }}
          ></div>
        </div>
      )}

      {/* Hero Right: Trending auction */}
      <div>
        <div className={`glass-panel blue-border glow-blue ${styles.trendingCard}`} style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <div className={styles.trendingBadge}>
            <span className="material-symbols-outlined pulse-live">trending_up</span>
            <span>Xu Hướng {trending && `(🔥 ${Number(trending.hot_score || 0).toFixed(1)})`}</span>
          </div>
          {trending ? (
            <>
              <div className={styles.trendingImgContainer}>
                <img src={trendingImage} alt="Trending NFT" className={styles.trendingImg} />
              </div>
              <div className={styles.trendingContent}>
                <div className={styles.creatorInfo}>
                  <span>Người bán: <strong>{trendingSeller}</strong></span>
                </div>
                <h3 className={styles.trendingTitle}>
                  {trending.name || `Phiên #${trending.auction_id} • NFT #${trending.nft_token_id}`}
                </h3>
                <div className={styles.bidInfo}>
                  <div>
                    <span className={styles.infoLabel}>
                      {BigInt(trending.current_top_bid || '0') > 0n ? 'Giá cao nhất' : 'Giá khởi điểm'}
                    </span>
                    <div className={styles.bidValue}>{trendingPrice} ADF</div>
                  </div>
                  <div className="text-right">
                    <span className={styles.infoLabel}>Kết thúc sau</span>
                    <div className={`text-blue ${styles.timer}`}>{trendingTime}</div>
                  </div>
                </div>
                {isConnected ? (
                  <button className="btn btn-primary w-full" onClick={() => setSelectedAuction(trending)}>Đấu giá ngay</button>
                ) : (
                  <button className="btn btn-primary w-full" disabled>
                    Kết nối ví
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', gap: '16px' }}>
              <span className="material-symbols-outlined pulse-live" style={{ fontSize: '3.5rem', color: 'var(--color-secondary-container)', opacity: 0.8 }}>local_fire_department</span>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Chưa có phiên đấu giá nào được lên xu hướng!
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 300, lineHeight: 1.4 }}>
                  Hãy đặt giá cho các phiên đấu giá đang diễn ra để đẩy chúng lên bảng xếp hạng xu hướng.
                </p>
              </div>
            </div>
          )}
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
