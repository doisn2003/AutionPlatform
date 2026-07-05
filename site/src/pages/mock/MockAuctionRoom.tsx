import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { useBid } from '../../hooks/useContractActions';
import { parseUnits } from 'viem';
import { 
  Clock, 
  Scale, 
  Eye, 
  Award, 
  AlertTriangle,
  MessageSquare,
  Send
} from 'lucide-react';

const MockAuctionRoom: React.FC = () => {
  const [bidAmount, setBidAmount] = useState('530');
  const [chatMessages, setChatMessages] = useState([
    { user: "Bob (Seller)", text: "Xin chào mọi người, đồng hồ này mình được thừa kế, đảm bảo nguyên bản 100%, có đủ giấy tờ của hãng.", time: "15:20" },
    { user: "Charlie", text: "IPFS metadata check thấy điểm giám định là 9.8, uy tín thật.", time: "15:21" },
    { user: "Alice", text: "Mình đã đặt giá thầu 520 ADF rồi nhé, hy vọng thắng cuộc.", time: "15:22" },
    { user: "David", text: "Còn hơn 2 tiếng nữa, kịch tính đây. Giá này vẫn còn khá rẻ cho một chiếc Seamaster cổ.", time: "15:23" },
    { user: "Hệ thống", text: "Alice (0xabcd...) đã đặt giá thầu dẫn đầu: 520 ADF.", time: "15:23", isSystem: true }
  ]);
  const [myMessage, setMyMessage] = useState('');

  const { bid, hash, isPending, isConfirming, isConfirmed, error } = useBid();

  useEffect(() => {
    if (isConfirmed && hash) {
      setChatMessages(prev => [
        ...prev,
        { user: "Hệ thống", text: `Giao dịch thành công! Bạn (Alice) đã đấu giá thành công: ${bidAmount} ADF. TxHash: ${hash.substring(0, 10)}...`, time: "Vừa xong", isSystem: true }
      ]);
    }
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (error) {
      setChatMessages(prev => [
        ...prev,
        { user: "Hệ thống", text: `Lỗi giao dịch: ${error.message.substring(0, 80)}...`, time: "Vừa xong", isSystem: true }
      ]);
    }
  }, [error]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMessage.trim()) return;
    setChatMessages([
      ...chatMessages,
      { user: "Bạn (Alice)", text: myMessage, time: "Just now" }
    ]);
    setMyMessage('');
  };

  const handlePlaceBid = () => {
    try {
      const parsedAmount = parseUnits(bidAmount, 18);
      bid(42n, parsedAmount);
    } catch (err) {
      alert("Lỗi nhập số lượng thầu: " + (err as Error).message);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '100px 20px 40px 20px', color: '#e1e3e4' }}>
        
        {/* ROOM HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ width: '8px', height: '8px', background: '#e94560', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
              <span style={{ color: '#e94560', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.05em' }}>PHÒNG ĐẤU GIÁ TRỰC TIẾP</span>
              <span style={{ color: '#99907c', fontSize: '0.85rem' }}>| Phiên đấu giá #42</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '0.01em', textTransform: 'none' }}>
              Đồng hồ Omega Seamaster 1960
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#99907c', display: 'block', marginBottom: '6px' }}>Cơ chế bảo vệ bàn giao</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '4px', color: '#00e3fd', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <Scale size={14} />
              <span>BỒI THẨM ĐOÀN (JURY VOTING)</span>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '30px' }}>
          
          {/* LEFT: IMAGE AND LIVE INDICATOR */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <img src="https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=600" alt="Omega Watch" style={{ width: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', gap: '8px' }}>
                <span style={{ background: '#e94560', color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>LIVE</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(10,10,11,0.75)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: '#00e3fd', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px' }}>
                  <Eye size={12} />
                  <span>28 người xem</span>
                </span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ padding: '15px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '0.75rem', color: '#99907c' }}>Người bán</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#00e3fd', fontFamily: 'monospace' }}>0x1234...5678 (Bob)</div>
                <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={12} />
                  <span>Uy tín người bán: 145.20</span>
                </div>
              </div>
              <div style={{ padding: '15px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '0.75rem', color: '#99907c' }}>Hợp đồng Escrow</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f2ca50', fontFamily: 'monospace' }}>0x5555...6666</div>
                <div style={{ fontSize: '0.7rem', color: '#99907c', marginTop: '3px' }}>Trạng thái: Đang giữ cọc</div>
              </div>
            </div>
          </div>

          {/* RIGHT: COUNTDOWN, BID ACTION, CHAT BOX */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* COUNTDOWN & CURRENT BID */}
            <div className="glass-panel" style={{ padding: '25px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                
                {/* TIMER DISPLAY */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#99907c', textTransform: 'uppercase', marginBottom: '8px' }}>
                    <Clock size={12} />
                    <span>Thời gian còn lại</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', color: '#f2ca50', background: 'rgba(242, 202, 80, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(242, 202, 80, 0.1)' }}>
                      02
                    </div>
                    <span style={{ fontSize: '1.5rem', color: '#99907c', fontWeight: 'bold' }}>:</span>
                    <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', color: '#f2ca50', background: 'rgba(242, 202, 80, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(242, 202, 80, 0.1)' }}>
                      14
                    </div>
                    <span style={{ fontSize: '1.5rem', color: '#99907c', fontWeight: 'bold' }}>:</span>
                    <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', color: '#f2ca50', background: 'rgba(242, 202, 80, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(242, 202, 80, 0.1)' }}>
                      55
                    </div>
                  </div>
                </div>

                {/* CURRENT BID INFO */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#99907c', textTransform: 'uppercase', marginBottom: '8px' }}>Giá dẫn đầu hiện tại</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#00e3fd', fontFamily: 'monospace' }}>
                    520 <span style={{ fontSize: '1.1rem', color: '#99907c' }}>ADF</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Bởi ví: 0xabcd...ef01</div>
                </div>

              </div>
              
              {/* BID ACTION AREA */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '20px', paddingTop: '20px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type="number" 
                      value={bidAmount} 
                      onChange={(e) => setBidAmount(e.target.value)} 
                      disabled={isPending || isConfirming}
                      style={{ width: '100%', padding: '12px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '1.1rem', fontFamily: 'monospace', outline: 'none' }} 
                    />
                    <span style={{ position: 'absolute', right: '18px', top: '14px', fontSize: '0.9rem', color: '#99907c', fontFamily: 'monospace' }}>ADF</span>
                  </div>
                  <button 
                    onClick={handlePlaceBid} 
                    disabled={isPending || isConfirming}
                    className="btn btn-primary" 
                    style={{ padding: '0 35px' }}
                  >
                    {isPending ? 'Đang Ký Ví...' : isConfirming ? 'Đang Xác Thực...' : 'ĐẤU GIÁ'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75rem', color: '#99907c' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} color="#f59e0b" />
                    <span>Bước giá tối thiểu: +10 ADF (Nhập ≥ 530 ADF)</span>
                  </span>
                  <span>Số dư khả dụng: <span style={{ color: '#f2ca50', fontWeight: 'bold' }}>1,500 ADF</span></span>
                </div>
              </div>

            </div>

            {/* REAL-TIME CHAT BOX */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '330px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#bdf4ff' }}>
                  <MessageSquare size={14} />
                  <h3 style={{ fontSize: '0.9rem' }}>Kênh Thảo Luận Thời Gian Thực</h3>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#10b981' }}>● Đã kết nối WebSockets</span>
              </div>

              {/* MESSAGES LIST */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px', marginBottom: '15px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', background: msg.isSystem ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)', border: msg.isSystem ? '1px solid rgba(16, 185, 129, 0.15)' : 'none', borderRadius: '8px', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 'bold', color: msg.isSystem ? '#10b981' : msg.user.startsWith('Bạn') ? '#f2ca50' : '#bdf4ff' }}>
                        {msg.user}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#99907c' }}>{msg.time}</span>
                    </div>
                    <div style={{ color: '#e1e3e4', lineHeight: '1.4' }}>{msg.text}</div>
                  </div>
                ))}
              </div>

              {/* CHAT INPUT FORM */}
              <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={myMessage} 
                  onChange={(e) => setMyMessage(e.target.value)} 
                  placeholder="Nhập tin nhắn của bạn..." 
                  style={{ flex: 1, padding: '10px 15px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', color: '#fff', fontSize: '0.85rem', outline: 'none' }} 
                />
                <button type="submit" className="btn btn-outline btn-sm" style={{ padding: '0 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Gửi</span>
                  <Send size={10} />
                </button>
              </form>

            </div>

          </div>

        </div>

      </div>
    </Layout>
  );
};

export default MockAuctionRoom;
