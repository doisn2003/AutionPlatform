import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import Layout from '../components/layout/Layout';
import GameTheoryEscrow from '../components/dispute/GameTheoryEscrow';
import JuryVotingEscrow from '../components/dispute/JuryVotingEscrow';
import { API_URL } from '../config/contracts';
import { resolveIPFS } from '../hooks/useNFTImage';
import { type AuctionFromAPI } from '../hooks/useAuctions';
import { useADFBalance, usePendingReturns } from '../hooks/useReadContract';
import { useFaucet, useWithdraw } from '../hooks/useContractActions';
import FloatingWalletWidget from '../components/layout/FloatingWalletWidget/FloatingWalletWidget';
import styles from './Dispute.module.css';
import { 
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

const Dispute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, address: userAddress } = useAccount();

  // Floating Wallet Hooks
  const { data: balance, refetch: refetchBalance } = useADFBalance(userAddress);
  const { data: pendingReturns, refetch: refetchPendingReturns } = usePendingReturns(userAddress);
  const { faucet, isPending: isFauceting, isConfirming: isFaucetConfirming, isConfirmed: isFaucetConfirmed } = useFaucet();
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming, isConfirmed: isWithdrawConfirmed } = useWithdraw();

  useEffect(() => {
    if (isFaucetConfirmed) {
      refetchBalance();
    }
  }, [isFaucetConfirmed, refetchBalance]);

  useEffect(() => {
    if (isWithdrawConfirmed) {
      refetchBalance();
      refetchPendingReturns();
    }
  }, [isWithdrawConfirmed, refetchBalance, refetchPendingReturns]);

  // Dashboard List States
  const [userAuctions, setUserAuctions] = useState<AuctionFromAPI[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Selected Detail States
  const [selectedAuction, setSelectedAuction] = useState<AuctionFromAPI | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch list of user auctions
  useEffect(() => {
    if (!isConnected || !userAddress) {
      setListLoading(false);
      return;
    }

    setListLoading(true);
    fetch(`${API_URL}/api/auctions/user/${userAddress}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setUserAuctions(data.data);
        }
        setListLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch user auctions:", err);
        setListLoading(false);
      });
  }, [isConnected, userAddress, id]);

  // Scroll to top on ID change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch selected auction details
  useEffect(() => {
    if (!id) {
      setSelectedAuction(null);
      return;
    }

    setDetailLoading(true);
    fetch(`${API_URL}/api/auctions/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setSelectedAuction(data.data);
        }
        setDetailLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch selected auction:", err);
        setDetailLoading(false);
      });
  }, [id, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Group auctions for Dashboard
  const gameTheoryAuctions = userAuctions.filter(
    a => Number(a.dispute_type) === 1 || a.dispute_type === 'GAME_THEORY_ESCROW'
  );
  
  const juryVotingAuctions = userAuctions.filter(
    a => Number(a.dispute_type) === 2 || a.dispute_type === 'JURY_VOTING'
  );

  return (
    <Layout>
      <div className={styles.container}>
        
        {!isConnected ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444' }}>lock</span>
            <h3>Kết nối ví để xem thông tin bàn giao & tranh chấp</h3>
            <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Bạn cần kết nối ví Web3 để truy cập danh sách các phòng bàn giao tài sản.</p>
          </div>
        ) : (
          <>
            {/* CASE 1: DASHBOARD VIEW (NO ID PARAM) */}
            {!id ? (
              <div>
                <div className={styles.dashboardHeader}>
                  <h1 className={styles.dashboardTitle}>Quản lý Bàn giao & Tranh chấp</h1>
                  <p className={styles.dashboardDescription}>
                    Danh sách các phiên đấu giá vật lý bạn đã tham gia cần bàn giao và ký quỹ. 
                    Nhấp vào một phiên để chuyển đến phòng đàm phán 1-1 chuyên biệt.
                  </p>
                </div>

                {listLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
                    <div className={styles.spinner}></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Đang tải danh sách phiên đấu giá...</p>
                  </div>
                ) : (
                  <div className={styles.zonesContainer}>
                    
                    {/* ZONE 1: GAME THEORY ESCROW */}
                    <div className={`glass-panel ${styles.zone}`}>
                      <div className={styles.zoneHeader}>
                        <h2 className={`${styles.zoneTitle} ${styles.zoneTitleGold}`}>
                          1. Ký quỹ Lý thuyết trò chơi
                        </h2>
                        <p className={styles.zoneDescription}>
                          Cơ chế thỏa thuận và phạt cọc tự động. Bên bán đã cọc cấn trừ bằng giá khởi điểm.
                        </p>
                      </div>

                      {gameTheoryAuctions.length === 0 ? (
                        <div className={styles.emptyZone}>
                          Không có phiên đấu giá lý thuyết trò chơi nào.
                        </div>
                      ) : (
                        <div className={styles.cardsGrid}>
                          {gameTheoryAuctions.map(item => {
                            const isSeller = item.seller.toLowerCase() === userAddress.toLowerCase();
                            const isJuror = item.is_juror;
                            const topBid = parseFloat(formatUnits(BigInt(item.current_top_bid || '0'), 18));
                            const startPrice = parseFloat(formatUnits(BigInt(item.reserve_price), 18));
                            
                            return (
                              <div
                                key={item.auction_id}
                                className={styles.auctionCard}
                                onClick={() => navigate(`/dispute/${item.auction_id}`)}
                              >
                                <img 
                                  src={item.image ? resolveIPFS(item.image) : "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=100"} 
                                  alt={item.name}
                                  className={styles.cardThumb}
                                />
                                <div className={styles.cardContent}>
                                  <h4 className={styles.cardTitle}>{item.name || `NFT #${item.nft_token_id}`}</h4>
                                  <div className={styles.cardMeta}>
                                    <span className={`${styles.roleBadge} ${isJuror ? styles.roleJuror : (isSeller ? styles.roleSeller : styles.roleWinner)}`}>
                                      {isJuror ? 'Juror' : (isSeller ? 'Bán' : 'Mua')}
                                    </span>
                                    <span className={styles.cardBid}>
                                      {(topBid > 0 ? topBid : startPrice).toFixed(2)} ADF
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ZONE 2: JURY VOTING */}
                    <div className={`glass-panel ${styles.zone}`}>
                      <div className={styles.zoneHeader}>
                        <h2 className={`${styles.zoneTitle} ${styles.zoneTitleBlue}`}>
                          2. Trọng tài Bồi thẩm đoàn
                        </h2>
                        <p className={styles.zoneDescription}>
                          Tranh chấp được giải quyết thông qua bỏ phiếu từ các Trọng tài độc lập trên tòa án ADF.
                        </p>
                      </div>

                      {juryVotingAuctions.length === 0 ? (
                        <div className={styles.emptyZone}>
                          Không có phiên đấu giá bồi thẩm đoàn nào.
                        </div>
                      ) : (
                        <div className={styles.cardsGrid}>
                          {juryVotingAuctions.map(item => {
                            const isSeller = item.seller.toLowerCase() === userAddress.toLowerCase();
                            const isJuror = item.is_juror;
                            const topBid = parseFloat(formatUnits(BigInt(item.current_top_bid || '0'), 18));
                            const startPrice = parseFloat(formatUnits(BigInt(item.reserve_price), 18));
                            
                            return (
                              <div
                                key={item.auction_id}
                                className={styles.auctionCard}
                                onClick={() => navigate(`/dispute/${item.auction_id}`)}
                              >
                                <img 
                                  src={item.image ? resolveIPFS(item.image) : "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=100"} 
                                  alt={item.name}
                                  className={styles.cardThumb}
                                />
                                <div className={styles.cardContent}>
                                  <h4 className={styles.cardTitle}>{item.name || `NFT #${item.nft_token_id}`}</h4>
                                  <div className={styles.cardMeta}>
                                    <span className={`${styles.roleBadge} ${isJuror ? styles.roleJuror : (isSeller ? styles.roleSeller : styles.roleWinner)}`}>
                                      {isJuror ? 'Juror' : (isSeller ? 'Bán' : 'Mua')}
                                    </span>
                                    <span className={styles.cardBid}>
                                      {(topBid > 0 ? topBid : startPrice).toFixed(2)} ADF
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            ) : (
              
              /* CASE 2: DETAILED VIEW (ID PARAM PROVIDED) */
              <div className={styles.viewport}>
                
                {/* Back Button */}
                <Link to="/dispute" className={styles.backButton}>
                  <ArrowLeft size={16} />
                  <span>Quay lại danh sách bàn giao</span>
                </Link>

                {detailLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0', gap: '16px' }}>
                    <div className={styles.spinner}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Đang tải thông tin chi tiết phòng bàn giao...</p>
                  </div>
                ) : !selectedAuction ? (
                  <div className={`glass-panel ${styles.emptyViewport}`} style={{ color: '#ef4444' }}>
                    <AlertTriangle size={48} />
                    <h3>Không tìm thấy dữ liệu phiên đấu giá</h3>
                  </div>
                ) : (
                  <>
                    {/* DETAIL HEADER */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={styles.phaseBadge}>Pha Bàn Giao Ký Quỹ</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>| Phiên đấu giá #{selectedAuction.auction_id}</span>
                      </div>
                      <div className={styles.detailHeader}>
                        <h1 className={styles.detailTitle}>
                          {selectedAuction.name || `Tác phẩm #${selectedAuction.nft_token_id}`}
                        </h1>
                      </div>
                    </div>

                    {/* DYNAMIC COMPONENT MOUNTING */}
                    {Number(selectedAuction.dispute_type) === 1 || selectedAuction.dispute_type === 'GAME_THEORY_ESCROW' ? (
                      <GameTheoryEscrow auction={selectedAuction} userAddress={userAddress || ''} onRefresh={handleRefresh} />
                    ) : (
                      <JuryVotingEscrow auction={selectedAuction} userAddress={userAddress || ''} onRefresh={handleRefresh} />
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

      </div>
      {isConnected && (
        <FloatingWalletWidget
          balance={balance !== undefined ? balance : 0n}
          pendingReturns={pendingReturns !== undefined ? pendingReturns : 0n}
          onWithdraw={() => withdraw()}
          isWithdrawing={isWithdrawing}
          isWithdrawConfirming={isWithdrawConfirming}
          onDeposit={() => faucet()}
          isDepositing={isFauceting || isFaucetConfirming}
        />
      )}
    </Layout>
  );
};

export default Dispute;
