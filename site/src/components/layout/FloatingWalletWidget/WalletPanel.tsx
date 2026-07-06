import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from './FloatingWalletWidget.module.css';
import { WalletBalance } from './WalletBalance';
import type { FloatingWalletWidgetProps } from './types';

interface WalletPanelProps extends FloatingWalletWidgetProps {
  onClose: () => void;
}

export const WalletPanel: React.FC<WalletPanelProps> = React.memo(({
  balance,
  pendingReturns,
  onWithdraw,
  isWithdrawing,
  isWithdrawConfirming,
  onDeposit,
  isDepositing = false,
  onClose
}) => {
  const navigate = useNavigate();
  const hasPending = pendingReturns > 0n;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={styles.panel}
    >
      {/* Panel Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className="material-symbols-outlined text-gold">account_balance_wallet</span>
          <span>Ví ADF Của Bạn</span>
        </div>
        <button className={styles.closeButton} onClick={onClose} aria-label="Đóng ví">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Balances Section */}
      <div className={styles.balancesSection}>
        {/* ADF Balance Card */}
        <div className={`${styles.balanceCard} ${styles.balanceCardGold}`}>
          <div className={styles.balanceIcon}>
            <span className="material-symbols-outlined text-gold">diamond</span>
          </div>
          <div>
            <span className={styles.balanceLabel}>Số dư ADF</span>
            <div className={styles.balanceValue}>
              <WalletBalance value={balance} suffix=" ADF" />
            </div>
          </div>
        </div>

        {/* Pending Returns Card */}
        <div className={`${styles.balanceCard} ${styles.balanceCardGreen}`}>
          <div className={styles.balanceIcon}>
            <span className="material-symbols-outlined" style={{ color: hasPending ? 'var(--status-active)' : 'var(--text-muted)' }}>
              savings
            </span>
          </div>
          <div className={styles.withdrawActionRow}>
            <div>
              <span className={styles.balanceLabel}>Tiền chờ rút</span>
              <div className={styles.balanceValue}>
                <WalletBalance value={pendingReturns} suffix=" ADF" />
              </div>
            </div>
            {hasPending && (
              <button
                className="btn btn-primary btn-sm"
                onClick={onWithdraw}
                disabled={isWithdrawing || isWithdrawConfirming}
              >
                {isWithdrawing ? 'Đang gửi...' : isWithdrawConfirming ? 'Xác nhận...' : 'Rút'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className={styles.actionsGrid}>
        <button
          className={`${styles.actionButton} ${!onDeposit || isDepositing ? styles.actionButtonDisabled : ''}`}
          onClick={onDeposit}
          disabled={!onDeposit || isDepositing}
        >
          <span className="material-symbols-outlined">download</span>
          <span>{isDepositing ? 'Đang nạp...' : 'Nạp (Faucet)'}</span>
        </button>

        <button
          className={`${styles.actionButton} ${!hasPending || isWithdrawing ? styles.actionButtonDisabled : ''}`}
          onClick={onWithdraw}
          disabled={!hasPending || isWithdrawing}
        >
          <span className="material-symbols-outlined">upload</span>
          <span>Rút tiền</span>
        </button>

        <button 
          className={styles.actionButton}
          onClick={() => {
            navigate('/transaction');
            onClose();
          }}
        >
          <span className="material-symbols-outlined">send</span>
          <span>Chuyển khoản</span>
        </button>

        <button 
          className={styles.actionButton}
          onClick={() => {
            navigate('/transaction');
            onClose();
          }}
        >
          <span className="material-symbols-outlined">history</span>
          <span>Lịch sử</span>
        </button>
      </div>
    </motion.div>
  );
});

WalletPanel.displayName = 'WalletPanel';
