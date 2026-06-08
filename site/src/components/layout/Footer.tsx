import React from 'react';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerContainer}`}>
        <div className={styles.footerLogo}>
          <span className="material-symbols-outlined text-gold">diamond</span>
          <span>ADF<span>.</span></span>
        </div>
        <p className={styles.footerCopy}>
          © 2026 ADF. Sàn đấu giá phi tập trung dành cho các tác phẩm tự do.
        </p>
        <div className={styles.footerLinks}>
          <a href="#">Điều khoản</a>
          <a href="#">Bảo mật</a>
          <a href="#">Liên hệ</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
