import React from 'react';
import { motion } from 'framer-motion';
import styles from './FloatingWalletWidget.module.css';
import { WalletBalance } from './WalletBalance';
import { formatUnits } from 'viem';

interface WalletBubbleProps {
  balance: bigint;
  hasPending: boolean;
  onClick: () => void;
  isOpen: boolean;
}

export const WalletBubble: React.FC<WalletBubbleProps> = React.memo(({ balance, hasPending, onClick, isOpen }) => {
  const numericValue = parseFloat(formatUnits(balance, 18));
  // Nếu số dư vượt quá 999,999 ADF thì hiển thị "..."
  const isTooLarge = numericValue > 999999;

  return (
    <motion.div
      drag
      dragElastic={0.1}
      dragMomentum={false}
      dragTransition={{ power: 0.1, timeConstant: 200 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        onClick();
      }}
      className={styles.bubble}
      style={{ touchAction: 'none' }}
    >
      <div className={styles.bubbleContent}>
        <div className={styles.bubbleIcon}>
          {isOpen ? (
            <span className="material-symbols-outlined text-gold">close</span>
          ) : (
            <img src="/ADF_logo.png" alt="ADF Logo" className={styles.bubbleLogoImg} draggable="false" />
          )}
        </div>
        {!isOpen && (
          <div className={styles.bubbleBalance}>
            {isTooLarge ? '...' : <WalletBalance value={balance} decimals={0} suffix=" ADF" />}
          </div>
        )}
      </div>

      {hasPending && <div className={styles.notificationDot} />}
    </motion.div>
  );
});

WalletBubble.displayName = 'WalletBubble';
export default WalletBubble;
