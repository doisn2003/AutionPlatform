import React from 'react';
import { useAccount } from 'wagmi';
import Layout from '../components/layout/Layout';
import { useFaucet, useWithdraw } from '../hooks/useContractActions';
import { useADFBalance, usePendingReturns } from '../hooks/useReadContract';
import FloatingWalletWidget from '../components/layout/FloatingWalletWidget/FloatingWalletWidget';
import styles from './Faucet.module.css';

const Faucet: React.FC = () => {
  const { isConnected, address } = useAccount();
  
  // Read contract states for FloatingWalletWidget
  const { data: walletAdfBalance } = useADFBalance(address);
  const { data: walletPendingReturns } = usePendingReturns(address);
  
  // Write contract states for FloatingWalletWidget
  const { faucet: callFaucet, isPending: isFauceting, isConfirming: isFaucetConfirming } = useFaucet();
  const { withdraw: callWithdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming } = useWithdraw();

  return (
    <Layout>
      <div className={styles.faucetContainer}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <h1 className={styles.title}>NHẬN TIỀN THỬ NGHIỆM</h1>
          <p className={styles.subtitle}>
          Để có thể tham gia đấu giá vật phẩm, đúc NFT và trải nghiệm toàn bộ tính năng của hệ thống, vui lòng thực hiện các bước hướng dẫn dưới đây.
          </p>
        </div>

        {/* Bento Grid Step-by-Step Instructions */}
        <div className={styles.stepsGrid}>
          
          {/* Step 1: MetaMask Installation */}
          <div className={styles.stepCard}>
            <div className={styles.badge}>Bước 1</div>
            <h2 className={styles.stepTitle}>
              <span className="material-symbols-outlined styles.stepIcon">account_balance_wallet</span>
              Cài đặt & Cấu hình ví MetaMask
            </h2>
            <ul className={styles.instructionList}>
              <li>Tải và cài đặt ví MetaMask trên trình duyệt Chrome của bạn.</li>
              <li>
                Mở ví MetaMask Nhấp vào menu <strong>Chọn Mạng (Network selector)</strong> ở góc trên bên trái.
              </li>
              <li>
                Bật tùy chọn <strong>Hiển thị các mạng thử nghiệm (Show test networks)</strong> trong Cài đặt nâng cao của ví.
              </li>
              <li>
                Chọn mạng <strong>Sepolia Test Network</strong> làm mạng hoạt động chính để tương tác với sàn đấu giá.
              </li>
            </ul>
            <div className={styles.buttonGroup}>
              <a 
                href="https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?authuser=0&utm_source=app-launcher&pli=1" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                <span className="material-symbols-outlined">download</span>
                Cài đặt MetaMask
              </a>
            </div>
          </div>

          {/* Step 2: Sepolia ETH Faucet */}
          <div className={styles.stepCard}>
            <div className={styles.badge}>Bước 2</div>
            <h2 className={styles.stepTitle}>
              <span className="material-symbols-outlined styles.stepIcon">opacity</span>
              Nhận ETH mạng Sepolia (SepoliaETH)
            </h2>
            <ul className={styles.instructionList}>
              <li>Mỗi hành động đấu giá hoặc tạo phòng đấu giá đều là một giao dịch trên chuỗi và cần một lượng nhỏ ETH để trả phí gas mạng lưới.</li>
              <li>Chúng tôi khuyến khích bạn nhận ETH Sepolia miễn phí từ vòi faucet chính thức của Google Cloud Web3.</li>
              <li>Đăng nhập tài khoản Google của bạn tại trang Faucet và dán địa chỉ ví để nhận ngay 0.05 SepoliaETH.</li>
            </ul>
            <div className={styles.buttonGroup}>
              <a 
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                <span className="material-symbols-outlined">local_gas_station</span>
                Vòi Faucet Google Cloud Sepolia
              </a>
            </div>
          </div>

          {/* Step 3: ADF Token Faucet */}
          <div className={styles.stepCard}>
            <div className={styles.badge}>Bước 3</div>
            <h2 className={styles.stepTitle}>
              <span className="material-symbols-outlined styles.stepIcon">currency_exchange</span>
              Nhận Token ADF và Phí Gas tự động
            </h2>
            <ul className={styles.instructionList}>
              <li>Sau khi cài đặt ví, hãy kết nối ví với website bằng nút <strong>Kết nối ví</strong> ở phía trên Header.</li>
              <li>Nhấp vào <strong>Biểu tượng Ví nổi</strong> hình tròn xuất hiện ở góc dưới cùng bên phải màn hình.</li>
              <li>Trong bảng điều khiển ví, nhấp chọn nút <strong>Nạp (Faucet)</strong>.</li>
              <li>
                Hệ thống sẽ tự động chuyển khoản <strong>100 ADF Token</strong> vào ví của bạn hoàn toàn miễn phí.
              </li>
            </ul>
            
            <div className={styles.faucetWidgetBox}>
              <p>
                👉 <em>Sau khi kết nối ví, hãy click vào quả bong bóng ví ở góc dưới bên phải màn hình để thực hiện Faucet!</em>
              </p>
            </div>
          </div>

        </div>

        {/* Connection Status Panel */}
        <div className={`${styles.walletStatus} ${isConnected ? styles.walletConnected : ''}`}>
          {isConnected ? (
            <div>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>check_circle</span>
              Đã kết nối thành công với ví: <strong>{address}</strong>. Hãy nhấn biểu tượng Ví nổi ở góc dưới bên phải màn hình để Faucet!
            </div>
          ) : (
            <div>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>warning</span>
              Bạn chưa kết nối ví. Vui lòng nhấn nút <strong>Kết nối ví</strong> trên Header để bắt đầu.
            </div>
          )}
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
      </div>
    </Layout>
  );
};

export default Faucet;
