/**
 * Mint Page — Trang đúc NFT và Bộ sưu tập người sở hữu
 * 
 * Bố cục 7:3 chia bento mượt mà, theme sang trọng Obsidian Premium V2.
 * Nút bấm tông màu vàng hoàng gia (#f2ca50).
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import * as LucideIcons from 'lucide-react';
import { uploadToIPFS } from '../services/ipfsApi';
import { useMintNFT, useBurnNFT, useFaucet, useWithdraw } from '../hooks/useContractActions';
import { useADFBalance, usePendingReturns } from '../hooks/useReadContract';
import FloatingWalletWidget from '../components/layout/FloatingWalletWidget/FloatingWalletWidget';
import { useNFTImage } from '../hooks/useNFTImage';
import Layout from '../components/layout/Layout';
import CreateAuctionModal from '../components/mint/CreateAuctionModal';
import NFTDetailPreview, { type NFT } from '../components/common/NFTDetailPreview';
import styles from '../components/mint/Mint.module.css';
import { API_URL } from '../config/contracts';

const API_BASE_URL = `${API_URL}/api`;

// Sub-component for individual NFT Card in the list (to isolate useNFTImage hook)
interface CollectionCardProps {
  nft: NFT;
  isActive: boolean;
  onSelect: () => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ nft, isActive, onSelect }) => {
  const { imageUrl } = useNFTImage(nft.token_id, nft.image);

  return (
    <div 
      className={`${styles.nftCardItem} ${isActive ? styles.nftCardItemActive : ''}`}
      onClick={onSelect}
    >
      <div className={styles.nftCardImageContainer}>
        {imageUrl ? (
          <img src={imageUrl} alt={nft.name} className={styles.nftCardImage} />
        ) : (
          <div className="placeholder-image-small" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.02)',
            color: 'var(--text-muted)',
            fontSize: '0.65rem'
          }}>
            Không có ảnh
          </div>
        )}
      </div>
      <div className={styles.nftCardInfo}>
        <h4 className={styles.nftCardName}>{nft.name || `Vật phẩm #${nft.token_id}`}</h4>
        <span className={styles.nftCardTokenId}>ID: {nft.token_id}</span>
      </div>
    </div>
  );
};

const Mint: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { mint, isPending: isMinting, isConfirmed: isMintConfirmed } = useMintNFT();
  
  const { burn, isPending: isBurning, isConfirmed: isBurnConfirmed, error: burnError } = useBurnNFT();

  // Floating Wallet Hooks
  const { data: balance, refetch: refetchBalance } = useADFBalance(address);
  const { data: pendingReturns, refetch: refetchPendingReturns } = usePendingReturns(address);
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

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);

  // Burn Modal state
  const [isBurnModalOpen, setIsBurnModalOpen] = useState(false);
  const [burnTokenId, setBurnTokenId] = useState('');
  const [burnConfirmText, setBurnConfirmText] = useState('');
  const [burnTxError, setBurnTxError] = useState<string | null>(null);

  // Mint Form State
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<{ trait_type: string; value: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auction Modal state
  const [isCreateAuctionOpen, setIsCreateAuctionOpen] = useState(false);

  // Fetch Collection
  useEffect(() => {
    if (address) {
      fetchCollection();
    } else {
      setNfts([]);
      setSelectedNFT(null);
    }
  }, [address, refreshKey]);

  const fetchCollection = async () => {
    setLoadingCollection(true);
    try {
      const response = await fetch(`${API_BASE_URL}/nfts?owner=${address}`);
      const data = await response.json();
      if (data.success) {
        setNfts(data.data);
        // Default to select first NFT if none selected
        if (data.data.length > 0 && !selectedNFT) {
          setSelectedNFT(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch collection', error);
    }
    setLoadingCollection(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      
      const newUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const updateAttribute = (index: number, key: 'trait_type' | 'value', val: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][key] = val;
    setAttributes(newAttrs);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !isConnected || !name) {
      alert("Vui lòng kết nối ví, tải ảnh lên và điền đầy đủ thông tin.");
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadToIPFS(files, { name, description, attributes });
      
      if (res.tokenURI) {
        mint(res.tokenURI);
      }
    } catch (error: any) {
      console.error(error);
      alert('Upload IPFS thất bại: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (isMintConfirmed) {
      alert('✨ Đúc vật phẩm thành công! Đang đồng bộ bộ sưu tập...');
      setFiles([]);
      setPreviewUrls([]);
      setName('');
      setDescription('');
      setAttributes([]);
      
      setRefreshKey(prev => prev + 1);
      
      let count = 0;
      const interval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
        count++;
        if (count >= 5) clearInterval(interval); 
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isMintConfirmed]);

  // Khi đốt NFT thành công, đóng modal và làm mới danh sách
  useEffect(() => {
    if (isBurnConfirmed) {
      setIsBurnModalOpen(false);
      setBurnTokenId('');
      setBurnConfirmText('');
      setBurnTxError(null);
      setSelectedNFT(null);
      setRefreshKey(prev => prev + 1);
    }
  }, [isBurnConfirmed]);

  useEffect(() => {
    if (burnError) {
      setBurnTxError(burnError.message?.split('\n')[0] || 'Giao dịch thất bại.');
    }
  }, [burnError]);

  const handleBurnSubmit = () => {
    const id = parseInt(burnTokenId, 10);
    if (isNaN(id) || id <= 0) {
      setBurnTxError('Vui lòng nhập NFT ID hợp lệ.');
      return;
    }
    if (burnConfirmText !== 'confirm') {
      setBurnTxError('Vui lòng gõ chữ "confirm" để xác nhận.');
      return;
    }
    setBurnTxError(null);
    burn(BigInt(id));
  };

  return (
    <Layout>
      <div className={styles.mintPageContainer}>
        {/* Title Header */}
        <div className={styles.pageTitleSection}>
          <h1 className={`text-gradient ${styles.pageTitle}`}>Bộ sưu tập Tài Sản Số</h1>
          <p className={styles.pageSubtitle}>Quản lý bộ sưu tập vật phẩm của bạn và phát hành các phiên đấu giá lên blockchain.</p>
        </div>

        {/* 1. Middle Section: Bento collection and Preview detail (7:3 Split) */}
        <div className={styles.middleSection}>
          {/* Left: NFT Collection list (70%) */}
          <div className={`glass-panel ${styles.collectionPanel}`}>
            <div className={styles.collectionHeader}>
              <h2 className={styles.collectionTitle}>Bộ Sưu Tập Của Bạn</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Button + : Cuộn xuống phần đúc NFT */}
                <button
                  type="button"
                  title="Đúc NFT mới"
                  onClick={() => document.getElementById('mint-section')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{
                    width: 34, height: 34, borderRadius: '8px',
                    border: '1px solid rgba(242, 202, 80, 0.35)',
                    background: 'rgba(242, 202, 80, 0.07)',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', fontWeight: 700,
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242,202,80,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(242,202,80,0.07)')}
                >
                  +
                </button>

                {/* Button Burn : Mở modal đốt NFT */}
                <button
                  type="button"
                  title="Đốt (hủy) một NFT"
                  onClick={() => { setIsBurnModalOpen(true); setBurnTxError(null); }}
                  style={{
                    width: 34, height: 34, borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.07)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
                >
                  {/* Fire icon (Flame SVG) */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c0 0-4 3-4 8 0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.1-.4-2.1-1-2.9 0 0 .5 2-.5 3C14 9.6 13 9 12 9c-1.1 0-2 .9-2 2 0 1.1.9 2 2 2s2-.9 2-2c-.1.3-1.5 3.9-4.5 5.5C8.2 17.5 7 19.1 7 21h10c0-2.6-2-4.6-4-6 .8-.6 1.5-1.4 2-2.3.3.7.5 1.5.5 2.3 0 3.3-2.7 6-6 6S3 18.3 3 15c0-6 5-9.6 9-13z"/>
                  </svg>
                </button>

                <span className={styles.collectionCount}>{nfts.length} Vật phẩm</span>
              </div>
            </div>

            {loadingCollection ? (
              <div className="flex-center" style={{ flexGrow: 1, color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined spinner" style={{ marginRight: '8px' }}>autorenew</span>
                Đang tải bộ sưu tập từ blockchain...
              </div>
            ) : nfts.length === 0 ? (
              <div className="flex-center" style={{ flexGrow: 1, flexDirection: 'column', gap: '12px', color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>inventory_2</span>
                <span>Bạn chưa sở hữu NFT nào trong ví. Hãy kéo xuống dưới để đúc!</span>
              </div>
            ) : (
              <div className={styles.collectionGrid}>
                {nfts.map((nft) => (
                  <CollectionCard 
                    key={nft.token_id} 
                    nft={nft} 
                    isActive={selectedNFT?.token_id === nft.token_id}
                    onSelect={() => setSelectedNFT(nft)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: NFT Detailed review panel (30%) */}
          <div className={`glass-panel ${styles.nftReviewPanel}`}>
            {selectedNFT ? (
              <NFTDetailPreview nft={selectedNFT}>
                <button 
                  className={`w-full ${styles.goldButton}`}
                  onClick={() => setIsCreateAuctionOpen(true)}
                >
                  Tạo phiên đấu giá
                </button>
              </NFTDetailPreview>
            ) : (
              <div className={styles.reviewPlaceholder}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', opacity: 0.5 }}>visibility</span>
                <span>Vui lòng chọn một NFT bên trái để xem chi tiết thông tin</span>
              </div>
            )}
          </div>
        </div>

        {/* Burn NFT Modal */}
        {isBurnModalOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setIsBurnModalOpen(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-surface-raised, #1a1a2e)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '16px',
                padding: '32px',
                width: '100%',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.6rem' }}>🔥</span>
                <div>
                  <h3 style={{ margin: 0, color: '#ef4444', fontFamily: 'Anybody', fontWeight: 500 }}>Đốt NFT</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hành động này không thể hoàn tác.</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">NFT Token ID</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="Nhập ID của NFT cần đốt..."
                  value={burnTokenId}
                  onChange={e => setBurnTokenId(e.target.value)}
                  disabled={isBurning}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Gõ chữ <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 700 }}>confirm</span> để xác nhận
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder='confirm'
                  value={burnConfirmText}
                  onChange={e => setBurnConfirmText(e.target.value)}
                  disabled={isBurning}
                  style={{ borderColor: burnConfirmText === 'confirm' ? 'rgba(239,68,68,0.5)' : undefined }}
                />
              </div>

              {burnTxError && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '10px 14px' }}>
                  ⚠️ {burnTxError}
                </p>
              )}

              {isBurnConfirmed && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#10b981' }}>✅ NFT đã được đốt thành công!</p>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsBurnModalOpen(false)}
                  disabled={isBurning}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleBurnSubmit}
                  disabled={isBurning || burnConfirmText !== 'confirm'}
                  style={{
                    padding: '10px 24px', borderRadius: '8px',
                    border: 'none',
                    background: burnConfirmText === 'confirm' ? '#ef4444' : 'rgba(239,68,68,0.3)',
                    color: 'white', cursor: isBurning ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  {isBurning ? '🔥 Đang đốt...' : '🔥 Đốt NFT'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Bottom Section: Mint new NFT (7:3 Split) */}
        <div id="mint-section" className={`glass-panel ${styles.formSection}`} style={{ marginTop: '40px' }}>
          <div style={{ marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
            <h2 className={styles.collectionTitle}>Đúc Vật Phẩm Mới</h2>
            <p className={styles.pageSubtitle}>Đóng gói thông tin và số hóa tài sản của bạn thành NFT an toàn.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.bottomSection}>
              {/* Left Column: Metadata input fields (70%) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Tên vật phẩm <span className="text-gold">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ví dụ: Đồng hồ Omega Seamaster 1960" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả chi tiết</label>
                  <textarea 
                    rows={4} 
                    className="form-textarea" 
                    placeholder="Mô tả chất liệu, tính năng đặc biệt, góc cạnh nổi bật hoặc nguồn gốc xuất xứ của vật phẩm..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Thuộc tính đặc tả (Properties)</label>
                    <button 
                      type="button" 
                      className="btn btn-outline btn-sm" 
                      onClick={addAttribute}
                      style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      + Thêm thuộc tính
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {attributes.map((attr, index) => (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} key={index}>
                        <input 
                          type="text" 
                          placeholder="Loại thuộc tính (VD: Màu sắc)" 
                          className="form-input" 
                          value={attr.trait_type} 
                          onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)} 
                          required 
                          style={{ flex: 1 }} 
                        />
                        <input 
                          type="text" 
                          placeholder="Giá trị (VD: Vàng hồng)" 
                          className="form-input" 
                          value={attr.value} 
                          onChange={(e) => updateAttribute(index, 'value', e.target.value)} 
                          required 
                          style={{ flex: 1 }} 
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline btn-sm" 
                          onClick={() => removeAttribute(index)} 
                          style={{ border: 'none', color: 'var(--text-muted)', padding: '6px', borderRadius: '50%' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <button 
                    type="submit" 
                    className={`w-full ${styles.goldButton}`} 
                    disabled={isUploading || isMinting || !isConnected}
                  >
                    {isUploading ? 'Đang upload tệp lên IPFS...' : isMinting ? 'Đang ký giao dịch đúc NFT...' : 'Xác nhận Đúc NFT'}
                  </button>
                </div>
              </div>

              {/* Right Column: Multi-images Upload Zone (30%) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                <label className="form-label">Hình ảnh vật phẩm <span className="text-gold">*</span></label>
                
                <div className={styles.uploadDropzone} onClick={() => document.getElementById('fileInput')?.click()}>
                  <input 
                    type="file" 
                    id="fileInput" 
                    accept="image/*" 
                    multiple 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                  />
                  <span className={`material-symbols-outlined ${styles.uploadIcon}`}>cloud_upload</span>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Chọn hình ảnh</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Hỗ trợ nhiều ảnh PNG, JPG.</div>
                </div>

                {previewUrls.length > 0 && (
                  <div className={styles.uploadPreviewGrid}>
                    {previewUrls.map((url, index) => (
                      <div 
                        key={index} 
                        className={styles.uploadPreviewItem} 
                        onClick={(e) => { e.stopPropagation(); setEnlargedImage(url); }}
                      >
                        <img src={url} alt={`Preview ${index}`} className={styles.uploadPreviewImg} />
                        <button 
                          type="button" 
                          className={styles.removePreviewBtn}
                          onClick={(e) => removeFile(e, index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Modal for enlarged image */}
        {enlargedImage && (
          <div 
            className="image-modal" 
            onClick={() => setEnlargedImage(null)} 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(10,10,11,0.92)', 
              zIndex: 10000, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '40px',
              backdropFilter: 'blur(10px)'
            }}
          >
             <img src={enlargedImage} alt="Enlarged" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} onClick={(e) => e.stopPropagation()} />
             <button type="button" onClick={() => setEnlargedImage(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {/* Create Auction Modal (Sticky logic) */}
        {selectedNFT && isCreateAuctionOpen && (
          <CreateAuctionModal
            nft={selectedNFT}
            onClose={() => setIsCreateAuctionOpen(false)}
            onSuccess={() => {
              setIsCreateAuctionOpen(false);
              setRefreshKey(prev => prev + 1);
            }}
          />
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

export default Mint;
