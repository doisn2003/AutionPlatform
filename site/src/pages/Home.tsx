import React from 'react';
import Layout from '../components/layout/Layout';
import Hero from '../components/home/Hero';
import QuickActions from '../components/home/QuickActions';
import Marketplace from '../components/home/Marketplace';

const Home: React.FC = () => {
  return (
    <Layout>
      <div className="container">
        <Hero />
        <QuickActions />
        <Marketplace />
      </div>
    </Layout>
  );
};

export default Home;
