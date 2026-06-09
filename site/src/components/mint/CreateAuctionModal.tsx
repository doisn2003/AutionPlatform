import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { useApproveNFT, useCreateAuction } from '../../hooks/useContractActions';
import { useNFTApproved } from '../../hooks/useReadContract';
import { CONTRACT_ADDRESSES } from '../../config/contracts';
import styles from './CreateAuctionModal.module.css';
import { useNFTImage } from '../../hooks/useNFTImage';

interface CreateAuctionModalProps {
  nft: {
    token_id: number;
    name: string;
    image: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAuctionModal: React.FC<CreateAuctionModalProps> = ({ nft, onClose, onSuccess }) => {
  const { isConnected } = useAccount();
  const { data: approvedAddress, refetch: refetchApproval } = useNFTApproved(BigInt(nft.token_id));
  const { imageUrl } = useNFTImage(nft.token_id, nft.image);

  const {
    approveNFT,
    isPending: isApproving,
    isConfirming: isApproveConfirming,
    isConfirmed: isApproveConfirmed,
    error: approveError,
  } = useApproveNFT();

  const {
    createAuction,
    isPending: isCreating,
    isConfirming: isCreateConfirming,
    isConfirmed: isCreateConfirmed,
    error: createError,
  } = useCreateAuction();

  // Form states
  const [reservePrice, setReservePrice] = useState('10');
  const [minBidIncrement, setMinBidIncrement] = useState('1');
  const [duration, setDuration] = useState('5');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Flow step state: 'form' | 'approving' | 'creating' | 'success' | 'error'
  const [step, setStep] = useState<'form' | 'approving' | 'creating' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  // Check if token is already approved for AuctionExchange
  const isApproved =
    approvedAddress?.toLowerCase() === CONTRACT_ADDRESSES.AuctionExchange.toLowerCase();

  // Automatic transition after approval is confirmed
  useEffect(() => {
    if (isApproveConfirmed && step === 'approving') {
      refetchApproval().then(() => {
        // Proceed to create auction automatically
        setStep('creating');
        const durationSeconds = getDurationInSeconds();
        createAuction(
          BigInt(nft.token_id),
          durationSeconds,
          parseUnits(reservePrice, 18),
          parseUnits(minBidIncrement, 18)
        );
      });
    }
  }, [isApproveConfirmed, step]);

  // Transition to success state
  useEffect(() => {
    if (isCreateConfirmed) {
      setStep('success');
      // Trigger success callback after 1.5 seconds to auto-close or allow manual close
      const timer = setTimeout(() => {
        onSuccess();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCreateConfirmed]);

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setStep('error');
      setErrorMessage(approveError.message || 'Lỗi xảy ra trong quá trình Approve NFT.');
    }
  }, [approveError]);

  useEffect(() => {
    if (createError) {
      setStep('error');
      setErrorMessage(createError.message || 'Lỗi xảy ra trong quá trình Tạo đấu giá.');
    }
  }, [createError]);

  const getDurationInSeconds = (): bigint => {
    const val = BigInt(parseInt(duration) || 5);
    if (durationUnit === 'minutes') return val * 60n;
    if (durationUnit === 'hours') return val * 3600n;
    return val * 86400n;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert('Vui lòng kết nối ví trước.');
      return;
    }

    const durationSeconds = getDurationInSeconds();
    const reservePriceWei = parseUnits(reservePrice, 18);
    const minBidIncrementWei = parseUnits(minBidIncrement, 18);

    if (durationSeconds <= 0n) {
      alert('Thời gian đấu giá phải lớn hơn 0.');
      return;
    }
    if (reservePriceWei <= 0n) {
      alert('Giá khởi điểm phải lớn hơn 0.');
      return;
    }

    if (!isApproved) {
      setStep('approving');
      approveNFT(BigInt(nft.token_id));
    } else {
      setStep('creating');
      createAuction(BigInt(nft.token_id), durationSeconds, reservePriceWei, minBidIncrementWei);
    }
  };

  const applyPreset = (dur: string, unit: 'minutes' | 'hours' | 'days') => {
    setDuration(dur);
    setDurationUnit(unit);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`glass-panel gold-border ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Tạo Phiên Đấu Giá</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* NFT Details */}
        <div className={styles.nftOverview}>
          {imageUrl ? (
            <img src={imageUrl} alt={nft.name} className={styles.nftThumb} />
          ) : (
            <div className={styles.placeholderThumb}>
              <span className="material-symbols-outlined">image_not_supported</span>
              <span>Không có ảnh</span>
            </div>
          )}
          <div className={styles.nftMeta}>
            <span className={styles.nftName}>{nft.name || `Vật phẩm #${nft.token_id}`}</span>
            <span className={styles.nftId}>Token ID: {nft.token_id}</span>
          </div>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Giá đấu khởi điểm <span className="text-gold">*</span></label>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={styles.input}
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  required
                />
                <span className={styles.inputSuffix}>ADF</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Bước giá tối thiểu <span className="text-gold">*</span></label>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={styles.input}
                  value={minBidIncrement}
                  onChange={(e) => setMinBidIncrement(e.target.value)}
                  required
                />
                <span className={styles.inputSuffix}>ADF</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Thời lượng đấu giá <span className="text-gold">*</span></label>
              <div className={styles.durationRow}>
                <input
                  type="number"
                  min="1"
                  className={styles.input}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <select
                  className={styles.durationSelect}
                  value={durationUnit}
                  onChange={(e: any) => setDurationUnit(e.target.value)}
                >
                  <option value="minutes">Phút</option>
                  <option value="hours">Giờ</option>
                  <option value="days">Ngày</option>
                </select>
              </div>

              {/* Presets */}
              <div className={styles.presetContainer}>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('5', 'minutes')}>5 phút (Test)</button>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('1', 'hours')}>1 giờ</button>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('1', 'days')}>1 ngày</button>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('3', 'days')}>3 ngày</button>
              </div>
            </div>

            {/* Display Steps info if not approved */}
            <div className={styles.stepContainer}>
              <div className={`${styles.stepRow} ${!isApproved ? styles.stepActive : styles.stepCompleted}`}>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTitle}>Bước 1: Chấp thuận (Approve) NFT</span>
                  <span className={styles.stepDesc}>Ủy quyền cho hợp đồng sàn đấu giá giữ vật phẩm</span>
                </div>
                {isApproved ? (
                  <span className="material-symbols-outlined text-gold">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>pending</span>
                )}
              </div>

              <div className={`${styles.stepRow} ${isApproved ? styles.stepActive : ''}`}>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTitle}>Bước 2: Khởi tạo đấu giá</span>
                  <span className={styles.stepDesc}>Gửi giao dịch niêm yết đấu giá chính thức lên Blockchain</span>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>lock</span>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-gradient w-full" style={{ padding: '14px' }}>
                {!isApproved ? 'Chấp thuận & Tạo đấu giá' : 'Bắt đầu đấu giá'}
              </button>
            </div>
          </form>
        )}

        {step === 'approving' && (
          <div className={styles.statusBlock}>
            <div className={styles.spinner}></div>
            <p style={{ fontWeight: 600 }}>
              {isApproving
                ? 'Đang gửi lệnh Approve...'
                : isApproveConfirming
                ? 'Đang xác nhận lệnh Approve...'
                : 'Đang chuẩn bị...'}
            </p>
            <span className={styles.statusHint}>
              Vui lòng duyệt trên ví Metamask để sàn có quyền giữ NFT của bạn.
            </span>
          </div>
        )}

        {step === 'creating' && (
          <div className={styles.statusBlock}>
            <div className={styles.spinner}></div>
            <p style={{ fontWeight: 600 }}>
              {isCreating
                ? 'Đang gửi lệnh Tạo đấu giá...'
                : isCreateConfirming
                ? 'Đang xác nhận giao dịch trên blockchain...'
                : 'Đang gửi...'}
            </p>
            <span className={styles.statusHint}>
              Đang thực hiện giao dịch khởi tạo phiên đấu giá chính thức.
            </span>
          </div>
        )}

        {step === 'success' && (
          <div className={styles.statusBlock}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#10b981' }}>check_circle</span>
            <p style={{ color: '#10b981', fontWeight: 600 }}>Tạo đấu giá thành công!</p>
            <span className={styles.statusHint}>
              Vật phẩm của bạn đã được niêm yết. Trang sẽ tự động làm mới...
            </span>
            <button className="btn btn-outline" onClick={onSuccess} style={{ marginTop: '16px' }}>Đóng</button>
          </div>
        )}

        {step === 'error' && (
          <div className={styles.statusBlock}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444' }}>error</span>
            <p style={{ color: '#ef4444', fontWeight: 600 }}>Giao dịch thất bại</p>
            <span className={styles.statusHint}>{errorMessage}</span>
            <button className="btn btn-outline" onClick={() => setStep('form')} style={{ marginTop: '16px' }}>Thử lại</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAuctionModal;
