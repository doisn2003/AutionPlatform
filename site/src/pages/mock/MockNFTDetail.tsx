import React from 'react';
import Layout from '../../components/layout/Layout';
import { 
  Package, 
  CheckCircle, 
  MapPin, 
  Award, 
  Clock, 
  ShieldCheck,
  History,
  ArrowRight
} from 'lucide-react';

const MockNFTDetail: React.FC = () => {
  const nft = {
    title: "Đồng hồ Omega Seamaster 1960",
    id: 42,
    image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=600",
    owner: "Bob (0x1234...5678)",
    creator: "Obsidian Certifier (0x8888...1111)",
    contract: "0x7777...2222 (ADF_NFT)",
    tokenId: "42",
    tokenStandard: "ERC-721",
    blockchain: "Ethereum Sepolia",
    ipfsUri: "ipfs://QmXyZ...vW3a/42.json",
    description: "Mã thông báo NFT đại diện cho quyền sở hữu hợp pháp đối với chiếc đồng hồ cổ Omega Seamaster sản xuất năm 1960. Thân vỏ bằng vàng đúc 18k nguyên bản, mặt số cơ học tự động Caliber 562. Vật phẩm đã được giám định trực tiếp và niêm phong bảo quản bởi Obsidian Certifier trước khi đúc NFT.",
    verificationScore: "9.8 / 10",
    physicalLocation: "Hà Nội, Việt Nam"
  };

  const bidHistory = [
    { bidder: "Alice (0xabcd...ef01)", amount: "520 ADF", time: "10 phút trước", status: "Dẫn đầu" },
    { bidder: "David (0x2222...8888)", amount: "510 ADF", time: "25 phút trước", status: "Vượt qua" },
    { bidder: "Charlie (0x3333...9999)", amount: "490 ADF", time: "1 giờ trước", status: "Vượt qua" },
    { bidder: "Eve (0x4444...aaaa)", amount: "450 ADF", time: "3 giờ trước", status: "Vượt qua" }
  ];

  return (
    <Layout>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '100px 20px 40px 20px', color: '#e1e3e4' }}>
        
        {/* BREADCRUMB */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#99907c', marginBottom: '25px' }}>
          <span>TẤT CẢ VẬT PHẨM</span>
          <ArrowRight size={10} />
          <span>TÀI SẢN VẬT LÝ</span>
          <ArrowRight size={10} />
          <span>ĐỒNG HỒ CỔ</span>
          <ArrowRight size={10} />
          <span style={{ color: '#f2ca50' }}>{nft.title}</span>
        </div>

        {/* MAIN SPLIT LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '40px' }}>
          
          {/* LEFT: NFT IMAGE AND BLOCKCHAIN METADATA */}
          <div>
            {/* IMAGE FRAME WITH SPECULAR GOLD GLOW */}
            <div className="gold-border" style={{ padding: '8px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 0 25px rgba(212, 175, 55, 0.15)' }}>
              <div style={{ background: '#111415', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={nft.image} alt={nft.title} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>

            {/* BLOCKCHAIN METADATA PANEL */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1rem', color: '#bdf4ff', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                Thông Tin Kỹ Thuật (On-chain)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#99907c' }}>Địa chỉ hợp đồng</span>
                  <span style={{ fontFamily: 'monospace', color: '#f2ca50' }}>{nft.contract}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#99907c' }}>Token ID</span>
                  <span style={{ fontFamily: 'monospace' }}>{nft.tokenId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#99907c' }}>Tiêu chuẩn</span>
                  <span>{nft.tokenStandard}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#99907c' }}>Mạng Blockchain</span>
                  <span>{nft.blockchain}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#99907c' }}>IPFS Metadata</span>
                  <a href="#" style={{ fontFamily: 'monospace', color: '#00e3fd', textDecoration: 'underline' }}>{nft.ipfsUri}</a>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DETAILS, DESCRIPTION, BID HISTORY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* TITLE AND DESCRIPTION */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 229, 255, 0.08)', color: '#00e3fd', border: '1px solid rgba(0, 229, 255, 0.2)', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>
                  <Package size={12} />
                  <span>TÀI SẢN VẬT LÝ (PHYSICAL)</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>
                  <CheckCircle size={12} />
                  <span>Đã Giám Định Uy Tín</span>
                </span>
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 300, marginBottom: '20px', letterSpacing: '0.02em', textTransform: 'none' }}>
                {nft.title} <span style={{ color: '#99907c', fontSize: '1.5rem' }}>#{nft.id}</span>
              </h1>
              
              {/* OWNER & CREATOR METRICS */}
              <div style={{ display: 'flex', gap: '30px', marginBottom: '25px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#99907c' }}>Chủ sở hữu hiện tại</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#e1e3e4' }}>{nft.owner}</div>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#99907c' }}>Đơn vị giám định và đúc</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#00e3fd' }}>{nft.creator}</div>
                </div>
              </div>

              {/* DESCRIPTION TEXT */}
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#99907c', marginBottom: '10px', textTransform: 'uppercase' }}>Mô tả tài sản</h4>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#c8c6c7' }}>{nft.description}</p>
                <div style={{ display: 'flex', gap: '30px', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#99907c" />
                    <span>Địa điểm: <span style={{ fontWeight: 'bold', color: '#e1e3e4' }}>{nft.physicalLocation}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="#f2ca50" />
                    <span>Điểm kiểm định: <span style={{ fontWeight: 'bold', color: '#f2ca50' }}>{nft.verificationScore}</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION SECTION */}
            <div className="glass-panel" style={{ padding: '25px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(242, 202, 80, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)', border: '1px solid rgba(242, 202, 80, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#99907c' }}>Trạng thái tài sản</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f2ca50', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={18} color="#10b981" />
                    <span>Có Sẵn Để Đấu Giá</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#99907c' }}>Định giá tối thiểu đề xuất</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'monospace' }}>500 ADF</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <a href="/mock-auction" className="btn btn-primary" style={{ flex: 1 }}>Tạo Phiên Đấu Giá Mới</a>
                <button className="btn btn-outline" style={{ flex: 1 }}>Chuyển Nhượng NFT</button>
              </div>
            </div>

            {/* LỊCH SỬ TRẢ GIÁ MOCK */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <History size={16} color="#00e3fd" />
                <h3 style={{ fontSize: '1rem', color: '#e1e3e4' }}>Lịch Sử Trả Giá Của Phiên Trước</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bidHistory.map((bid, i) => (
                  <div key={i} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '12px', background: i === 0 ? 'rgba(242, 202, 80, 0.03)' : 'rgba(255,255,255,0.01)', border: i === 0 ? '1px solid rgba(242, 202, 80, 0.2)' : '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{bid.bidder}</span>
                      <span style={{ fontSize: '0.75rem', color: '#99907c' }}>{bid.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: i === 0 ? '#f2ca50' : '#e1e3e4' }}>{bid.amount}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: i === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#10b981' : '#99907c', borderRadius: '3px', fontWeight: 'bold' }}>
                        {bid.status}
                      </span>
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

export default MockNFTDetail;
