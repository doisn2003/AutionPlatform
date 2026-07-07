import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { API_URL, CONTRACT_ADDRESSES } from '../config/contracts';
import { formatAddress } from '../utils/formatters';
import { 
  Award, 
  ShieldCheck, 
  Trophy, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  Coins,
  Check,
  X,
  ShieldAlert,
  UserCheck,
  HelpCircle,
  Plus,
  Minus,
  Info,
  Gavel,
  ArrowRight,
  Eye
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useADFBalance, useJurorStakes, useADFAllowanceForDispute } from '../hooks/useReadContract';
import { useApproveADF, useStakeForJuror, useUnstakeJuror, useFaucet } from '../hooks/useContractActions';
import '../styles/style.css';

interface LeaderboardUser {
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  total_auctions_created: number;
  total_bids_placed: number;
  total_bids_won: number;
  successful_deliveries: number;
  reputation_score: string;
  juror_eligible: boolean;
}

const Reputation: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Web3 state
  const { isConnected, address: userAddress } = useAccount();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Juror Dashboard states
  const [jurorDisputes, setJurorDisputes] = useState<any[]>([]);
  const [jurorDisputesLoading, setJurorDisputesLoading] = useState(false);

  // Staking inputs & statuses
  const [stakeInput, setStakeInput] = useState('');
  const [unstakeInput, setUnstakeInput] = useState('');
  const [stakeStep, setStakeStep] = useState<'idle' | 'approving' | 'staking' | 'success' | 'error'>('idle');
  const [unstakeStep, setUnstakeStep] = useState<'idle' | 'unstaking' | 'success' | 'error'>('idle');
  const [stakeErrMsg, setStakeErrMsg] = useState('');
  const [unstakeErrMsg, setUnstakeErrMsg] = useState('');

  // Web3 read hooks
  const { data: balance, refetch: refetchBalance } = useADFBalance(userAddress);
  const { data: onChainStaked, refetch: refetchJurorStakes } = useJurorStakes(userAddress);
  const { data: allowance, refetch: refetchAllowance } = useADFAllowanceForDispute(userAddress);

  // Web3 action hooks
  const { 
    approve: approveADF, 
    isPending: isApproving, 
    isConfirming: isApproveConfirming, 
    isConfirmed: isApproveConfirmed, 
    error: approveError 
  } = useApproveADF();

  const {
    stakeForJuror,
    isPending: isStaking,
    isConfirming: isStakeConfirming,
    isConfirmed: isStakeConfirmed,
    error: stakeError
  } = useStakeForJuror();

  const {
    unstakeJuror,
    isPending: isUnstaking,
    isConfirming: isUnstakeConfirming,
    isConfirmed: isUnstakeConfirmed,
    error: unstakeError
  } = useUnstakeJuror();

  const {
    faucet,
    isPending: isFauceting,
    isConfirming: isFaucetConfirming,
    isConfirmed: isFaucetConfirmed
  } = useFaucet();

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/profile/leaderboard?limit=20`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!userAddress) return;
    try {
      setProfileLoading(true);
      const res = await fetch(`${API_URL}/api/profiles/${userAddress}`);
      if (res.ok) {
        const json = await res.json();
        setProfile(json.data || json);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchJurorDisputes = async () => {
    if (!userAddress) return;
    try {
      setJurorDisputesLoading(true);
      const res = await fetch(`${API_URL}/api/disputes/juror/${userAddress}`);
      if (res.ok) {
        const json = await res.json();
        setJurorDisputes(json.disputes || []);
      }
    } catch (err) {
      console.error('Error fetching juror disputes:', err);
    } finally {
      setJurorDisputesLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (userAddress) {
      fetchUserProfile();
    } else {
      setProfile(null);
      setJurorDisputes([]);
    }
  }, [userAddress]);

  // Fetch juror disputes when profile loads and user is eligible
  useEffect(() => {
    if (profile?.juror_eligible && userAddress) {
      fetchJurorDisputes();
    }
  }, [profile, userAddress]);

  // Handle Approve transition for Staking
  useEffect(() => {
    if (isApproveConfirmed && stakeStep === 'approving') {
      refetchAllowance().then(() => {
        setStakeStep('staking');
        const amountWei = parseUnits(stakeInput, 18);
        stakeForJuror(amountWei);
      });
    }
  }, [isApproveConfirmed, stakeStep]);

  // Handle Stake transition success
  useEffect(() => {
    if (isStakeConfirmed) {
      setStakeStep('success');
      setStakeInput('');
      refetchBalance();
      refetchJurorStakes();
      refetchAllowance();
      setTimeout(() => {
        fetchUserProfile();
        fetchLeaderboard();
      }, 2000);
      const timer = setTimeout(() => setStakeStep('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isStakeConfirmed]);

  // Handle Unstake transition success
  useEffect(() => {
    if (isUnstakeConfirmed) {
      setUnstakeStep('success');
      setUnstakeInput('');
      refetchBalance();
      refetchJurorStakes();
      setTimeout(() => {
        fetchUserProfile();
        fetchLeaderboard();
      }, 2000);
      const timer = setTimeout(() => setUnstakeStep('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isUnstakeConfirmed]);

  // Handle Faucet success
  useEffect(() => {
    if (isFaucetConfirmed) {
      refetchBalance();
    }
  }, [isFaucetConfirmed]);

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setStakeStep('error');
      setStakeErrMsg(approveError.message || 'Lỗi Approve ADF');
    }
  }, [approveError]);

  useEffect(() => {
    if (stakeError) {
      setStakeStep('error');
      setStakeErrMsg(stakeError.message || 'Lỗi Stake ADF');
    }
  }, [stakeError]);

  useEffect(() => {
    if (unstakeError) {
      setUnstakeStep('error');
      setUnstakeErrMsg(unstakeError.message || 'Lỗi Unstake ADF');
    }
  }, [unstakeError]);

  const handleStakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !userAddress) {
      alert('Vui lòng kết nối ví trước');
      return;
    }
    const val = parseFloat(stakeInput);
    if (isNaN(val) || val <= 0) {
      alert('Số lượng stake phải lớn hơn 0');
      return;
    }
    const amountWei = parseUnits(stakeInput, 18);
    const balanceWei = balance || 0n;
    if (amountWei > balanceWei) {
      alert('Số dư ADF trong ví của bạn không đủ');
      return;
    }

    // Check allowance
    if (allowance !== undefined && allowance < amountWei) {
      setStakeStep('approving');
      approveADF(CONTRACT_ADDRESSES.DisputeResolution, amountWei);
    } else {
      setStakeStep('staking');
      stakeForJuror(amountWei);
    }
  };

  const handleUnstakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !userAddress) {
      alert('Vui lòng kết nối ví trước');
      return;
    }
    const val = parseFloat(unstakeInput);
    if (isNaN(val) || val <= 0) {
      alert('Số lượng rút phải lớn hơn 0');
      return;
    }
    const amountWei = parseUnits(unstakeInput, 18);
    const stakedWei = onChainStaked || 0n;
    if (amountWei > stakedWei) {
      alert('Số lượng rút vượt quá số ADF đang stake');
      return;
    }

    setUnstakeStep('unstaking');
    unstakeJuror(amountWei);
  };

  // Filter top 5 jurors
  const activeJurors = users.filter(u => u.juror_eligible).slice(0, 5);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy size={20} style={{ color: '#fbbf24' }} />; // Gold
    if (rank === 2) return <Trophy size={20} style={{ color: '#cbd5e1' }} />; // Silver
    if (rank === 3) return <Trophy size={20} style={{ color: '#b45309' }} />; // Bronze
    return <span style={{ color: '#64748b', fontWeight: 'bold' }}>#{rank}</span>;
  };

  // Check personal eligibility requirements (Simplified: chỉ cần uy tín >= 50 và stake >= 500)
  const userReputation = profile ? parseFloat(profile.reputation_score) : 0;
  
  const stakedFloat = onChainStaked !== undefined ? parseFloat(formatUnits(onChainStaked, 18)) : 0;
  const balanceFloat = balance !== undefined ? parseFloat(formatUnits(balance, 18)) : 0;

  const reqReputationOk = userReputation >= 50;
  const reqStakeOk = stakedFloat >= 500;

  const isEligible = reqReputationOk && reqStakeOk;

  return (
    <Layout>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            ⚖️ Bảng Xếp Hạng Uy Tín
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Nơi vinh danh những người dùng uy tín nhất hệ thống và công khai danh sách ứng cử viên Trọng tài
          </p>
        </div>

        {/* Top 5 Juror Pool Banner */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} style={{ color: '#818cf8' }} />
            Danh sách 5 Trọng Tài (Jurors) Hiện Tại
          </h3>
          {activeJurors.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '14px' }}>
              <AlertCircle size={20} />
              <span>Chưa có người dùng nào đủ điều kiện làm Juror (Yêu cầu: điểm uy tín ≥ 50 và đã stake ≥ 500 ADF). Giao dịch tranh chấp sẽ được xử lý bởi quản trị viên.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {activeJurors.map((juror, idx) => (
                <div 
                  key={juror.wallet_address}
                  style={{ 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    border: '1px solid rgba(99, 102, 241, 0.2)', 
                    borderRadius: '16px', padding: '0.75rem 1rem', 
                    display: 'flex', alignItems: 'center', gap: '0.75rem' 
                  }}
                >
                  <img 
                    src={juror.avatar_url || 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=100&auto=format&fit=crop&q=60'} 
                    alt="Avatar" 
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <h5 style={{ color: '#fff', fontWeight: '700', fontSize: '0.85rem' }}>
                      {juror.display_name || formatAddress(juror.wallet_address)}
                    </h5>
                    <p style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.1rem' }}>
                      Top #{idx + 1} Juror | Score: {parseFloat(juror.reputation_score).toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GUIDELINES & PERSONAL STAKING GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* LEFT: Guidelines */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <HelpCircle size={22} style={{ color: '#f59e0b' }} />
              Hướng Dẫn Ứng Cử Trọng Tài (Juror)
            </h3>
            
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
              Hệ thống ADF v2.0 áp dụng cơ chế <strong>Bồi thẩm đoàn phân định (Jury Voting)</strong> để giải quyết tranh chấp giao dịch hàng vật lý. Bất kỳ thành viên uy tín nào cũng có thể đóng góp cổ phần biểu quyết và nhận phí xử lý án.
            </p>

            <div>
              <h4 style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Check size={16} style={{ color: '#10b981' }} />
                Điều kiện tham gia:
              </h4>
              <ul style={{ color: '#94a3b8', fontSize: '0.85rem', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>Điểm uy tín tích lũy của tài khoản phải đạt tối thiểu <strong>50.0 điểm</strong>.</li>
                <li>Staking tối thiểu <strong>500 ADF</strong> vào Hợp đồng tòa án để làm quỹ cọc cam kết.</li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={16} style={{ color: '#fbbf24' }} />
                Cơ chế thưởng phạt & Quyền lợi:
              </h4>
              <ul style={{ color: '#94a3b8', fontSize: '0.85rem', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>Thưởng (+50 ADF)</strong>: Dành cho các trọng tài bỏ phiếu chính xác khớp với kết quả biểu quyết chung cuộc của bồi thẩm đoàn.</li>
                <li><strong>Phạt (-100 ADF)</strong>: Bị khấu trừ trực tiếp vào lượng stake nếu trọng tài bỏ phiếu sai lệch lớn hoặc gian lận không gửi giải mã phiếu (Reveal). Số tiền phạt sẽ bị chuyển vào AMM Pool để tăng thanh khoản hệ thống.</li>
                <li>Bỏ phiếu ẩn danh thông qua 2 giai đoạn bảo mật cao: Commit (gửi mã băm) và Reveal (gửi phiếu thực + salt).</li>
              </ul>
            </div>
          </div>

          {/* RIGHT: Personal Staking Panel */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Coins size={22} style={{ color: '#818cf8' }} />
              Bảng Điều Khiển Staking Trọng Tài
            </h3>

            {!isConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, minHeight: '260px', gap: '1rem', color: '#64748b' }}>
                <ShieldAlert size={48} style={{ color: '#6366f1', opacity: 0.8 }} />
                <h4 style={{ color: '#fff', margin: 0 }}>Ví Web3 Chưa Kết Nối</h4>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', maxWidth: '320px', color: '#94a3b8', margin: 0 }}>
                  Vui lòng kết nối ví Metamask bằng nút ở thanh điều hướng để xem thông số uy tín cá nhân và nạp tiền stake.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* User Stats Display */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Địa chỉ ví</span>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', fontFamily: 'monospace' }}>
                      {userAddress ? `${userAddress.slice(0, 8)}...${userAddress.slice(-6)}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Số dư ví</span>
                    <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: '700' }}>
                      {balanceFloat.toFixed(2)} ADF
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Đang Stake (On-chain)</span>
                    <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: '700' }}>
                      {stakedFloat.toFixed(2)} ADF
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Điểm Uy Tín</span>
                    <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700' }}>
                      {userReputation.toFixed(1)} / 50.0
                    </span>
                  </div>
                </div>

                {/* Eligibility Status Banner */}
                {isEligible ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <UserCheck size={24} style={{ color: '#10b981', flexShrink: 0 }} />
                    <div style={{ fontSize: '0.8rem', color: '#4ade80', lineHeight: '1.4' }}>
                      <strong>Bạn đã đủ điều kiện làm Trọng tài!</strong> Hệ thống sẽ tự động chọn ngẫu nhiên bạn vào Bồi thẩm đoàn khi có tranh chấp phát sinh.
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '16px', padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <AlertCircle size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: '700' }}>Chưa đủ điều kiện ứng cử làm Juror</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {reqReputationOk ? <Check size={12} color="#10b981" /> : <X size={12} color="#ef4444" />}
                        <span>Uy tín: {userReputation.toFixed(1)}/50</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {reqStakeOk ? <Check size={12} color="#10b981" /> : <X size={12} color="#ef4444" />}
                        <span>Stake: {stakedFloat.toFixed(0)}/500 ADF</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Staking Action Forms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* STAKE FORM */}
                  <form onSubmit={handleStakeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600' }}>Nạp cọc Staking ADF</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ position: 'relative', flexGrow: 1 }}>
                        <input
                          type="number"
                          placeholder="Nhập số lượng ADF (Ví dụ: 500)"
                          value={stakeInput}
                          onChange={(e) => setStakeInput(e.target.value)}
                          disabled={stakeStep === 'approving' || stakeStep === 'staking'}
                          style={{
                            width: '100%',
                            padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                            background: 'rgba(0, 0, 0, 0.25)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '0.85rem'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>ADF</span>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={stakeStep === 'approving' || stakeStep === 'staking' || !stakeInput}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '0 1.25rem',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          minWidth: '120px',
                          justifyContent: 'center'
                        }}
                      >
                        <Plus size={16} />
                        Stake
                      </button>
                    </div>
                    {stakeStep === 'approving' && (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div className="spin-anim" style={{ width: '10px', height: '10px', border: '2px solid rgba(251,191,36,0.1)', borderTopColor: '#fbbf24', borderRadius: '50%' }}></div>
                        Đang phê duyệt (Approve) ADF...
                      </span>
                    )}
                    {stakeStep === 'staking' && (
                      <span style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div className="spin-anim" style={{ width: '10px', height: '10px', border: '2px solid rgba(129,140,248,0.1)', borderTopColor: '#818cf8', borderRadius: '50%' }}></div>
                        Đang giao dịch nạp stake...
                      </span>
                    )}
                    {stakeStep === 'success' && (
                      <span style={{ fontSize: '0.75rem', color: '#10b981' }}>🎉 Nạp cọc Staking thành công!</span>
                    )}
                    {stakeStep === 'error' && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>⚠️ Thất bại: {stakeErrMsg}</span>
                    )}
                  </form>

                  {/* UNSTAKE FORM */}
                  {stakedFloat > 0 && (
                    <form onSubmit={handleUnstakeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600' }}>Rút cọc Staking ADF</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ position: 'relative', flexGrow: 1 }}>
                          <input
                            type="number"
                            placeholder="Nhập số lượng rút"
                            value={unstakeInput}
                            onChange={(e) => setUnstakeInput(e.target.value)}
                            disabled={unstakeStep === 'unstaking'}
                            style={{
                              width: '100%',
                              padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                              background: 'rgba(0, 0, 0, 0.25)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '0.85rem'
                            }}
                          />
                          <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>ADF</span>
                        </div>
                        
                        <button
                          type="submit"
                          disabled={unstakeStep === 'unstaking' || !unstakeInput}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '0 1.25rem',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            minWidth: '120px',
                            justifyContent: 'center'
                          }}
                        >
                          <Minus size={16} />
                          Rút cọc
                        </button>
                      </div>
                      {unstakeStep === 'unstaking' && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <div className="spin-anim" style={{ width: '10px', height: '10px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%' }}></div>
                          Đang giao dịch rút stake...
                        </span>
                      )}
                      {unstakeStep === 'success' && (
                        <span style={{ fontSize: '0.75rem', color: '#10b981' }}>🎉 Rút cọc Staking thành công!</span>
                      )}
                      {unstakeStep === 'error' && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>⚠️ Thất bại: {unstakeErrMsg}</span>
                      )}
                    </form>
                  )}

                  {/* FAUCET & HELPFUL UTILS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Info size={12} />
                      Yêu cầu tối thiểu: 500.00 ADF
                    </span>
                    <button
                      type="button"
                      onClick={() => faucet()}
                      disabled={isFauceting}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fbbf24',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      className="hover-bright"
                    >
                      <Coins size={14} />
                      {isFauceting ? 'Đang nhận vòi...' : 'Nhận Faucet 10 ADF'}
                    </button>
                  </div>

                </div>

              </div>
            )}
          </div>

        </div>

        {/* Leaderboard Table Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', margin: 0 }}>Bảng Điểm Uy Tín</h3>
            <button 
              onClick={fetchLeaderboard}
              disabled={isLoading}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              className="hover-bright"
            >
              <RefreshCw size={16} className={isLoading ? 'spin-anim' : ''} />
              Làm mới
            </button>
          </div>

          {isLoading && users.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spin-anim" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', borderRadius: '50%' }}></div>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Không tìm thấy người dùng nào trong cơ sở dữ liệu.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Thứ hạng</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Thành viên</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Địa chỉ ví</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Đấu giá (Tạo/Bid)</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Giao thành công</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Trạng thái Juror</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Điểm uy tín</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr 
                        key={user.wallet_address} 
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#e2e8f0' }}
                        className="hover-highlight-row"
                      >
                        <td style={{ padding: '1.25rem 0.5rem' }}>
                          {getRankBadge(rank)}
                        </td>
                        <td style={{ padding: '1.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img 
                            src={user.avatar_url || 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=100&auto=format&fit=crop&q=60'} 
                            alt="Avatar" 
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span style={{ fontWeight: '700' }}>
                            {user.display_name || 'Anonymous User'}
                          </span>
                        </td>
                        <td style={{ padding: '1.25rem 0.5rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                          {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                        </td>
                        <td style={{ padding: '1.25rem 0.5rem', textAlign: 'center' }}>
                          {user.total_auctions_created} / {user.total_bids_placed}
                        </td>
                        <td style={{ padding: '1.25rem 0.5rem', textAlign: 'center', color: '#10b981', fontWeight: '600' }}>
                          {user.successful_deliveries}
                        </td>
                        <td style={{ padding: '1.25rem 0.5rem', textAlign: 'center' }}>
                          {user.juror_eligible ? (
                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                              ⚖️ Juror Eligible
                            </span>
                          ) : (
                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                              Thành viên
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1.25rem 0.5rem', textAlign: 'right', fontWeight: '800', color: '#fbbf24', fontSize: '1rem' }}>
                          {parseFloat(user.reputation_score).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== JUROR DASHBOARD SECTION ===== */}
        {isConnected && profile?.juror_eligible && (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '2rem', marginTop: '2rem' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Gavel size={24} style={{ color: '#818cf8' }} />
                Dashboard Trọng Tài
              </h3>
              <button
                onClick={fetchJurorDisputes}
                disabled={jurorDisputesLoading}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                className="hover-bright"
              >
                <RefreshCw size={16} className={jurorDisputesLoading ? 'spin-anim' : ''} />
                Làm mới
              </button>
            </div>

            {/* Eligible banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '16px', padding: '0.85rem 1.2rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <ShieldCheck size={22} style={{ color: '#818cf8', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: '#c7d2fe', lineHeight: '1.5' }}>
                <strong style={{ color: '#fff' }}>Bạn là Trọng tài đủ điều kiện.</strong> Khi có tranh chấp phát sinh, hệ thống sẽ tự động gán bạn vào Bồi thẩm đoàn. Danh sách vụ án được phân công sẽ hiển thị bên dưới.
              </span>
            </div>

            {/* Disputes List */}
            {jurorDisputesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spin-anim" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', borderRadius: '50%' }}></div>
              </div>
            ) : jurorDisputes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', color: '#64748b' }}>
                <Scale size={48} style={{ color: '#6366f1', opacity: 0.5 }} />
                <h4 style={{ color: '#94a3b8', fontWeight: '600', margin: 0 }}>Chưa có vụ tranh chấp nào</h4>
                <p style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '380px', margin: 0 }}>
                  Bạn sẽ được thông báo khi có vụ án mới. Hãy quay lại kiểm tra sau mỗi khi có tranh chấp được mở.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>
                      <th style={{ padding: '1rem 0.5rem' }}>Dispute ID</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Auction ID</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Pha hiện tại</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Trạng thái phiếu</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Kết quả</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jurorDisputes.map((d: any) => {
                      // Phase badge
                      const phaseColors: Record<string, { bg: string; color: string }> = {
                        'EVIDENCE': { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
                        'COMMIT': { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
                        'REVEAL': { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' },
                        'RESOLVED': { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
                      };
                      const phaseStyle = phaseColors[d.phase] || phaseColors['EVIDENCE'];

                      // Vote status
                      let voteLabel = 'Chưa bỏ phiếu';
                      let voteColor = '#64748b';
                      if (d.has_revealed) {
                        voteLabel = `Đã reveal (${d.revealed_vote === 1 ? 'Buyer' : 'Seller'})`;
                        voteColor = '#34d399';
                      } else if (d.has_committed) {
                        voteLabel = 'Đã commit';
                        voteColor = '#fbbf24';
                      }

                      // Result
                      let resultDisplay = '—';
                      if (d.phase === 'RESOLVED' || d.resolved) {
                        const bv = d.buyer_votes || 0;
                        const sv = d.seller_votes || 0;
                        resultDisplay = `Buyer ${bv} - ${sv} Seller`;
                      }

                      return (
                        <tr
                          key={d.dispute_id}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#e2e8f0' }}
                          className="hover-highlight-row"
                        >
                          <td style={{ padding: '1rem 0.5rem', fontWeight: '700', fontFamily: 'monospace' }}>#{d.dispute_id}</td>
                          <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace', color: '#94a3b8' }}>#{d.auction_id}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: phaseStyle.bg, color: phaseStyle.color }}>
                              {d.phase}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: '600', color: voteColor, fontSize: '0.85rem' }}>
                            {voteLabel}
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: '600', color: '#94a3b8', fontSize: '0.85rem' }}>
                            {resultDisplay}
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                            <button
                              onClick={() => navigate(`/dispute/${d.dispute_id}`)}
                              style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '0.4rem 0.85rem',
                                color: '#fff',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s ease'
                              }}
                              className="hover-bright"
                            >
                              <Eye size={14} />
                              Xem chi tiết
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reward/Penalty Summary */}
            {jurorDisputes.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Tổng vụ được gán</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>{jurorDisputes.length}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Đã bỏ phiếu</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fbbf24' }}>{jurorDisputes.filter((d: any) => d.has_committed).length}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Đã hoàn tất</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#34d399' }}>{jurorDisputes.filter((d: any) => d.phase === 'RESOLVED').length}</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Reputation;
