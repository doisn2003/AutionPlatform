import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <div className={styles.gridOverlay}></div>
      <div className={styles.glowSpotGold}></div>
      <div className={styles.glowSpotBlue}></div>

      <Header />
      
      <main className={styles.mainContent}>
        {children}
      </main>

      <Footer />
    </>
  );
};

export default Layout;
