import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Layout from '../components/layout/Layout';
import { API_URL } from '../config/contracts';
import { 
  User, Mail, Globe, Award, ShieldAlert, CheckCircle, 
  Coins, Plus, Save, TrendingUp, HelpCircle 
} from 'lucide-react';
import '../styles/style.css';

interface UserProfile {
  wallet_address: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  social_links: { twitter?: string; telegram?: string; website?: string };
  is_verified: boolean;
  kyc_status: string;
  total_auctions_created: number;
  total_bids_placed: number;
  total_bids_won: number;
  total_nfts_minted: number;
  total_disputes_filed: number;
  total_disputes_won: number;
  total_disputes_lost: number;
  successful_deliveries: number;
  adf_staked_for_juror: string; // in wei
  reputation_score: string;
  juror_eligible: boolean;
}

const Profile: React.FC = () => {
  const { address, isConnected } = useAccount();

  // Profile data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [website, setWebsite] = useState('');

  // Staking simulator states
  const [stakeAmount, setStakeAmount] = useState('500');
  const [isStaking, setIsStaking] = useState(false);

  // Success/error messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfile = async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/profile/${address}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data as UserProfile;
        setProfile(data);
        
        // Fill form
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
        setEmail(data.email || '');
        setTwitter(data.social_links?.twitter || '');
        setTelegram(data.social_links?.telegram || '');
        setWebsite(data.social_links?.website || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchProfile();
    }
  }, [isConnected, address]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      setIsSaving(true);
      setMessage(null);
      
      const payload = {
        walletAddress: address,
        displayName,
        bio,
        avatarUrl,
        email,
        socialLinks: { twitter, telegram, website }
      };

      const res = await fetch(`${API_URL}/api/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        setProfile(json.data);
        setMessage({ type: 'success', text: 'Hồ sơ đã được lưu thành công!' });
      } else {
        setMessage({ type: 'error', text: 'Cập nhật hồ sơ thất bại.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMockStake = async () => {
    if (!address) return;
    if (isNaN(Number(stakeAmount)) || Number(stakeAmount) < 0) {
      alert('Vui lòng nhập số lượng ADF hợp lệ.');
      return;
    }

    try {
      setIsStaking(true);
      const res = await fetch(`${API_URL}/api/profile/mock-stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: address,
          amount: Number(stakeAmount)
        })
      });

      if (res.ok) {
        const json = await res.json();
        setProfile(json.data);
        alert(`🎉 Giả lập Stake ${stakeAmount} ADF thành công! Điểm uy tín và trạng thái Juror đã được cập nhật.`);
      } else {
        alert('Giả lập stake thất bại.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối API.');
    } finally {
      setIsStaking(false);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Helper values
  const reputation = profile ? parseFloat(profile.reputation_score) : 0;
  const stakedADF = profile ? parseFloat(profile.adf_staked_for_juror) / 1e18 : 0;
  const bidsPlaced = profile ? profile.total_bids_placed : 0;
  const disputesLost = profile ? profile.total_disputes_lost : 0;

  // Requirements checklist
  const reqRep = reputation >= 50;
  const reqStake = stakedADF >= 500;
  const reqRecord = disputesLost === 0;
  const reqBids = bidsPlaced >= 5;
  const isEligible = reqRep && reqStake && reqRecord && reqBids;

  return (
    <Layout>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            👤 Hồ Sơ & Uy Tín Người Dùng
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Quản lý hồ sơ cá nhân đấu giá và theo dõi trạng thái tư cách Trọng tài (Juror)
          </p>
        </div>

        {!isConnected ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <User size={48} style={{ marginBottom: '1rem', color: '#818cf8' }} />
            <h3>Kết nối ví MetaMask của bạn</h3>
            <p style={{ marginTop: '0.5rem' }}>Hãy kết nối ví của bạn để tạo hoặc xem hồ sơ cá nhân.</p>
          </div>
        ) : isLoading && !profile ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <div className="spin-anim" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', borderRadius: '50%' }}></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            
            {/* Column 1: Profile Edit Form */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} style={{ color: '#818cf8' }} />
                Thông Tin Cá Nhân
              </h3>

              {message && (
                <div style={{ 
                  background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(244, 63, 94, 0.1)', 
                  border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`, 
                  color: message.type === 'success' ? '#22c55e' : '#f43f5e', 
                  borderRadius: '12px', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.875rem' 
                }}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>Tên hiển thị</label>
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>Địa chỉ Email (Nhận thông báo)</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>Ảnh đại diện (Avatar URL)</label>
                  <input 
                    type="text" 
                    value={avatarUrl} 
                    onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>Tiểu sử ngắn</label>
                  <textarea 
                    value={bio} 
                    rows={3}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Mô tả ngắn về bạn..."
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', outline: 'none', resize: 'none' }}
                  />
                </div>

                {/* Social links */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Twitter</label>
                    <input 
                      type="text" 
                      value={twitter} 
                      onChange={e => setTwitter(e.target.value)}
                      placeholder="@handle"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Telegram</label>
                    <input 
                      type="text" 
                      value={telegram} 
                      onChange={e => setTelegram(e.target.value)}
                      placeholder="@username"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', border: 'none', color: '#fff', fontWeight: '600', fontSize: '1rem', cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}
                  className="btn-glow"
                >
                  <Save size={18} />
                  {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </form>

              {/* Mock Staking Section for Testing */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Coins size={16} style={{ color: '#fbbf24' }} />
                  Giả Lập Staking ADF (Dành cho thử nghiệm)
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  Mock stake trực tiếp vào database để kiểm thử trạng thái đủ điều kiện làm Juror của ví bạn.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="number" 
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                  />
                  <button 
                    onClick={handleMockStake}
                    disabled={isStaking}
                    style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)', fontWeight: '600', cursor: isStaking ? 'wait' : 'pointer' }}
                    className="hover-bright"
                  >
                    Mock Stake
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Stats & Reputation Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Reputation & Juror Box */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Hạng Tín Nhiệm</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '0.4rem 0.8rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '700' }}>
                    <Award size={18} />
                    <span>{reputation.toFixed(1)} Điểm</span>
                  </div>
                </div>

                {/* Juror Eligibility Banner */}
                {isEligible ? (
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Đủ Điều Kiện Làm Juror!</h4>
                      <p style={{ fontSize: '0.8rem', marginTop: '0.1rem', color: '#4ade80' }}>Bạn nằm trong danh sách xét chọn Top 5 Juror nhận thưởng ADF.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Chưa Đủ Điều Kiện Làm Juror</h4>
                      <p style={{ fontSize: '0.8rem', marginTop: '0.1rem', color: '#fda4af' }}>Hãy hoàn thành đầy đủ các tiêu chí yêu cầu phía dưới.</p>
                    </div>
                  </div>
                )}

                {/* Requirements Checklist */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>Tiêu chí ứng cử viên Juror:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: reqRep ? '#22c55e' : '#64748b' }}>
                    <span>1. Điểm uy tín $\ge 50$ (Hiện tại: {reputation.toFixed(1)})</span>
                    {reqRep ? <CheckCircle size={16} /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #64748b' }}></div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: reqStake ? '#22c55e' : '#64748b' }}>
                    <span>2. Đã ký quỹ $\ge 500$ ADF (Đã stake: {stakedADF} ADF)</span>
                    {reqStake ? <CheckCircle size={16} /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #64748b' }}></div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: reqRecord ? '#22c55e' : '#64748b' }}>
                    <span>3. Không từng thua tranh chấp (Disputes lost: {disputesLost})</span>
                    {reqRecord ? <CheckCircle size={16} /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #64748b' }}></div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: reqBids ? '#22c55e' : '#64748b' }}>
                    <span>4. Đã tham gia $\ge 5$ lượt bid (Hiện tại: {bidsPlaced} lượt)</span>
                    {reqBids ? <CheckCircle size={16} /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #64748b' }}></div>}
                  </div>
                </div>
              </div>

              {/* Stats Box */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} style={{ color: '#10b981' }} />
                  Thống Kê Hoạt Động
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Tạo Đấu Giá</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginTop: '0.25rem' }}>
                      {profile ? profile.total_auctions_created : 0}
                    </h3>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Lượt Bid</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginTop: '0.25rem' }}>
                      {profile ? profile.total_bids_placed : 0}
                    </h3>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Đúc NFT</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginTop: '0.25rem' }}>
                      {profile ? profile.total_nfts_minted : 0}
                    </h3>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Giao Hàng Thành Công</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981', marginTop: '0.25rem' }}>
                      {profile ? profile.successful_deliveries : 0}
                    </h3>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Tranh Chấp Thắng</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22c55e', marginTop: '0.25rem' }}>
                      {profile ? profile.total_disputes_won : 0}
                    </h3>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Tranh Chấp Thua</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444', marginTop: '0.25rem' }}>
                      {profile ? profile.total_disputes_lost : 0}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
};

export default Profile;
