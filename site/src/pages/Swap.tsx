import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { parseEther, formatEther, parseUnits } from 'viem';
import Layout from '../components/layout/Layout';
import { 
  CONTRACT_ADDRESSES, 
  ADF_ABI, 
  ADF_POOL_ABI, 
  API_URL 
} from '../config/contracts';
import { 
  useSwapETHForADF, 
  useSwapADFForETH, 
  useApproveADF 
} from '../hooks/useContractActions';
import { ArrowUpDown, RefreshCw, History, Info, Coins, ShieldAlert } from 'lucide-react';
import '../styles/style.css';

interface SwapTx {
  id: number;
  tx_hash: string;
  user_address: string;
  swap_type: 'ETH_TO_ADF' | 'ADF_TO_ETH';
  amount_in: string;
  amount_out: string;
  fee_collected: string;
  created_at: string;
}

const Swap: React.FC = () => {
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

  // State
  const [isETHToADF, setIsETHToADF] = useState(true);
  const [amountIn, setAmountIn] = useState('');
  const [estimatedOut, setEstimatedOut] = useState('0');
  const [poolStats, setPoolStats] = useState<{ reserveETH: string; reserveADF: string; price: string } | null>(null);
  const [history, setHistory] = useState<SwapTx[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Contract Actions
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
      const res = await fetch(`${API_URL}/api/swap/history?user=${address}`);
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

  // Estimate Amount Out using readContract on ADF_Pool
  const { data: amountOutResult } = useReadContract({
    address: CONTRACT_ADDRESSES.ADF_Pool,
    abi: ADF_POOL_ABI,
    functionName: 'getAmountOut',
    args: amountIn && !isNaN(Number(amountIn)) && Number(amountIn) > 0
      ? [parseEther(amountIn), isETHToADF]
      : undefined,
  });

  // Calculate estimated output when input or direction changes
  useEffect(() => {
    if (amountIn && !isNaN(Number(amountIn)) && Number(amountIn) > 0 && amountOutResult !== undefined) {
      setEstimatedOut(formatEther(amountOutResult as bigint));
    } else {
      setEstimatedOut('0');
    }
  }, [amountIn, amountOutResult, isETHToADF]);

  // Initial fetches
  useEffect(() => {
    fetchPoolStats();
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserHistory();
    }
  }, [isConnected, address]);

  // Reload balances and history after transaction confirmations
  useEffect(() => {
    if (isSwapETHConfirmed || isSwapADFConfirmed || isApproveConfirmed) {
      refetchEthBalance();
      refetchAdfBalance();
      refetchAllowance();
      fetchPoolStats();
      setTimeout(fetchUserHistory, 1000); // Wait for listener to sync
    }
  }, [isSwapETHConfirmed, isSwapADFConfirmed, isApproveConfirmed]);

  // Set transaction errors
  useEffect(() => {
    if (swapETHErr) setTxError(swapETHErr.message);
    else if (swapADFErr) setTxError(swapADFErr.message);
    else if (approveErr) setTxError(approveErr.message);
    else setTxError(null);
  }, [swapETHErr, swapADFErr, approveErr]);

  const handleSwapDirectionToggle = () => {
    setIsETHToADF(!isETHToADF);
    setAmountIn('');
    setEstimatedOut('0');
  };

  const handleAmountInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmountIn(val);
    }
  };

  const handleAction = async () => {
    if (!isConnected || !address) {
      alert('Vui lòng kết nối ví MetaMask.');
      return;
    }

    if (!amountIn || Number(amountIn) <= 0) {
      alert('Vui lòng nhập số lượng hợp lệ.');
      return;
    }

    const valueWei = parseEther(amountIn);

    if (isETHToADF) {
      // ETH -> ADF swap
      // Slippage limit: 10% slippage tolerance (minADFOut = estimatedOut * 0.9)
      const minADFOut = (parseEther(estimatedOut) * 90n) / 100n;
      swapETHForADF(minADFOut, valueWei);
    } else {
      // ADF -> ETH swap
      const adfBalance = adfBalanceResult ? (adfBalanceResult as bigint) : 0n;
      if (valueWei > adfBalance) {
        alert('Số dư ADF không đủ.');
        return;
      }

      // Check allowance
      const allowance = adfAllowanceResult ? (adfAllowanceResult as bigint) : 0n;
      if (allowance < valueWei) {
        // Needs approval first
        approve(CONTRACT_ADDRESSES.ADF_Pool);
      } else {
        // Slippage limit: 10% tolerance (minETHOut = estimatedOut * 0.9)
        const minETHOut = (parseEther(estimatedOut) * 90n) / 100n;
        swapADFForETH(valueWei, minETHOut);
      }
    }
  };

  // UI Helpers
  const ethBalance = ethBalanceResult ? parseFloat(ethBalanceResult.formatted).toFixed(4) : '0';
  const adfBalance = adfBalanceResult ? parseFloat(formatEther(adfBalanceResult as bigint)).toFixed(2) : '0';
  const needsApproval = !isETHToADF && amountIn && adfAllowanceResult !== undefined && (adfAllowanceResult as bigint) < parseEther(amountIn);

  // Pool stats helpers
  const poolEth = poolStats ? parseFloat(formatEther(BigInt(poolStats.reserveETH))).toFixed(2) : '0';
  const poolAdf = poolStats ? parseFloat(formatEther(BigInt(poolStats.reserveADF))).toFixed(0) : '0';
  const rawPrice = poolStats ? BigInt(poolStats.price) : 0n;
  const currentPrice = rawPrice > 0n ? parseFloat(formatEther(rawPrice)).toFixed(6) : '0';
  const reversePrice = rawPrice > 0n ? (1 / parseFloat(formatEther(rawPrice))).toFixed(2) : '0';

  // Fee calculation (0.3%)
  const feePercent = '0.3%';
  const feeAmount = amountIn ? (parseFloat(amountIn) * 0.003).toFixed(5) : '0';

  // Slippage approximation based onConstant Product
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
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            💱 Bể Thanh Khoản AMM
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Quy đổi hai chiều ETH ↔ ADF với tỷ giá thị trường tự động trượt theo cung cầu (Constant Product Formula $X \times Y = K$)
          </p>
        </div>

        {/* Top Pool Reserves Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Coins size={28} />
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500', textTransform: 'uppercase' }}>Tổng dự trữ ADF</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginTop: '0.25rem' }}>
                {isLoadingStats ? '---' : `${Number(poolAdf).toLocaleString()} ADF`}
              </h3>
            </div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
              <Coins size={28} />
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500', textTransform: 'uppercase' }}>Tổng dự trữ ETH</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginTop: '0.25rem' }}>
                {isLoadingStats ? '---' : `${poolEth} ETH`}
              </h3>
            </div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <RefreshCw size={28} />
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500', textTransform: 'uppercase' }}>Tỷ giá hiện tại</p>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginTop: '0.25rem' }}>
                {isLoadingStats ? '---' : `1 ADF ≈ ${currentPrice} ETH`}
              </h3>
              <p style={{ color: '#a855f7', fontSize: '0.8rem', marginTop: '0.1rem' }}>
                {isLoadingStats ? '' : `1 ETH ≈ ${reversePrice} ADF`}
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Swap Card and History */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          {/* Swap Panel Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Quy đổi Token</h3>
              <button 
                onClick={fetchPoolStats}
                disabled={isLoadingStats}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                className="hover-bright"
              >
                <RefreshCw size={16} className={isLoadingStats ? 'spin-anim' : ''} />
                Làm mới giá
              </button>
            </div>

            {/* Input Token Box */}
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Từ</span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Số dư: {isETHToADF ? `${ethBalance} ETH` : `${adfBalance} ADF`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={amountIn} 
                  onChange={handleAmountInChange}
                  placeholder="0.0" 
                  style={{ background: 'none', border: 'none', fontSize: '1.75rem', fontWeight: '600', color: '#fff', width: '70%', outline: 'none' }}
                />
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: isETHToADF ? '#0ea5e9' : '#6366f1', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.8rem', borderRadius: '12px' }}>
                  {isETHToADF ? 'ETH' : 'ADF'}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0' }}>
              <button 
                onClick={handleSwapDirectionToggle}
                style={{ background: '#312e81', color: '#818cf8', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                className="hover-spin-arrow"
              >
                <ArrowUpDown size={18} />
              </button>
            </div>

            {/* Output Token Box */}
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Đến (Ước tính)</span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Số dư: {isETHToADF ? `${adfBalance} ADF` : `${ethBalance} ETH`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={estimatedOut} 
                  readOnly 
                  style={{ background: 'none', border: 'none', fontSize: '1.75rem', fontWeight: '600', color: '#94a3b8', width: '70%', outline: 'none' }}
                />
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: isETHToADF ? '#6366f1' : '#0ea5e9', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.8rem', borderRadius: '12px' }}>
                  {isETHToADF ? 'ADF' : 'ETH'}
                </span>
              </div>
            </div>

            {/* Transaction Info details */}
            {amountIn && Number(amountIn) > 0 && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '0.875rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#94a3b8' }}>
                  <span>Tỷ giá quy đổi</span>
                  <span style={{ color: '#fff' }}>
                    {isETHToADF ? `1 ETH ≈ ${(Number(estimatedOut) / Number(amountIn)).toFixed(2)} ADF` : `1 ADF ≈ ${(Number(estimatedOut) / Number(amountIn)).toFixed(6)} ETH`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#94a3b8' }}>
                  <span>Phí giao dịch ({feePercent})</span>
                  <span style={{ color: '#fff' }}>
                    {feeAmount} {isETHToADF ? 'ETH' : 'ADF'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Trượt giá (Price Impact)</span>
                  <span style={{ color: parseFloat(priceImpact) > 5 ? '#f43f5e' : '#22c55e', fontWeight: '500' }}>
                    {parseFloat(priceImpact) > 0.01 ? `${priceImpact}%` : '< 0.01%'}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message Panel */}
            {txError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '12px', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <span style={{ wordBreak: 'break-word' }}>Giao dịch thất bại: {txError.slice(0, 150)}...</span>
              </div>
            )}

            {/* Swap/Approve Action Button */}
            {!isConnected ? (
              <button 
                disabled 
                style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontWeight: '600', fontSize: '1.1rem', cursor: 'not-allowed' }}
              >
                Kết nối ví để giao dịch
              </button>
            ) : isSwappingETH || isSwappingADF || isApproving ? (
              <button 
                disabled 
                style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', border: 'none', color: '#c7d2fe', fontWeight: '600', fontSize: '1.1rem', cursor: 'wait', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={20} className="spin-anim" />
                {isApproving ? 'Đang duyệt chi ADF...' : 'Đang xử lý giao dịch...'}
              </button>
            ) : needsApproval ? (
              <button 
                onClick={handleAction}
                style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)', border: 'none', color: '#fff', fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)' }}
                className="btn-glow"
              >
                Phê Duyệt (Approve) ADF
              </button>
            ) : (
              <button 
                onClick={handleAction}
                style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: isETHToADF ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', border: 'none', color: '#fff', fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: isETHToADF ? '0 4px 15px rgba(2, 132, 199, 0.4)' : '0 4px 15px rgba(79, 70, 229, 0.4)' }}
                className="btn-glow"
              >
                {isETHToADF ? 'Đổi ETH lấy ADF' : 'Đổi ADF lấy ETH'}
              </button>
            )}
          </div>

          {/* User History Panel */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem', minHeight: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <History size={20} style={{ color: '#a5b4fc' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Lịch Sử Giao Dịch Của Bạn</h3>
            </div>

            {!isConnected ? (
              <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '0.5rem' }}>
                <Info size={32} />
                <p>Hãy kết nối ví để xem lịch sử swap</p>
              </div>
            ) : historyLoading ? (
              <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <RefreshCw size={28} className="spin-anim" />
              </div>
            ) : history.length === 0 ? (
              <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '0.5rem' }}>
                <Info size={32} />
                <p>Bạn chưa thực hiện giao dịch swap nào</p>
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }} className="custom-scrollbar">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Thời gian</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Loại</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Số lượng</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx) => {
                      const date = new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const inVal = parseFloat(formatEther(BigInt(tx.amount_in))).toFixed(2);
                      const outVal = parseFloat(formatEther(BigInt(tx.amount_out))).toFixed(2);
                      
                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#e2e8f0' }} className="hover-highlight-row">
                          <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{date}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{ 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem', 
                              fontWeight: '600',
                              background: tx.swap_type === 'ETH_TO_ADF' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(79, 70, 229, 0.15)',
                              color: tx.swap_type === 'ETH_TO_ADF' ? '#38bdf8' : '#818cf8'
                            }}>
                              {tx.swap_type === 'ETH_TO_ADF' ? 'ETH → ADF' : 'ADF → ETH'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{ fontWeight: '500' }}>{inVal}</span> ➔ <span style={{ color: '#38bdf8', fontWeight: '500' }}>{outVal}</span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <a 
                              href={`#`} 
                              onClick={(e) => { e.preventDefault(); alert(`Tx Hash: ${tx.tx_hash}`); }}
                              style={{ color: '#a5b4fc', textDecoration: 'none' }}
                            >
                              {tx.tx_hash.slice(0, 6)}...{tx.tx_hash.slice(-4)}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Swap;
