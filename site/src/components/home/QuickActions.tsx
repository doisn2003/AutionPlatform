/**
 * QuickActions — Tích hợp Floating Wallet Widget thay vì panel tĩnh.
 * Chỉ hiển thị khi ví đã kết nối.
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { useFaucet, useWithdraw } from '../../hooks/useContractActions';
import { useADFBalance, usePendingReturns } from '../../hooks/useReadContract';
import FloatingWalletWidget from '../layout/FloatingWalletWidget/FloatingWalletWidget';

const QuickActions: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useADFBalance(address);
  const { data: pending, refetch: refetchPending } = usePendingReturns(address);
  const { faucet, isPending: isFauceting, isConfirming: isFaucetConfirming, isConfirmed: isFaucetConfirmed } = useFaucet();
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming } = useWithdraw();

  // Refetch sau khi faucet thành công
  React.useEffect(() => {
    if (isFaucetConfirmed) {
      refetchBalance();
    }
  }, [isFaucetConfirmed, refetchBalance]);

  if (!isConnected) return null;

  return (
    <FloatingWalletWidget
      balance={balance !== undefined ? balance : 0n}
      pendingReturns={pending !== undefined ? pending : 0n}
      onWithdraw={() => withdraw()}
      isWithdrawing={isWithdrawing}
      isWithdrawConfirming={isWithdrawConfirming}
      onDeposit={() => faucet()}
      isDepositing={isFauceting || isFaucetConfirming}
    />
  );
};

export default QuickActions;
