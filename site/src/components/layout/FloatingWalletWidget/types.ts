export interface FloatingWalletWidgetProps {
  balance: bigint;
  pendingReturns: bigint;
  onWithdraw: () => void;
  isWithdrawing: boolean;
  isWithdrawConfirming: boolean;
  onDeposit?: () => void;
  isDepositing?: boolean;
}
