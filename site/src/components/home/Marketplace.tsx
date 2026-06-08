import React, { useState } from 'react';
import styles from './Marketplace.module.css';
import NFTCard from '../common/NFTCard';
import { mockNFTs, type NFTItem } from '../../utils/mockData';

type FilterType = 'all' | 'active' | 'upcoming' | 'ended';

const Marketplace: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNFTs = mockNFTs.filter((item: NFTItem) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

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
            className={`${styles.filterTab} ${filter === 'upcoming' ? styles.active : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Sắp diễn ra
          </button>
          <button 
            className={`${styles.filterTab} ${filter === 'ended' ? styles.active : ''}`}
            onClick={() => setFilter('ended')}
          >
            Đã kết thúc
          </button>
        </div>
      </div>

      {/* NFT Grid */}
      <div className={styles.nftGrid}>
        {filteredNFTs.map((nft) => (
          <NFTCard key={nft.id} item={nft} />
        ))}
      </div>
    </section>
  );
};

export default Marketplace;
