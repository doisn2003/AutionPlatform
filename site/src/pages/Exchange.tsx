import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import '../styles/style.css';

interface HistoryRecord {
  id: number;
  type: string;
  amount: string;
  target: string;
  time: string;
  status: string;
}

const Exchange: React.FC = () => {
  // Balances State (Simulated)
  const [ethBalance, setEthBalance] = useState<number>(10.50);
  const [adfBalance, setAdfBalance] = useState<number>(5000.00);
  const exchangeRate = 1000; // 1 ETH = 1000 ADF

  // Swap State
  const [swapMode, setSwapMode] = useState<'buy' | 'withdraw'>('buy');
  const [swapInput, setSwapInput] = useState<string>('');
  const [swapOutput, setSwapOutput] = useState<string>('');

  // Transfer State
  const [destAddress, setDestAddress] = useState<string>('');
  const [network, setNetwork] = useState<string>('ADF Testnet');
  const [asset, setAsset] = useState<'ETH' | 'ADF'>('ETH');
  const [transferAmount, setTransferAmount] = useState<string>('');

  // History State
  const [history, setHistory] = useState<HistoryRecord[]>([
    {
      id: 1,
      type: 'Mua ADF',
      amount: '+1,500 ADF',
      target: '0x9a7f...e34d',
      time: '10 phút trước',
      status: 'Hoàn tất',
    },
    {
      id: 2,
      type: 'Chuyển đi',
      amount: '-0.5 ETH',
      target: '0x8a92...a89c',
      time: '2 giờ trước',
      status: 'Hoàn tất',
    },
    {
      id: 3,
      type: 'Rút ETH',
      amount: '-1.2 ETH',
      target: '0x2f8b...c55a',
      time: '1 ngày trước',
      status: 'Hoàn tất',
    },
  ]);

  // Recalculate Swap output when mode or input changes
  useEffect(() => {
    const inputVal = parseFloat(swapInput);
    if (isNaN(inputVal) || inputVal <= 0) {
      setSwapOutput('');
      return;
    }

    if (swapMode === 'buy') {
      setSwapOutput((inputVal * exchangeRate).toFixed(2));
    } else {
      setSwapOutput((inputVal / exchangeRate).toFixed(4));
    }
  }, [swapInput, swapMode]);

  // Mode switching
  const handleSwitchMode = (mode: 'buy' | 'withdraw') => {
    setSwapMode(mode);
    setSwapInput('');
    setSwapOutput('');
  };

  const handleReverseMode = () => {
    handleSwitchMode(swapMode === 'buy' ? 'withdraw' : 'buy');
  };

  // Max fillers
  const handleFillMaxSwap = () => {
    if (swapMode === 'buy') {
      const maxEth = Math.max(0, ethBalance - 0.01); // Gas buffer
      setSwapInput(maxEth.toFixed(4));
    } else {
      setSwapInput(adfBalance.toFixed(2));
    }
  };

  const handleFillMaxTransfer = () => {
    if (asset === 'ETH') {
      setTransferAmount(ethBalance.toFixed(4));
    } else {
      setTransferAmount(adfBalance.toFixed(2));
    }
  };

  // Submit handlers
  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputVal = parseFloat(swapInput);
    const outputVal = parseFloat(swapOutput);

    if (isNaN(inputVal) || inputVal <= 0) {
      alert('❌ Vui lòng nhập số lượng hợp lệ.');
      return;
    }

    if (swapMode === 'buy') {
      const totalCost = inputVal + 0.002;
      if (ethBalance < totalCost) {
        alert('❌ Số dư ví ETH của bạn không đủ (bao gồm cả phí gas).');
        return;
      }

      setEthBalance((prev) => prev - totalCost);
      setAdfBalance((prev) => prev + outputVal);

      // Add to history
      const newRecord: HistoryRecord = {
        id: Date.now(),
        type: 'Mua ADF',
        amount: `+${outputVal.toLocaleString()} ADF`,
        target: '0x5b3c...f12a',
        time: 'Vừa xong',
        status: 'Hoàn tất',
      };
      setHistory((prev) => [newRecord, ...prev]);
      alert(`✨ Giao dịch hoàn tất! Bạn đã đổi ${inputVal} ETH lấy ${outputVal} ADF.`);
    } else {
      if (adfBalance < inputVal) {
        alert('❌ Số dư ví ADF của bạn không đủ.');
        return;
      }
      if (ethBalance < 0.005) {
        alert('❌ Số dư ví ETH không đủ trả phí gas.');
        return;
      }

      setAdfBalance((prev) => prev - inputVal);
      setEthBalance((prev) => prev + (outputVal - 0.005));

      // Add to history
      const newRecord: HistoryRecord = {
        id: Date.now(),
        type: 'Rút ETH',
        amount: `-${inputVal.toLocaleString()} ADF`,
        target: '0x7e1c...a302',
        time: 'Vừa xong',
        status: 'Hoàn tất',
      };
      setHistory((prev) => [newRecord, ...prev]);
      alert(`✨ Rút tiền hoàn tất! Bạn đã rút ${(outputVal - 0.005).toFixed(4)} ETH từ ${inputVal} ADF.`);
    }

    setSwapInput('');
    setSwapOutput('');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);

    if (isNaN(amount) || amount <= 0) {
      alert('❌ Vui lòng nhập số lượng hợp lệ.');
      return;
    }

    // Hex address validation (0x followed by 40 hex chars)
    const hexPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!hexPattern.test(destAddress)) {
      alert('❌ Địa chỉ ví nhận không hợp lệ. Vui lòng nhập địa chỉ ví Ethereum bắt đầu bằng 0x.');
      return;
    }

    if (asset === 'ETH') {
      if (ethBalance < amount) {
        alert('❌ Số dư ETH của bạn không đủ.');
        return;
      }
      setEthBalance((prev) => prev - amount);
    } else {
      if (adfBalance < amount) {
        alert('❌ Số dư ADF của bạn không đủ.');
        return;
      }
      setAdfBalance((prev) => prev - amount);
    }

    const shortDest = destAddress.substring(0, 6) + '...' + destAddress.substring(destAddress.length - 4);
    
    // Add to history
    const newRecord: HistoryRecord = {
      id: Date.now(),
      type: `Chuyển ${asset}`,
      amount: `-${amount} ${asset}`,
      target: shortDest,
      time: 'Vừa xong',
      status: 'Hoàn tất',
    };
    setHistory((prev) => [newRecord, ...prev]);
    alert(`✨ Chuyển thành công ${amount} ${asset} tới địa chỉ ${shortDest} trên mạng ${network}.`);

    // Reset Form
    setDestAddress('');
    setTransferAmount('');
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <Layout>
      <div className="container" style={{ marginTop: '120px', marginBottom: '80px' }}>
        <section className="swap-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px' }}>
          
          {/* Left Column: Swap Token & Transaction History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* Swap Box Calculator */}
            <div className="swap-panel glass-panel gold-border glow-gold" style={{ padding: '40px' }}>
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 200 }} className="text-gradient">Hoán Đổi Token</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Tính toán và chuyển đổi giữa ETH và ADF Token tiện lợi.
                </p>
              </div>

              {/* Swap Tabs Mode */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
                <button 
                  className={`filter-tab ${swapMode === 'buy' ? 'active' : ''}`} 
                  onClick={() => handleSwitchMode('buy')}
                  style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  Mua ADF
                </button>
                <button 
                  className={`filter-tab ${swapMode === 'withdraw' ? 'active' : ''}`} 
                  onClick={() => handleSwitchMode('withdraw')}
                  style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  Rút ETH
                </button>
              </div>

              {/* Wallet balances */}
              <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <span>Số dư ETH: <strong className="font-mono text-gold">{ethBalance.toFixed(4)}</strong></span>
                <span>Số dư ADF: <strong className="font-mono text-blue">{adfBalance.toFixed(2)}</strong></span>
              </div>

              {/* Form swap */}
              <form onSubmit={handleSwapSubmit} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                
                {/* From Block */}
                <div className="swap-input-block" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div className="swap-input-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>{swapMode === 'buy' ? 'Từ (Bán)' : 'Từ (Quy đổi)'}</span>
                    <span className="text-gold" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={handleFillMaxSwap}>Tối đa</span>
                  </div>
                  <div className="swap-input-row" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      className="swap-input-field" 
                      placeholder="0.0" 
                      step="0.0001" 
                      min="0.0001" 
                      value={swapInput}
                      onChange={(e) => setSwapInput(e.target.value)}
                      required
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontFamily: 'var(--font-mono)', fontSize: '1.25rem' }}
                    />
                    <span className="swap-select font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      {swapMode === 'buy' ? 'ETH' : 'ADF'}
                    </span>
                  </div>
                </div>

                {/* Divider button */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0', zIndex: 2 }}>
                  <button 
                    className="swap-divider-btn" 
                    type="button" 
                    onClick={handleReverseMode}
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-glass)', 
                      color: 'var(--color-primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      transition: 'transform 0.3s'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>swap_vert</span>
                  </button>
                </div>

                {/* To Block */}
                <div className="swap-input-block" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '2px' }}>
                  <div className="swap-input-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>{swapMode === 'buy' ? 'Đến (Nhận)' : 'Đến (Rút)'}</span>
                  </div>
                  <div className="swap-input-row" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      className="swap-input-field" 
                      placeholder="0.0" 
                      value={swapOutput}
                      readOnly
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontSize: '1.25rem' }}
                    />
                    <span className="swap-select font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      {swapMode === 'buy' ? 'ADF' : 'ETH'}
                    </span>
                  </div>
                </div>

                {/* Exchange Rate details */}
                <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="swap-detail-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Tỷ giá quy đổi:</span>
                    <span className="text-gold">
                      {swapMode === 'buy' ? '1 ETH = 1000 ADF' : '1000 ADF = 1 ETH'}
                    </span>
                  </div>
                  <div className="swap-detail-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Phí gas ước tính:</span>
                    <span className="text-blue">
                      {swapMode === 'buy' ? '0.002 ETH' : '0.005 ETH'}
                    </span>
                  </div>
                </div>

                {/* Submit Swap */}
                <button type="submit" className="btn btn-gradient w-full" style={{ padding: '14px 0' }}>
                  {swapMode === 'buy' ? 'Mua ADF Ngay' : 'Rút ETH Ngay'}
                </button>

              </form>
            </div>

            {/* Transaction History */}
            <div className="history-panel glass-panel" style={{ padding: '32px' }}>
              <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 200 }} className="text-gradient">Lịch Sử Hoạt Động</h2>
                <button className="btn btn-outline btn-sm" onClick={handleClearHistory} style={{ padding: '6px 14px' }}>
                  Xóa lịch sử
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Loại giao dịch</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Số lượng</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>TxHash / Địa chỉ</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Thời gian</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => {
                      let badgeBg = 'rgba(0, 227, 253, 0.08)';
                      let badgeColor = 'var(--color-secondary-container)';

                      if (record.type.includes('Chuyển')) {
                        badgeBg = 'rgba(168, 85, 247, 0.08)';
                        badgeColor = '#c084fc';
                      } else if (record.type.includes('Rút')) {
                        badgeBg = 'rgba(242, 202, 80, 0.08)';
                        badgeColor = 'var(--color-primary)';
                      }

                      return (
                        <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{ background: badgeBg, color: badgeColor, padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                              {record.type}
                            </span>
                          </td>
                          <td className="font-mono text-gold" style={{ padding: '14px 8px', fontSize: '0.85rem' }}>{record.amount}</td>
                          <td className="tx-hash" style={{ padding: '14px 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{record.target}</td>
                          <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{record.time}</td>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{ color: 'var(--status-active)', fontWeight: 600, fontSize: '0.85rem' }}>● {record.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 0' }}>
                          Không tìm thấy lịch sử hoạt động.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: P2P Wallet Transfer */}
          <div className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 200, marginBottom: '6px' }} className="text-gradient">Chuyển Khoản Trực Tiếp</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 300 }}>
                Chuyển nhanh tài sản tiền điện tử đến các địa chỉ ví trong hệ thống.
              </p>
            </div>

            <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Dest Wallet address */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="destAddress" className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Địa chỉ ví nhận <span className="text-gold">*</span>
                </label>
                <input 
                  type="text" 
                  id="destAddress" 
                  className="form-input" 
                  placeholder="0x..." 
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  required 
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: 'white' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Nhập chính xác địa chỉ ví Ethereum dạng Hex (42 ký tự).
                </span>
              </div>

              {/* Blockchain Network */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="networkSelect" className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Chọn Blockchain <span className="text-gold">*</span>
                </label>
                <select 
                  id="networkSelect" 
                  className="form-select" 
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(10,10,11,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer' }}
                >
                  <option value="ADF Testnet">ADF Testnet (Ưu tiên)</option>
                  <option value="Ethereum Mainnet">Ethereum Mainnet</option>
                  <option value="BNB Chain">BNB Smart Chain</option>
                  <option value="Polygon">Polygon Mainnet</option>
                </select>
              </div>

              {/* Asset Select */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="assetSelect" className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Loại tài sản <span className="text-gold">*</span>
                </label>
                <select 
                  id="assetSelect" 
                  className="form-select" 
                  value={asset}
                  onChange={(e: any) => {
                    setAsset(e.target.value);
                    setTransferAmount('');
                  }}
                  required
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(10,10,11,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer' }}
                >
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="ADF">ADF (Token Đấu Giá)</option>
                </select>
              </div>

              {/* Amount */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="transferAmount" className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Số lượng gửi <span className="text-gold">*</span>
                  </label>
                  <span className="text-gold font-mono" style={{ fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleFillMaxTransfer}>
                    Tối đa ({asset === 'ETH' ? ethBalance.toFixed(2) : adfBalance.toFixed(2)})
                  </span>
                </div>
                <input 
                  type="number" 
                  id="transferAmount" 
                  className="form-input" 
                  placeholder="0.0" 
                  step="0.0001" 
                  min="0.0001" 
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', color: 'white' }}
                />
              </div>

              {/* Submit transfer */}
              <div style={{ marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary w-full" style={{ padding: '14px 0' }}>
                  Gửi Tài Sản
                </button>
              </div>

            </form>
          </div>

        </section>
      </div>
    </Layout>
  );
};

export default Exchange;
