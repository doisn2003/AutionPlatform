import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import styles from './Header.module.css';
import { formatAddress } from '../../utils/formatters';
import { API_URL } from '../../config/contracts';

const Header: React.FC = () => {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=100&auto=format&fit=crop&q=60');

  useEffect(() => {
    if (isConnected && address) {
      fetch(`${API_URL}/api/profile/${address}`)
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data?.avatar_url) {
            setAvatar(json.data.avatar_url);
          }
        })
        .catch(err => console.error('Error fetching header avatar:', err));
    }
  }, [isConnected, address]);

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      // Check if Metamask or other wallet extension is installed
      if (typeof window !== 'undefined' && !(window as any).ethereum) {
        window.open("https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?authuser=0&utm_source=app-launcher", "_blank");
        return;
      }
      const injectedConnector = connectors[0];
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      } else {
        window.open("https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?authuser=0&utm_source=app-launcher", "_blank");
      }
    }
  };

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Bộ sưu tập', path: '/mint' },
    { name: 'Giao dịch', path: '/transaction' },
    { name: 'Bàn giao', path: '/dispute' },
    { name: 'Bảng xếp hạng', path: '/reputation' },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerContainer}`}>
        {/* Brand Logo */}
        <Link to="/" className={styles.logo}>
          <img src="/ADF_logo.png" alt="ADF Logo" className={styles.logoImg} />
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
          
          <Link 
            to="/profile" 
            className={`${styles.avatarSpace} ${isConnected ? styles.visible : ''}`} 
            title="Hồ sơ cá nhân"
            style={{ textDecoration: 'none' }}
          >
            <img 
              src={avatar} 
              alt="Avatar" 
              className={styles.avatarImg} 
            />
            <span className={styles.statusIndicator}></span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
