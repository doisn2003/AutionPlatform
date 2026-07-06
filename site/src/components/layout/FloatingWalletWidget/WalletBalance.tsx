import React, { useEffect, useRef } from 'react';
import { animate, useMotionValue } from 'framer-motion';
import { formatUnits } from 'viem';

interface WalletBalanceProps {
  value: bigint;
  decimals?: number;
  suffix?: string;
}

export const WalletBalance: React.FC<WalletBalanceProps> = React.memo(({ value, decimals = 2, suffix = '' }) => {
  const numericValue = parseFloat(formatUnits(value, 18));
  const count = useMotionValue(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Initial value configuration
    if (count.get() === 0) {
      count.set(numericValue);
      if (spanRef.current) {
        spanRef.current.textContent = numericValue.toFixed(decimals) + suffix;
      }
      return;
    }

    const controls = animate(count, numericValue, {
      duration: 0.35,
      ease: 'easeOut',
      onUpdate: (latest) => {
        if (spanRef.current) {
          spanRef.current.textContent = latest.toFixed(decimals) + suffix;
        }
      }
    });
    return () => controls.stop();
  }, [numericValue, decimals, suffix, count]);

  return <span ref={spanRef} className="font-mono" />;
});

WalletBalance.displayName = 'WalletBalance';
