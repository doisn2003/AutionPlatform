import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import CreateAuctionModal from './CreateAuctionModal';

interface NFT {
  token_id: number;
  owner: string;
  name: string;
  image: string;
  token_uri: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api';

interface CollectionGridProps {
  refreshKey?: number;
}

const CollectionGrid: React.FC<CollectionGridProps> = ({ refreshKey = 0 }) => {
  const { address } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);

  useEffect(() => {
    if (address) {
      fetchCollection();
    }
  }, [address, refreshKey]);

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/nfts?owner=${address}`);
      const data = await response.json();
      if (data.success) {
        setNfts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch collection', error);
    }
    setLoading(false);
  };

  // Convert IPFS URL to HTTP gateway
  const resolveIPFS = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&auto=format&fit=crop&q=80';
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    return url;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 200 }} className="text-gradient">Bộ Sưu Tập Của Bạn</h2>
          <span className="font-mono text-gold" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{nfts.length} Vật phẩm</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 300, marginBottom: '24px', lineHeight: 1.5 }}>
          Quản lý và giám sát các tác phẩm nghệ thuật kỹ thuật số do chính bạn sở hữu hoặc đã niêm yết đấu giá.
        </p>

        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} id="collectionGrid">
            {nfts.map((nft) => (
              <div className="collection-item" key={nft.token_id}>
                <img src={resolveIPFS(nft.image)} alt={nft.name} className="collection-thumb" />
                <div className="collection-info" style={{ flex: 1 }}>
                  <h4 className="collection-name">{nft.name || `Vật phẩm #${nft.token_id}`}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Token ID: <strong className="font-mono">{nft.token_id}</strong></span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setSelectedNFT(nft)}
                    >
                      Tạo Đấu Giá
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {nfts.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có vật phẩm nào. Hãy đúc ngay!</p>
            )}
          </div>
        )}
      </div>

      {selectedNFT && (
        <CreateAuctionModal
          nft={selectedNFT}
          onClose={() => setSelectedNFT(null)}
          onSuccess={() => {
            setSelectedNFT(null);
            fetchCollection();
          }}
        />
      )}
    </div>
  );
};

export default CollectionGrid;
