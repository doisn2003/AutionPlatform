/**
 * BidModal — Modal đặt giá thầu cho một phiên đấu giá
 * 
 * Flow:
 * 1. Hiển thị thông tin phiên (giá hiện tại, bước nhảy, thời gian)
 * 2. Input nhập số ADF
 * 3. Kiểm tra allowance → approve nếu cần → bid
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useBid, useApproveADF } from '../../hooks/useContractActions';
import { useADFBalance, useADFAllowance } from '../../hooks/useReadContract';
import { type AuctionFromAPI } from '../../hooks/useAuctions';
import { formatTimeLeft } from '../../utils/formatters';
import styles from './BidModal.module.css';

interface BidModalProps {
  auction: AuctionFromAPI;
  onClose: () => void;
}

const BidModal: React.FC<BidModalProps> = ({ auction, onClose }) => {
  const { address } = useAccount();
  const { data: balance } = useADFBalance(address);
  const { data: allowance, refetch: refetchAllowance } = useADFAllowance(address);
  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isConfirmed: isApproveConfirmed } = useApproveADF();
  const { bid, isPending: isBidding, isConfirming: isBidConfirming, isConfirmed: isBidConfirmed, error: bidError } = useBid();

  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(new Date(auction.end_time).getTime()));
  const [step, setStep] = useState<'input' | 'approving' | 'bidding' | 'success' | 'error'>('input');

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(new Date(auction.end_time).getTime()));
    }, 1000);
    return () => clearInterval(interval);
  }, [auction.end_time]);

  // After approve confirmed, send bid
  useEffect(() => {
    if (isApproveConfirmed && step === 'approving') {
      refetchAllowance();
      setStep('bidding');
      const amountWei = parseUnits(bidAmount, 18);
      bid(BigInt(auction.auction_id), amountWei);
    }
  }, [isApproveConfirmed, step]);

  // Bid confirmed
  useEffect(() => {
    if (isBidConfirmed) {
      setStep('success');
    }
  }, [isBidConfirmed]);

  // Bid error
  useEffect(() => {
    if (bidError) {
      setStep('error');
    }
  }, [bidError]);

  const currentBid = parseFloat(formatUnits(BigInt(auction.current_top_bid || '0'), 18));
  const reservePrice = parseFloat(formatUnits(BigInt(auction.reserve_price), 18));
  const minIncrement = parseFloat(formatUnits(BigInt(auction.min_bid_increment), 18));
  const minimumBid = currentBid > 0 ? currentBid + minIncrement : reservePrice;
  const userBalance = balance !== undefined ? parseFloat(formatUnits(balance, 18)) : 0;

  const inputAmount = parseFloat(bidAmount) || 0;
  const isValidAmount = inputAmount >= minimumBid;
  const hasEnoughBalance = inputAmount <= userBalance;

  const handleSubmit = () => {
    if (!isValidAmount || !hasEnoughBalance) return;

    const amountWei = parseUnits(bidAmount, 18);

    // Kiểm tra allowance
    if (allowance !== undefined && allowance < amountWei) {
      setStep('approving');
      approve();
    } else {
      setStep('bidding');
      bid(BigInt(auction.auction_id), amountWei);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`glass-panel gold-border ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Đấu Giá</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Auction Info */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Phiên #</span>
            <span className={`font-mono ${styles.infoValue}`}>{auction.auction_id}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Giá hiện tại</span>
            <span className={`text-gold font-mono ${styles.infoValue}`}>
              {currentBid > 0 ? `${currentBid} ADF` : 'Chưa có bid'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Bước nhảy tối thiểu</span>
            <span className={`font-mono ${styles.infoValue}`}>{minIncrement} ADF</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Thời gian còn lại</span>
            <span className={`text-blue font-mono ${styles.infoValue}`}>{timeLeft}</span>
          </div>
        </div>

        {/* Input or Status */}
        {step === 'input' && (
          <>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Số ADF muốn đặt (tối thiểu: {minimumBid.toFixed(2)} ADF)
              </label>
              <div className={styles.inputRow}>
                <input
                  type="number"
                  className={styles.input}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={minimumBid.toFixed(2)}
                  min={minimumBid}
                  step="0.1"
                  autoFocus
                />
                <button
                  className={styles.maxBtn}
                  onClick={() => setBidAmount(minimumBid.toFixed(2))}
                >
                  MIN
                </button>
              </div>
              <div className={styles.inputHelp}>
                <span>Số dư: <strong className="text-gold">{userBalance.toFixed(2)} ADF</strong></span>
                {bidAmount && !isValidAmount && (
                  <span className={styles.errorText}>Phải ≥ {minimumBid.toFixed(2)} ADF</span>
                )}
                {bidAmount && !hasEnoughBalance && (
                  <span className={styles.errorText}>Không đủ số dư</span>
                )}
              </div>
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={handleSubmit}
              disabled={!isValidAmount || !hasEnoughBalance}
            >
              Đặt giá {bidAmount ? `${bidAmount} ADF` : ''}
            </button>
          </>
        )}

        {step === 'approving' && (
          <div className={styles.statusBlock}>
            <div className={styles.spinner}></div>
            <p>{isApproving ? 'Đang gửi lệnh Approve...' : isApproveConfirming ? 'Đang xác nhận Approve...' : 'Approve...'}</p>
            <span className={styles.statusHint}>Cho phép sàn sử dụng ADF của bạn (chỉ cần 1 lần)</span>
          </div>
        )}

        {step === 'bidding' && (
          <div className={styles.statusBlock}>
            <div className={styles.spinner}></div>
            <p>{isBidding ? 'Đang gửi lệnh Bid...' : isBidConfirming ? 'Đang xác nhận trên blockchain...' : 'Đang xử lý...'}</p>
          </div>
        )}

        {step === 'success' && (
          <div className={styles.statusBlock}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#10b981' }}>check_circle</span>
            <p style={{ color: '#10b981', fontWeight: 600 }}>Đặt giá thành công!</p>
            <span className={styles.statusHint}>Bạn đang là người trả giá cao nhất.</span>
            <button className="btn btn-outline" onClick={onClose} style={{ marginTop: '16px' }}>Đóng</button>
          </div>
        )}

        {step === 'error' && (
          <div className={styles.statusBlock}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444' }}>error</span>
            <p style={{ color: '#ef4444', fontWeight: 600 }}>Giao dịch thất bại</p>
            <span className={styles.statusHint}>{bidError?.message || 'Đã xảy ra lỗi'}</span>
            <button className="btn btn-outline" onClick={() => setStep('input')} style={{ marginTop: '16px' }}>Thử lại</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidModal;
