import React from 'react';
import { AnimatePresence } from 'framer-motion';
import styles from './FloatingWalletWidget.module.css';
import type { FloatingWalletWidgetProps } from './types';
import { useFloatingWallet } from './useFloatingWallet';
import { WalletBubble } from './WalletBubble';
import { WalletPanel } from './WalletPanel';

export const FloatingWalletWidget: React.FC<FloatingWalletWidgetProps> = ({
  balance,
  pendingReturns,
  onWithdraw,
  isWithdrawing,
  isWithdrawConfirming,
  onDeposit,
  isDepositing
}) => {
  const { isOpen, toggleOpen, closeWallet } = useFloatingWallet();
  const hasPending = pendingReturns > 0n;

  return (
    <div className={styles.widgetContainer}>
      <AnimatePresence>
        {isOpen && (
          <WalletPanel
            balance={balance}
            pendingReturns={pendingReturns}
            onWithdraw={onWithdraw}
            isWithdrawing={isWithdrawing}
            isWithdrawConfirming={isWithdrawConfirming}
            onDeposit={onDeposit}
            isDepositing={isDepositing}
            onClose={closeWallet}
          />
        )}
      </AnimatePresence>

      <WalletBubble
        balance={balance}
        hasPending={hasPending}
        onClick={toggleOpen}
        isOpen={isOpen}
      />
    </div>
  );
};

export default FloatingWalletWidget;
