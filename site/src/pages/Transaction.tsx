/**
 * Transaction Page — Trang Giao Dịch Hợp Nhất (Swap & P2P Transfer)
 * 
 * Bố cục 6:4 hiện đại Obsidian Premium V2.
 * Nút bấm tông màu vàng hoàng gia (#f2ca50).
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Layout from '../components/layout/Layout';
import { 
  CONTRACT_ADDRESSES, 
  ADF_ABI, 
  API_URL 
} from '../config/contracts';
import { 
  useSwapETHForADF, 
  useSwapADFForETH, 
  useApproveADF,
  useTransferADF,
  useFaucet,
  useWithdraw
} from '../hooks/useContractActions';
import { useADFBalance, usePendingReturns } from '../hooks/useReadContract';
import FloatingWalletWidget from '../components/layout/FloatingWalletWidget/FloatingWalletWidget';
import { ArrowUpDown, RefreshCw, ShieldAlert, Send } from 'lucide-react';
import '../styles/style.css';

interface UserTx {
  id: number;
  tx_hash: string;
  user_address: string;
  tx_type: string;
  amount: string;
  balance_change: string;
  created_at: string;
}

const getTxTypeLabel = (type: string) => {
  switch (type) {
    case 'SWAP_ETH_TO_ADF': return 'Nạp ADF (Quy đổi AMM)';
    case 'SWAP_ADF_TO_ETH': return 'Rút ADF (Quy đổi AMM)';
    case 'TRANSFER_SEND': return 'Chuyển khoản đi';
    case 'TRANSFER_RECEIVE': return 'Nhận chuyển khoản';
    case 'AUCTION_BID': return 'Đấu giá (Đặt thầu)';
    case 'WITHDRAW': return 'Rút tiền (Hoàn thầu)';
    case 'SELLER_DEPOSIT': return 'Đặt cọc bảo đảm (Bán)';
    case 'BUYER_DEPOSIT': return 'Đặt cọc bảo đảm (Mua)';
    case 'ESCROW_RELEASE': return 'Giải phóng ký quỹ';
    case 'DEPOSIT_BURN': return 'Phạt vi phạm (Đốt cọc)';
    case 'JUROR_STAKE': return 'Stake Cổ phần Juror';
    case 'JUROR_UNSTAKE': return 'Unstake Cổ phần Juror';
    case 'JUROR_REWARD': return 'Thưởng biểu quyết (Juror)';
    case 'JUROR_PENALTY': return 'Phạt biểu quyết (Juror)';
    default: return type;
  }
};

const getTxBadgeStyle = (type: string, balanceChange: string) => {
  const isPositive = balanceChange.startsWith('+');
  if (type === 'JUROR_PENALTY' || type === 'DEPOSIT_BURN') {
    return {
      background: 'rgba(239, 68, 68, 0.08)',
      color: '#ef4444'
    };
  }
  if (type === 'JUROR_REWARD' || type === 'ESCROW_RELEASE') {
    return {
      background: 'rgba(16, 185, 129, 0.08)',
      color: '#10b981'
    };
  }
  if (isPositive) {
    return {
      background: 'rgba(0, 227, 253, 0.08)',
      color: 'var(--color-secondary-container)'
    };
  }
  return {
    background: 'rgba(242, 202, 80, 0.08)',
    color: 'var(--color-primary)'
  };
};

const Transaction: React.FC = () => {
  const { address, isConnected } = useAccount();

  // User Balances
  const { data: ethBalanceResult, refetch: refetchEthBalance } = useBalance({
    address: address,
  });
  
  const { data: adfBalanceResult, refetch: refetchAdfBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.ADF,
    abi: ADF_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: adfAllowanceResult, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.ADF,
    abi: ADF_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.ADF_Pool] : undefined,
  });

  // Read Hooks for Floating Wallet Widget
  const { data: walletAdfBalance, refetch: refetchWalletBalance } = useADFBalance(address);
  const { data: walletPendingReturns, refetch: refetchWalletPending } = usePendingReturns(address);

  // Faucet & Withdraw Actions for Floating Wallet Widget
  const { faucet: callFaucet, isPending: isFauceting, isConfirming: isFaucetConfirming, isConfirmed: isFaucetConfirmed } = useFaucet();
  const { withdraw: callWithdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming, isConfirmed: isWithdrawConfirmed } = useWithdraw();

  // State
  const [isETHToADF, setIsETHToADF] = useState(true);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [lastEdited, setLastEdited] = useState<'in' | 'out'>('in');
  const [poolStats, setPoolStats] = useState<{ reserveETH: string; reserveADF: string; price: string } | null>(null);
  const [history, setHistory] = useState<UserTx[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Transfer State
  const [destAddress, setDestAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Swap On-chain Actions
  const { 
    swapETHForADF, 
    isPending: isSwappingETH, 
    isConfirmed: isSwapETHConfirmed, 
    error: swapETHErr 
  } = useSwapETHForADF();
  
  const { 
    swapADFForETH, 
    isPending: isSwappingADF, 
    isConfirmed: isSwapADFConfirmed, 
    error: swapADFErr 
  } = useSwapADFForETH();

  const { 
    approve, 
    isPending: isApproving, 
    isConfirmed: isApproveConfirmed, 
    error: approveErr 
  } = useApproveADF();

  // Transfer On-chain Action
  const {
    transferADF,
    isPending: isTransferring,
    isConfirmed: isTransferConfirmed,
    error: transferErr
  } = useTransferADF();

  // Fetch Pool stats from backend
  const fetchPoolStats = async () => {
    try {
      setIsLoadingStats(true);
      const res = await fetch(`${API_URL}/api/swap/stats`);
      if (res.ok) {
        const json = await res.json();
        setPoolStats(json.data);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch User Swap history from backend
  const fetchUserHistory = async () => {
    if (!address) return;
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_URL}/api/transaction/history?user=${address}`);
      if (res.ok) {
        const json = await res.json();
        setHistory(json.data);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Refresh all page data
  const handleRefreshAll = () => {
    fetchPoolStats();
    refetchEthBalance();
    refetchAdfBalance();
    refetchAllowance();
    refetchWalletBalance();
    refetchWalletPending();
    if (address) {
      fetchUserHistory();
    }
  };

  // 1. Calculate Out from In (Constant Product)
  const getAmountOutCalculated = (amountInStr: string, isETHForADF: boolean, stats: typeof poolStats): string => {
    if (!amountInStr || isNaN(Number(amountInStr)) || Number(amountInStr) <= 0 || !stats) return '';
    try {
      const reserveETH = BigInt(stats.reserveETH);
      const reserveADF = BigInt(stats.reserveADF);
      const K = reserveETH * reserveADF;

      const amountInVal = parseEther(amountInStr);
      if (reserveETH === 0n || reserveADF === 0n) return '';

      const fee = (amountInVal * 3n) / 1000n; // 0.3%
      const amountInAfterFee = amountInVal - fee;

      let newReserveETH = 0n;
      let newReserveADF = 0n;

      if (isETHForADF) {
        newReserveETH = reserveETH + amountInAfterFee;
        newReserveADF = K / newReserveETH;
        const out = reserveADF - newReserveADF;
        return formatEther(out);
      } else {
        newReserveADF = reserveADF + amountInAfterFee;
        newReserveETH = K / newReserveADF;
        const out = reserveETH - newReserveETH;
        return formatEther(out);
      }
    } catch (e) {
      console.error(e);
      return '';
    }
  };

  // 2. Calculate In from Out (Reverse Constant Product)
  const getAmountInCalculated = (amountOutStr: string, isETHForADF: boolean, stats: typeof poolStats): string => {
    if (!amountOutStr || isNaN(Number(amountOutStr)) || Number(amountOutStr) <= 0 || !stats) return '';
    try {
      const reserveETH = BigInt(stats.reserveETH);
      const reserveADF = BigInt(stats.reserveADF);
      const K = reserveETH * reserveADF;

      const amountOutVal = parseEther(amountOutStr);
      
      let reserveIn = 0n;
      let reserveOut = 0n;
      if (isETHForADF) {
        reserveIn = reserveETH;
        reserveOut = reserveADF;
      } else {
        reserveIn = reserveADF;
        reserveOut = reserveETH;
      }

      if (amountOutVal >= reserveOut) return '';

      // amountInAfterFee = K / (reserveOut - amountOut) - reserveIn
      const denominator = reserveOut - amountOutVal;
      const amountInAfterFee = (K / denominator) - reserveIn;
      if (amountInAfterFee <= 0n) return '';

      // amountIn = amountInAfterFee * 1000 / 997
      const amountInVal = (amountInAfterFee * 1000n + 996n) / 997n; // round up
      return formatEther(amountInVal);
    } catch (e) {
      console.error(e);
      return '';
    }
  };

  // Recalculate output/input when poolStats or swap direction changes
  useEffect(() => {
    if (lastEdited === 'in') {
      const out = getAmountOutCalculated(amountIn, isETHToADF, poolStats);
      setAmountOut(out);
    } else {
      const inVal = getAmountInCalculated(amountOut, isETHToADF, poolStats);
      setAmountIn(inVal);
    }
  }, [poolStats, isETHToADF]);

  // Initial fetches
  useEffect(() => {
    fetchPoolStats();
  }, []);

  useEffect(() => {
    if (address) {
      fetchUserHistory();
    }
  }, [address]);

  // Reload balances and history after transaction confirmations
  useEffect(() => {
    if (isSwapETHConfirmed || isSwapADFConfirmed || isApproveConfirmed || isTransferConfirmed || isFaucetConfirmed || isWithdrawConfirmed) {
      refetchEthBalance();
      refetchAdfBalance();
      refetchAllowance();
      refetchWalletBalance();
      refetchWalletPending();
      fetchPoolStats();
      setTimeout(fetchUserHistory, 1500); // Wait for listener to sync database
    }
  }, [isSwapETHConfirmed, isSwapADFConfirmed, isApproveConfirmed, isTransferConfirmed, isFaucetConfirmed, isWithdrawConfirmed]);

  // Set transaction errors
  useEffect(() => {
    if (swapETHErr) setTxError(swapETHErr.message);
    else if (swapADFErr) setTxError(swapADFErr.message);
    else if (approveErr) setTxError(approveErr.message);
    else if (transferErr) setTxError(transferErr.message);
    else setTxError(null);
  }, [swapETHErr, swapADFErr, approveErr, transferErr]);

  // Handle successful transfers (reset form)
  useEffect(() => {
    if (isTransferConfirmed) {
      alert('✨ Giao dịch chuyển khoản ADF thành công!');
      setDestAddress('');
      setTransferAmount('');
    }
  }, [isTransferConfirmed]);

  // Swap Direction Toggle
  const handleSwapDirectionToggle = () => {
    setIsETHToADF(!isETHToADF);
    // Swap input values if possible, or reset
    setAmountIn('');
    setAmountOut('');
    setLastEdited('in');
  };

  const handleAmountInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmountIn(val);
      setLastEdited('in');
      const out = getAmountOutCalculated(val, isETHToADF, poolStats);
      setAmountOut(out);
    }
  };

  const handleAmountOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmountOut(val);
      setLastEdited('out');
      const inVal = getAmountInCalculated(val, isETHToADF, poolStats);
      setAmountIn(inVal);
    }
  };

  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      alert('Vui lòng kết nối ví MetaMask.');
      return;
    }

    if (!amountIn || Number(amountIn) <= 0) {
      alert('Vui lòng nhập số lượng quy đổi hợp lệ.');
      return;
    }

    const valueWei = parseEther(amountIn);

    if (isETHToADF) {
      // ETH -> ADF swap
      const minADFOut = (parseEther(amountOut || '0') * 90n) / 100n; // Slippage tolerance 10%
      swapETHForADF(minADFOut, valueWei);
    } else {
      // ADF -> ETH swap
      const adfBalanceRaw = adfBalanceResult ? (adfBalanceResult as bigint) : 0n;
      if (valueWei > adfBalanceRaw) {
        alert('Số dư ADF trong ví của bạn không đủ.');
        return;
      }

      // Check allowance
      const allowance = adfAllowanceResult ? (adfAllowanceResult as bigint) : 0n;
      if (allowance < valueWei) {
        approve(CONTRACT_ADDRESSES.ADF_Pool);
      } else {
        const minETHOut = (parseEther(amountOut || '0') * 90n) / 100n; // Slippage tolerance 10%
        swapADFForETH(valueWei, minETHOut);
      }
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      alert('Vui lòng kết nối ví MetaMask.');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Vui lòng nhập số lượng ADF hợp lệ.');
      return;
    }

    // Hex address validation
    const hexPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!hexPattern.test(destAddress)) {
      alert('Địa chỉ ví nhận không hợp lệ. Vui lòng nhập địa chỉ ví Ethereum bắt đầu bằng 0x.');
      return;
    }

    if (destAddress.toLowerCase() === address.toLowerCase()) {
      alert('Không thể tự chuyển khoản cho chính mình.');
      return;
    }

    const amountWei = parseEther(transferAmount);
    const adfBalanceRaw = adfBalanceResult ? (adfBalanceResult as bigint) : 0n;
    if (amountWei > adfBalanceRaw) {
      alert('Số dư ADF trong ví của bạn không đủ để thực hiện chuyển khoản.');
      return;
    }

    // Call ERC20 transfer(to, amount)
    transferADF(destAddress as `0x${string}`, amountWei);
  };

  // UI Helpers
  const ethBalance = ethBalanceResult ? parseFloat(formatEther(ethBalanceResult.value)).toFixed(4) : '0';
  const adfBalance = adfBalanceResult ? parseFloat(formatEther(adfBalanceResult as bigint)).toFixed(2) : '0';
  
  const needsApproval = !isETHToADF && amountIn && adfAllowanceResult !== undefined && (adfAllowanceResult as bigint) < parseEther(amountIn);

  // Pool stats helpers
  const poolEth = poolStats ? parseFloat(formatEther(BigInt(poolStats.reserveETH))).toFixed(2) : '0';
  const poolAdf = poolStats ? parseFloat(formatEther(BigInt(poolStats.reserveADF))).toFixed(0) : '0';
  const rawPrice = poolStats ? BigInt(poolStats.price) : 0n;
  const currentPrice = rawPrice > 0n ? parseFloat(formatEther(rawPrice)).toFixed(6) : '0';
  const reversePrice = rawPrice > 0n ? (1 / parseFloat(formatEther(rawPrice))).toFixed(2) : '0';

  // Fee calculation (0.3%)
  const feeAmount = amountIn ? (parseFloat(amountIn) * 0.003).toFixed(5) : '0';

  // Slippage approximation based on Constant Product
  const calculatePriceImpact = () => {
    if (!amountIn || !poolStats || isNaN(Number(amountIn))) return '0';
    const reserveIn = isETHToADF ? parseFloat(formatEther(BigInt(poolStats.reserveETH))) : parseFloat(formatEther(BigInt(poolStats.reserveADF)));
    const valIn = parseFloat(amountIn);
    const impact = (valIn / (reserveIn + valIn)) * 100;
    return impact.toFixed(2);
  };
  const priceImpact = calculatePriceImpact();

  return (
    <Layout>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 60px 20px' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '32px' }}>
          <h1 className="text-gradient" style={{ fontFamily: 'Anybody', fontSize: '2rem', fontWeight: 200, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            GIAO DỊCH TIỀN ĐIỆN TỬ ADF
          </h1>
          <p style={{ fontFamily: 'Hanken Grotesk', fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 300, marginTop: '4px' }}>
            Nạp ADF để tham gia đấu giá vật phẩm và nhận thưởng!
          </p>
        </div>

        {/* Tx Errors Display */}
        {txError && (
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '12px', marginBottom: '24px' }}>
            <ShieldAlert style={{ color: '#ef4444', flexShrink: 0 }} size={20} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{txError}</span>
          </div>
        )}

        {/* 60:40 Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '6fr 4fr', gap: '20px', marginBottom: '24px' }}>
          
          {/* LEFT COLUMN: SWAP TOKEN (60%) */}
          <div className="glass-panel gold-border glow-gold" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontFamily: 'Anybody', fontWeight: 300 }} className="text-gradient">
                  {isETHToADF ? 'Nạp ADF (Mua ADF)' : 'Rút ADF (Rút ETH)'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 300, marginTop: '4px' }}>
                  {isETHToADF ? 'Đổi ETH lấy ADF để tham gia đấu giá.' : 'Quy đổi ADF của bạn ngược về ETH.'}
                </p>
              </div>

              {/* Refresh Button */}
              <button 
                type="button"
                onClick={handleRefreshAll}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
                title="Làm mới tỷ giá và số dư"
              >
                <RefreshCw size={14} className={isLoadingStats ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Swap Tabs Mode */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                type="button"
                className={`filter-tab ${isETHToADF ? 'active' : ''}`} 
                onClick={() => {
                  setIsETHToADF(true);
                  setAmountIn('');
                  setAmountOut('');
                  setLastEdited('in');
                }}
                style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
              >
                Nạp ADF
              </button>
              <button 
                type="button"
                className={`filter-tab ${!isETHToADF ? 'active' : ''}`} 
                onClick={() => {
                  setIsETHToADF(false);
                  setAmountIn('');
                  setAmountOut('');
                  setLastEdited('in');
                }}
                style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
              >
                Rút ADF
              </button>
            </div>

            {/* Wallet balances */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ví ETH: <strong className="font-mono text-gold" style={{ fontSize: '0.85rem' }}>{ethBalance} ETH</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>Ví ADF: <strong className="font-mono text-blue" style={{ fontSize: '0.85rem' }}>{adfBalance} ADF</strong></span>
            </div>

            <form onSubmit={handleSwapSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Input block (From) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>{isETHToADF ? 'Từ (ETH gửi đi)' : 'Từ (ADF chuyển đi)'}</span>
                  <span 
                    style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      if (isETHToADF) {
                        const maxEth = Math.max(0, parseFloat(ethBalance) - 0.005); // Gas buffer
                        const maxEthStr = maxEth > 0 ? maxEth.toString() : '0';
                        setAmountIn(maxEthStr);
                        setLastEdited('in');
                        setAmountOut(getAmountOutCalculated(maxEthStr, isETHToADF, poolStats));
                      } else {
                        setAmountIn(adfBalance);
                        setLastEdited('in');
                        setAmountOut(getAmountOutCalculated(adfBalance, isETHToADF, poolStats));
                      }
                    }}
                  >
                    Tối đa
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="0.0" 
                    value={amountIn}
                    onChange={handleAmountInChange}
                    required
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontFamily: 'var(--font-mono)', fontSize: '1.4rem' }}
                  />
                  <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>
                    {isETHToADF ? 'ETH' : 'ADF'}
                  </span>
                </div>
              </div>

              {/* Swap direction toggle button */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '-16px 0', zIndex: 2 }}>
                <button 
                  type="button" 
                  onClick={handleSwapDirectionToggle}
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: '#111415', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    color: 'var(--color-primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    transition: 'transform 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(180deg)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(0deg)'}
                >
                  <ArrowUpDown size={18} />
                </button>
              </div>

              {/* Output block (To) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>{isETHToADF ? 'Đến (ADF nhận được)' : 'Đến (ETH nhận được)'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="0.0" 
                    value={amountOut}
                    onChange={handleAmountOutChange}
                    required
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontFamily: 'var(--font-mono)', fontSize: '1.4rem' }}
                  />
                  <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>
                    {isETHToADF ? 'ADF' : 'ETH'}
                  </span>
                </div>
              </div>

              {/* Detail specs */}
              {amountIn && Number(amountIn) > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Phí chuyển đổi (0.3%):</span>
                    <span className="font-mono">{feeAmount} {isETHToADF ? 'ETH' : 'ADF'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Trượt giá ước tính:</span>
                    <span className="font-mono" style={{ color: parseFloat(priceImpact) > 5 ? '#ef4444' : 'var(--status-active)' }}>
                      {priceImpact}%
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                type="submit" 
                className="w-full"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#3c2f00',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 15px rgba(242, 202, 80, 0.22)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  padding: '14px 0',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
                disabled={isSwappingETH || isSwappingADF || isApproving || !isConnected}
              >
                {isSwappingETH || isSwappingADF
                  ? 'Đang thực hiện giao dịch...'
                  : isApproving
                  ? 'Đang xác thực cấp quyền (Approve)...'
                  : needsApproval
                  ? 'Cấp Quyền Sử Dụng ADF'
                  : isETHToADF
                  ? 'Xác nhận nạp ADF (ETH ➔ ADF)'
                  : 'Xác nhận rút ADF (ADF ➔ ETH)'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: P2P TRANSFER & STATS (40%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top: P2P Wallet Transfer Panel */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.15rem', fontFamily: 'Anybody', fontWeight: 300 }} className="text-gradient">
                  Chuyển Khoản Nội Bộ
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 300, marginTop: '2px' }}>
                  Chuyển token ADF đến các địa chỉ ví khác trong hệ thống.
                </p>
              </div>

              <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Destination address */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Địa chỉ ví nhận <span className="text-gold">*</span></label>
                  <input 
                    type="text" 
                    placeholder="0x..." 
                    className="form-input"
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    required 
                    style={{ fontSize: '0.85rem', padding: '12px 14px' }}
                  />
                </div>

                {/* Amount to transfer */}
                <div className="form-group">
                  <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 0 }}>Số lượng (ADF) <span className="text-gold">*</span></label>
                    <span 
                      style={{ fontSize: '0.7rem', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setTransferAmount(adfBalance)}
                    >
                      Tối đa
                    </span>
                  </div>
                  <input 
                    type="number" 
                    step="0.0001"
                    min="0.0001"
                    placeholder="0.0" 
                    className="form-input"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    style={{ fontSize: '0.85rem', padding: '12px 14px' }}
                  />
                </div>

                {/* Submit button */}
                <button 
                  type="submit" 
                  className="w-full"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#3c2f00',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(242, 202, 80, 0.22)',
                    transition: 'all 0.3s',
                    padding: '12px 0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  disabled={isTransferring || !isConnected}
                >
                  <Send size={14} />
                  {isTransferring ? 'Đang chuyển khoản...' : 'Xác nhận Chuyển ADF'}
                </button>
              </form>
            </div>

            {/* Bottom: Reserves and Exchange Rate stats bar */}
            <div className="glass-panel" style={{ padding: '24px 32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined text-gold" style={{ fontSize: '1.4rem' }}>query_stats</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                    Dự Trữ Hệ Thống & Tỷ Giá Pool
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span>Tổng dự trữ ADF:</span>
                    <span className="font-mono text-gold" style={{ fontWeight: 600 }}>
                      {isLoadingStats ? 'Đang tải...' : `${Number(poolAdf).toLocaleString()} ADF`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span>Tổng dự trữ ETH:</span>
                    <span className="font-mono text-gold" style={{ fontWeight: 600 }}>
                      {isLoadingStats ? 'Đang tải...' : `${poolEth} ETH`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px dashed rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                    <span>Tỷ giá AMM:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        1 ADF ≈ {currentPrice} ETH
                      </span>
                      <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                        1 ETH ≈ {reversePrice} ADF
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM SECTION: TRANSACTION HISTORY (100%) */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'Anybody', fontWeight: 300 }} className="text-gradient">
              Lịch Sử Giao Dịch & Biến Động Số Dư
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 300, marginTop: '4px' }}>
              Danh sách chi tiết các lệnh swap tokens, đặt giá thầu, chuyển khoản, và các hoạt động thay đổi số dư ADF.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Loại giao dịch</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Số lượng (ADF)</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Biến động số dư (ADF)</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Giao dịch TxHash</th>
                  <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const badgeStyle = getTxBadgeStyle(record.tx_type, record.balance_change);
                  const shortHash = record.tx_hash ? `${record.tx_hash.slice(0, 8)}...${record.tx_hash.slice(-6)}` : 'N/A';
                  const txUrl = record.tx_hash ? `https://sepolia.etherscan.io/tx/${record.tx_hash}` : '#';

                  return (
                    <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 8px' }}>
                        <span 
                          style={{ 
                            background: badgeStyle.background, 
                            color: badgeStyle.color, 
                            padding: '4px 10px', 
                            borderRadius: '4px', 
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}
                        >
                          {getTxTypeLabel(record.tx_type)}
                        </span>
                      </td>
                      <td className="font-mono text-gold" style={{ padding: '14px 8px', fontSize: '0.85rem' }}>
                        {Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td 
                        className="font-mono" 
                        style={{ 
                          padding: '14px 8px', 
                          fontSize: '0.85rem',
                          color: badgeStyle.color,
                          fontWeight: 600
                        }}
                      >
                        {record.balance_change}
                      </td>
                      <td className="tx-hash" style={{ padding: '14px 8px', fontSize: '0.85rem' }}>
                        {record.tx_hash ? (
                          <a 
                            href={txUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover-gold"
                            style={{ color: 'var(--color-secondary-container)', textDecoration: 'none' }}
                          >
                            {shortHash}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 0' }}>
                      {historyLoading ? 'Đang tải lịch sử...' : 'Không tìm thấy lịch sử hoạt động giao dịch.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Floating Wallet Widget integration */}
      {isConnected && (
        <FloatingWalletWidget
          balance={walletAdfBalance !== undefined ? (walletAdfBalance as bigint) : 0n}
          pendingReturns={walletPendingReturns !== undefined ? (walletPendingReturns as bigint) : 0n}
          onWithdraw={() => callWithdraw()}
          isWithdrawing={isWithdrawing}
          isWithdrawConfirming={isWithdrawConfirming}
          onDeposit={() => callFaucet()}
          isDepositing={isFauceting || isFaucetConfirming}
        />
      )}
    </Layout>
  );
};

export default Transaction;
