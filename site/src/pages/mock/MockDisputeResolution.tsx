import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { 
  Scale, 
  FolderOpen, 
  Video, 
  Receipt, 
  ClipboardList, 
  Lightbulb, 
  Gift, 
  XCircle, 
  Circle, 
  Shield, 
  Bell, 
  Clock
} from 'lucide-react';

const MockDisputeResolution: React.FC = () => {
  const [selectedVote, setSelectedVote] = useState('1'); // 1: Buyer, 2: Seller, 0: Abstain
  const [salt, setSalt] = useState('secret_salt_123');

  const handleRevealVote = () => {
    const voteText = selectedVote === '1' ? "Người mua thắng" : selectedVote === '2' ? "Người bán thắng" : "Bỏ phiếu trắng (Abstain)";
    alert(`Đã gửi giao dịch mở khoá (Reveal Vote) thành công!\nLựa chọn: ${voteText}\nKhóa Salt: ${salt}`);
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '100px 20px 40px 20px', color: '#e1e3e4' }}>
        
        {/* HEADER AREA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <Scale size={18} color="#ffb4ab" />
              <span style={{ color: '#ffb4ab', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.05em' }}>TÒA ÁN PHÂN XỬ PHI THẬP TRUNG</span>
              <span style={{ color: '#99907c', fontSize: '0.85rem' }}>| Tranh chấp #01</span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '0.01em', textTransform: 'none' }}>
              Phiên đấu giá #42: Đồng hồ Omega Seamaster 1960
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#99907c' }}>👨‍⚖️ Vai trò bồi thẩm viên</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>0x9876...5432 (JurorMaster)</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', height: '30px' }}></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#99907c' }}>🏅 Điểm uy tín</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f2ca50' }}>185.50 (#2 hệ thống)</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', height: '30px' }}></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#99907c' }}>💰 Lượng stake</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#00e3fd' }}>1,200 ADF</div>
            </div>
          </div>
        </div>

        {/* EVIDENCE SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          
          {/* BUYER EVIDENCE */}
          <div className="glass-panel" style={{ padding: '25px', borderRadius: '16px', borderTop: '3px solid #ffb4ab' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={16} color="#ffb4ab" />
                <h2 style={{ fontSize: '1.1rem', color: '#ffb4ab' }}>Bằng chứng Người mua (Alice)</h2>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#99907c' }}>Nộp 3 ngày trước</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#c8c6c7' }}>
                "Tôi đã nhận được kiện hàng từ bưu tá vào trưa ngày 28/06. Khi mở hộp, chiếc đồng hồ bên trong có nhiều đặc điểm bất thường: kim giây không trôi mượt mà nhảy từng giây (máy pin quartz chứ không phải máy cơ tự động Caliber 562), mặt kính bị trầy xước nặng, và khối lượng đồng hồ nhẹ hơn nhiều so với thông số của vỏ vàng đúc. Tôi nghi ngờ người bán đã gửi hàng giả. Video quay unboxing mở hộp còn nguyên seal dán từ đơn vị vận chuyển."
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <img src="https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=200" alt="Evidence 1" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} />
                <div style={{ fontSize: '0.7rem', color: '#99907c', textAlign: 'center', marginTop: '5px' }}>Ảnh chi tiết lỗi</div>
              </div>
              <div style={{ flex: 1 }}>
                <img src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=200" alt="Evidence 2" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} />
                <div style={{ fontSize: '0.7rem', color: '#99907c', textAlign: 'center', marginTop: '5px' }}>Ảnh cân đo thực tế</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Video size={18} color="#00e3fd" />
                <span style={{ fontSize: '0.7rem', color: '#00e3fd', marginTop: '5px' }}>Xem video.mp4</span>
              </div>
            </div>
          </div>

          {/* SELLER EVIDENCE */}
          <div className="glass-panel" style={{ padding: '25px', borderRadius: '16px', borderTop: '3px solid #bdf4ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={16} color="#bdf4ff" />
                <h2 style={{ fontSize: '1.1rem', color: '#bdf4ff' }}>Bằng chứng Người bán (Bob)</h2>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#99907c' }}>Nộp 2 ngày trước</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#c8c6c7' }}>
                "Tôi đã kiểm tra kỹ và đóng gói chiếc đồng hồ cơ cổ Omega Seamaster vàng đúc đúng như trong NFT mô tả. Quá trình kiểm định, đóng hộp và giao cho bưu tá DHL đều có camera giám sát của cửa hàng ghi lại rõ nét. Khối lượng gói hàng gửi đi được ghi nhận trên biên lai gửi của DHL là 350g. Rất có thể kiện hàng đã bị đánh tráo nội dung trong quá trình vận chuyển của bên bưu cục hoặc người mua cố tình tráo hàng giả vào để đòi hoàn tiền."
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <img src="https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=200" alt="Evidence 1" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} />
                <div style={{ fontSize: '0.7rem', color: '#99907c', textAlign: 'center', marginTop: '5px' }}>Ảnh trước khi đóng</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '10px' }}>
                <Receipt size={18} color="#00e3fd" />
                <span style={{ fontSize: '0.7rem', color: '#00e3fd', marginTop: '5px', textAlign: 'center' }}>Biên lai DHL.pdf</span>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Video size={18} color="#00e3fd" />
                <span style={{ fontSize: '0.7rem', color: '#00e3fd', marginTop: '5px' }}>Video đóng gói.mp4</span>
              </div>
            </div>
          </div>

        </div>

        {/* JUROR VOTING PANEL */}
        <div className="glass-panel" style={{ padding: '30px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(242, 202, 80, 0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(242, 202, 80, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} color="#f2ca50" />
                <h2 style={{ fontSize: '1.2rem', color: '#f2ca50' }}>Tiến Trình Bỏ Phiếu (Commit-Reveal)</h2>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#99907c', marginTop: '5px' }}>
                Giai đoạn hiện tại: <span style={{ color: '#00e3fd', fontWeight: 'bold' }}>REVEAL (Công khai phiếu bầu)</span>. Giai đoạn Commit đã hoàn thành.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '5px 12px', borderRadius: '4px', fontSize: '0.8rem', color: '#00e3fd', fontFamily: 'monospace' }}>
              <Clock size={12} />
              <span>Reveal kết thúc trong: 18 giờ 40 phút</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
            
            {/* VOTE INPUT FORM */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px', color: '#bdf4ff' }}>Lựa chọn phán quyết của bạn:</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', background: selectedVote === '1' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0,0,0,0.15)', border: selectedVote === '1' ? '1px solid #f2ca50' : '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="dispute-vote" value="1" checked={selectedVote === '1'} onChange={() => setSelectedVote('1')} />
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#ffb4ab' }}>Hoàn trả tiền cho Người mua (Alice)</span>
                    <span style={{ fontSize: '0.75rem', color: '#99907c', display: 'block', marginTop: '2px' }}>Chuyển trả NFT đồng hồ về ví của Người bán (Bob)</span>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', background: selectedVote === '2' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0,0,0,0.15)', border: selectedVote === '2' ? '1px solid #f2ca50' : '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="dispute-vote" value="2" checked={selectedVote === '2'} onChange={() => setSelectedVote('2')} />
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#bdf4ff' }}>Giải phóng tiền cho Người bán (Bob)</span>
                    <span style={{ fontSize: '0.75rem', color: '#99907c', display: 'block', marginTop: '2px' }}>Chuyển nhượng quyền sở hữu NFT sang ví của Người mua (Alice)</span>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', background: selectedVote === '0' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0,0,0,0.15)', border: selectedVote === '0' ? '1px solid #f2ca50' : '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="dispute-vote" value="0" checked={selectedVote === '0'} onChange={() => setSelectedVote('0')} />
                  <div>
                    <span style={{ fontWeight: 'bold' }}>Bỏ phiếu trắng (Abstain)</span>
                    <span style={{ fontSize: '0.75rem', color: '#99907c', display: 'block', marginTop: '2px' }}>Không phân định thắng thua, không chịu thưởng phạt tài chính</span>
                  </div>
                </label>
              </div>

              {/* SALT AND SUBMIT */}
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#99907c', display: 'block', marginBottom: '8px' }}>Khóa mật mã cá nhân (Salt)</label>
                  <input 
                    type="text" 
                    value={salt} 
                    onChange={(e) => setSalt(e.target.value)} 
                    placeholder="Nhập khóa salt đã dùng lúc commit..." 
                    style={{ width: '100%', padding: '10px 15px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none' }} 
                  />
                </div>
                <button onClick={handleRevealVote} className="btn btn-primary" style={{ padding: '12px 30px', height: '40px' }}>⚖️ REVEAL VOTE</button>
              </div>
            </div>

            {/* RULES AND REWARDS DESCRIPTION */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f2ca50' }}>
                <Lightbulb size={16} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>Quy Tắc Kinh Tế Học Token</h3>
              </div>
              
              <ul style={{ paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '10px', color: '#c8c6c7', lineHeight: '1.5' }}>
                <li style={{ listStyleType: 'none', position: 'relative', paddingLeft: '15px' }}>
                  <Gift size={12} color="#10b981" style={{ position: 'absolute', left: 0, top: '4px' }} />
                  <span><span style={{ color: '#10b981', fontWeight: 'bold' }}>Bỏ phiếu đúng</span> theo kết quả đa số: Nhận thưởng <span style={{ fontWeight: 'bold', color: '#10b981' }}>+50 ADF</span> trích xuất tự động từ Pool AMM.</span>
                </li>
                <li style={{ listStyleType: 'none', position: 'relative', paddingLeft: '15px' }}>
                  <XCircle size={12} color="#ffb4ab" style={{ position: 'absolute', left: 0, top: '4px' }} />
                  <span><span style={{ color: '#ffb4ab', fontWeight: 'bold' }}>Bỏ phiếu sai</span> ngược kết quả đa số: Bị phạt trừ <span style={{ fontWeight: 'bold', color: '#ffb4ab' }}>-100 ADF</span> vào ví ký quỹ stake của bạn.</span>
                </li>
                <li style={{ listStyleType: 'none', position: 'relative', paddingLeft: '15px' }}>
                  <Circle size={12} color="#99907c" style={{ position: 'absolute', left: 0, top: '4px' }} />
                  <span><span style={{ color: '#e1e3e4', fontWeight: 'bold' }}>Bỏ phiếu trắng (Abstain)</span>: Nhận <span style={{ fontWeight: 'bold' }}>0 ADF</span> (không thưởng, không phạt).</span>
                </li>
                <li style={{ listStyleType: 'none', position: 'relative', paddingLeft: '15px' }}>
                  <Shield size={12} color="#00e3fd" style={{ position: 'absolute', left: 0, top: '4px' }} />
                  <span>Người dùng hoàn toàn <span style={{ color: '#00e3fd' }}>không tốn phí dịch vụ phân xử</span>, chỉ chịu phí gas blockchain.</span>
                </li>
              </ul>
              
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(242, 202, 80, 0.05)', border: '1px solid rgba(242, 202, 80, 0.1)', padding: '12px', borderRadius: '8px', color: '#f2ca50', fontSize: '0.8rem' }}>
                <Bell size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><span style={{ fontWeight: 'bold' }}>Lưu ý:</span> Khóa salt nhập vào phải khớp chính xác với mã hash đã gửi ở giai đoạn commit. Nếu không khớp hoặc không gửi reveal, phiếu sẽ bị tính là trắng (Abstain).</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </Layout>
  );
};

export default MockDisputeResolution;
