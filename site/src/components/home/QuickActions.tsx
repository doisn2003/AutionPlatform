/**
 * QuickActions — Panel thao tác nhanh (Faucet, Balance, Withdraw)
 * Chỉ hiển thị khi ví đã kết nối
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { useFaucet, useWithdraw } from '../../hooks/useContractActions';
import { useADFBalance, usePendingReturns } from '../../hooks/useReadContract';
import styles from './QuickActions.module.css';

const QuickActions: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useADFBalance(address);
  const { data: pending, refetch: refetchPending } = usePendingReturns(address);
  const { faucet, isPending: isFauceting, isConfirming: isFaucetConfirming, isConfirmed: isFaucetConfirmed } = useFaucet();
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming } = useWithdraw();

  if (!isConnected) return null;

  const formattedBalance = balance !== undefined ? parseFloat(formatUnits(balance, 18)).toFixed(2) : '...';
  const formattedPending = pending !== undefined ? parseFloat(formatUnits(pending, 18)).toFixed(2) : '...';
  const hasPending = pending !== undefined && pending > 0n;

  // Refetch sau khi faucet thành công
  React.useEffect(() => {
    if (isFaucetConfirmed) {
      refetchBalance();
    }
  }, [isFaucetConfirmed, refetchBalance]);

  return (
    <section className={styles.quickActions}>
      {/* Số dư ADF */}
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.cardIcon}>
          <span className="material-symbols-outlined text-gold">account_balance</span>
        </div>
        <div className={styles.cardContent}>
          <span className={styles.cardLabel}>Số dư ADF</span>
          <span className={`text-gold font-mono ${styles.cardValue}`}>{formattedBalance}</span>
        </div>
      </div>

      {/* Faucet */}
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.cardIcon}>
          <span className="material-symbols-outlined text-blue">water_drop</span>
        </div>
        <div className={styles.cardContent}>
          <span className={styles.cardLabel}>Faucet miễn phí</span>
          <button
            className="btn btn-gradient btn-sm"
            onClick={() => faucet()}
            disabled={isFauceting || isFaucetConfirming}
          >
            {isFauceting ? 'Đang gửi...' : isFaucetConfirming ? 'Đang xác nhận...' : '+ 10 ADF'}
          </button>
        </div>
      </div>

      {/* Tiền chờ rút */}
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.cardIcon}>
          <span className="material-symbols-outlined" style={{ color: hasPending ? '#10b981' : 'var(--text-muted)' }}>
            savings
          </span>
        </div>
        <div className={styles.cardContent}>
          <span className={styles.cardLabel}>Tiền chờ rút</span>
          <div className={styles.pendingRow}>
            <span className={`font-mono ${styles.cardValue}`} style={{ color: hasPending ? '#10b981' : 'var(--text-muted)' }}>
              {formattedPending} ADF
            </span>
            {hasPending && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => withdraw()}
                disabled={isWithdrawing || isWithdrawConfirming}
              >
                {isWithdrawing ? 'Đang gửi...' : isWithdrawConfirming ? 'Xác nhận...' : 'Rút'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickActions;
