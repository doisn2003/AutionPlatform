import React from 'react';
import Layout from '../../components/layout/Layout';
import { 
  Gem, 
  Watch, 
  Image, 
  Palette, 
  Gamepad2, 
  Globe, 
  Car, 
  FileText, 
  Flame, 
  Coins, 
  Zap, 
  Award, 
  Clock,
  TrendingUp,
  UserCheck
} from 'lucide-react';

// Mock Data with Lucide Icons
const LIVE_AUCTIONS = [
  {
    id: 42,
    title: "Đồng hồ Omega Seamaster 1960",
    type: "PHYSICAL",
    category: "Đồng hồ",
    image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=600",
    currentBid: "520 ADF",
    timeLeft: "02:14:55",
    bidCount: 14,
    rating: "9.8"
  },
  {
    id: 43,
    title: "Nhẫn kim cương thiên nhiên 1.5 Carat",
    type: "PHYSICAL",
    category: "Kim cương & Đá quý",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600",
    currentBid: "1,250 ADF",
    timeLeft: "05:40:12",
    bidCount: 8,
    rating: "9.9"
  },
  {
    id: 44,
    title: "Tranh sơn dầu: Hoàng hôn bên vịnh",
    type: "PHYSICAL",
    category: "Tranh vẽ",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=600",
    currentBid: "310 ADF",
    timeLeft: "12:05:00",
    bidCount: 6,
    rating: "9.5"
  }
];

const CATEGORIES = [
  { name: "Kim cương & Đá quý", count: 12, icon: Gem, type: "PHYSICAL" },
  { name: "Đồng hồ cổ", count: 8, icon: Watch, type: "PHYSICAL" },
  { name: "Tranh tác phẩm", count: 15, icon: Image, type: "PHYSICAL" },
  { name: "Ảnh Nghệ thuật NFT", count: 32, icon: Palette, type: "DIGITAL" },
  { name: "Vật phẩm Game", count: 48, icon: Gamepad2, type: "DIGITAL" },
  { name: "Tên miền số", count: 19, icon: Globe, type: "DIGITAL" }
];

const UPCOMING_EVENTS = [
  { title: "Siêu xe Vintage Mustang 1967", startIn: "1 ngày 4 giờ", icon: Car, minBid: "15,000 ADF" },
  { title: "Chứng chỉ số sáng lập ADF", startIn: "2 ngày 8 giờ", icon: FileText, minBid: "500 ADF" }
];

const LEADERBOARD = [
  { rank: 1, name: "DisputeMaster", address: "0x3a4f...7b89", reputation: "192.40", stake: "2,500 ADF" },
  { rank: 2, name: "JurorPro_01", address: "0x9876...5432", reputation: "185.50", stake: "1,200 ADF" },
  { rank: 3, name: "Alice_Bidder", address: "0xabcd...ef01", reputation: "120.10", stake: "500 ADF" }
];

const MockHome: React.FC = () => {
  return (
    <Layout>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '100px 20px 40px 20px', color: '#e1e3e4' }}>
        
        {/* TOP STATUS BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '15px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', gap: '25px', fontSize: '0.9rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} color="#e94560" />
              <span>Hoạt động: <span style={{ color: '#f2ca50', fontWeight: 'bold' }}>3 Phiên Live</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={16} color="#00e3fd" />
              <span>Tổng quỹ Juror: <span style={{ color: '#00e3fd', fontWeight: 'bold' }}>42,500 ADF</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#10b981" />
              <span>Giá ADF: <span style={{ color: '#10b981', fontWeight: 'bold' }}>0.0000121 ETH</span></span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#99907c' }}>Ví của bạn</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'monospace' }}>0xabcd...ef01 (Alice)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 15px', background: 'rgba(242, 202, 80, 0.08)', border: '1px solid rgba(242, 202, 80, 0.3)', borderRadius: '20px', color: '#f2ca50', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <Award size={14} />
              <span>Uy tín: 120.10</span>
            </div>
          </div>
        </div>

        {/* HERO SECTION */}
        <div className="glass-panel" style={{ padding: '40px', marginBottom: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, marginBottom: '15px', letterSpacing: '0.05em' }}>SÀN ĐẤU GIÁ VẬT PHẨM TỰ DO PHI TẬP TRUNG</h1>
          <p style={{ color: '#b5b2b3', maxWidth: '800px', marginBottom: '25px', fontSize: '1.1rem' }}>
            Nền tảng đầu tiên tích hợp bảo vệ bàn giao vật lý ngoài chuỗi thông qua Lý thuyết trò chơi và Bồi thẩm đoàn bỏ phiếu phi tập trung. An sau tuyệt đối, minh bạch hoàn toàn.
          </p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <a href="/mock-auction" className="btn btn-primary">Khám Phá Phòng Đấu Giá</a>
            <a href="/mint" className="btn btn-outline">Số hóa tài sản (NFT)</a>
          </div>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* LEFT: LIVE AUCTIONS */}
          <div className="glass-panel" style={{ padding: '25px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#f2ca50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                Phiên Đấu Giá Đang Diễn Ra
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#99907c' }}>Bento Box 1</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {LIVE_AUCTIONS.map(item => (
                <div key={item.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s' }}>
                  <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                    <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(233, 69, 96, 0.85)', color: '#fff', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                      {item.type}
                    </span>
                    <span style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(10,10,11,0.75)', border: '1px solid rgba(255,255,255,0.08)', color: '#00e3fd', fontFamily: 'monospace', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(4px)' }}>
                      <Clock size={12} />
                      {item.timeLeft}
                    </span>
                  </div>
                  <div style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#99907c', textTransform: 'uppercase', marginBottom: '5px' }}>{item.category}</div>
                    <h3 style={{ fontSize: '1rem', height: '48px', overflow: 'hidden', textTransform: 'none', fontWeight: 600, color: '#e1e3e4', marginBottom: '15px' }}>{item.title}</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#99907c' }}>Giá hiện tại</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f2ca50', fontFamily: 'monospace' }}>{item.currentBid}</div>
                      </div>
                      <a href="/mock-auction" className="btn btn-primary btn-sm" style={{ padding: '6px 12px' }}>ĐẤU GIÁ</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: COLUMN WITH BENTO BOXES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CATEGORIES BOX */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#00e3fd' }}>Danh Mục Tài Sản</h3>
                <span style={{ fontSize: '0.7rem', color: '#99907c' }}>Bento Box 2</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {CATEGORIES.map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Icon size={18} color={cat.type === 'PHYSICAL' ? '#00e3fd' : '#f2ca50'} />
                        <span style={{ fontSize: '0.65rem', padding: '2px 4px', background: cat.type === 'PHYSICAL' ? 'rgba(0, 227, 253, 0.1)' : 'rgba(242, 202, 80, 0.1)', color: cat.type === 'PHYSICAL' ? '#00e3fd' : '#f2ca50', borderRadius: '3px', fontWeight: 'bold' }}>{cat.type}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#99907c' }}>{cat.count} vật phẩm</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* UPCOMING EVENTS */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#f2ca50' }}>Sự Kiện Sắp Diễn Ra</h3>
                <span style={{ fontSize: '0.7rem', color: '#99907c' }}>Bento Box 3</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {UPCOMING_EVENTS.map((event, i) => {
                  const Icon = event.icon;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: '40px', height: '40px', background: 'rgba(242, 202, 80, 0.04)', border: '1px solid rgba(242, 202, 80, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color="#f2ca50" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#99907c' }}>Giá sàn: {event.minBid}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 'bold' }}>{event.startIn}</div>
                        <div style={{ fontSize: '0.6rem', color: '#99907c' }}>Bắt đầu</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEADERBOARD */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#bdf4ff' }}>Bảng Xếp Hạng Uy Tín</h3>
                <span style={{ fontSize: '0.7rem', color: '#99907c' }}>Bento Box 4</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {LEADERBOARD.map((user, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: i === 0 ? '#f2ca50' : i === 1 ? '#d0cdcf' : '#99907c', fontWeight: 'bold', width: '15px' }}>{user.rank}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{user.name}</span>
                          {i === 0 && <UserCheck size={12} color="#10b981" />}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#99907c', fontFamily: 'monospace' }}>{user.address}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#f2ca50', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <TrendingUp size={12} />
                        <span>{user.reputation}</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#99907c' }}>Stake: {user.stake}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </Layout>
  );
};

export default MockHome;
