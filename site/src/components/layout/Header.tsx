import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import styles from './Header.module.css';
import { formatAddress } from '../../utils/formatters';

const Header: React.FC = () => {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      // Kết nối với connector đầu tiên (injected / MetaMask)
      const injectedConnector = connectors[0];
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  };

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Đúc vật phẩm', path: '/mint' },
    { name: 'Giao dịch', path: '/exchange' },
    { name: 'Hướng dẫn', path: '/guide' },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerContainer}`}>
        {/* Brand Logo */}
        <Link to="/" className={styles.logo}>
          <span className="material-symbols-outlined text-gold">diamond</span>
          <span className={styles.logoText}>ADF<span>.</span></span>
        </Link>

        {/* Nav Links */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`${styles.navLink} ${location.pathname === link.path ? styles.active : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Actions (Connect Wallet / User Profile) */}
        <div className={styles.actions}>
          <button
            className={`btn btn-primary ${isConnected ? 'connected' : ''}`}
            onClick={handleConnect}
          >
            {isConnected && address ? (
              <>
                <span className="material-symbols-outlined text-gold">check_circle</span>
                <span className="btn-text">{formatAddress(address)}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">account_balance_wallet</span>
                <span className="btn-text">Kết nối ví</span>
              </>
            )}
          </button>
          
          <div className={`${styles.avatarSpace} ${isConnected ? styles.visible : ''}`} title="Hồ sơ cá nhân">
            <img 
              src="https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=100&auto=format&fit=crop&q=60" 
              alt="Avatar" 
              className={styles.avatarImg} 
            />
            <span className={styles.statusIndicator}></span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
