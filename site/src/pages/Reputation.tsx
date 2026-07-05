import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { API_URL } from '../config/contracts';
import { formatAddress } from '../utils/formatters';
import { Award, ShieldCheck, Trophy, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Filter top 5 jurors
  const activeJurors = users.filter(u => u.juror_eligible).slice(0, 5);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy size={20} style={{ color: '#fbbf24' }} />; // Gold
    if (rank === 2) return <Trophy size={20} style={{ color: '#cbd5e1' }} />; // Silver
    if (rank === 3) return <Trophy size={20} style={{ color: '#b45309' }} />; // Bronze
    return <span style={{ color: '#64748b', fontWeight: 'bold' }}>#{rank}</span>;
  };

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
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '1.5rem 2rem', marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} style={{ color: '#818cf8' }} />
            Danh sách 5 Trọng Tài (Jurors) Hiện Tại
          </h3>
          {activeJurors.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '14px' }}>
              <AlertCircle size={20} />
              <span>Chưa có người dùng nào đủ điều kiện làm Juror (Yêu cầu: điểm uy tín $\ge 50$ và đã stake $\ge 500$ ADF). Giao dịch tranh chấp sẽ được xử lý bởi quản trị viên.</span>
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

        {/* Leaderboard Table Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Bảng Điểm Uy Tín</h3>
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

      </div>
    </Layout>
  );
};

export default Reputation;
