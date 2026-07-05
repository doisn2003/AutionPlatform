import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Mint from './pages/Mint';
import Exchange from './pages/Exchange';
import Swap from './pages/Swap';
import MockHome from './pages/mock/MockHome';
import MockNFTDetail from './pages/mock/MockNFTDetail';
import MockAuctionRoom from './pages/mock/MockAuctionRoom';
import MockDisputeResolution from './pages/mock/MockDisputeResolution';
import './styles/global.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mint" element={<Mint />} />
        <Route path="/exchange" element={<Exchange />} />
        <Route path="/swap" element={<Swap />} />
        
        {/* Mock Routes for Thesis screenshots */}
        <Route path="/mock-home" element={<MockHome />} />
        <Route path="/mock-nft" element={<MockNFTDetail />} />
        <Route path="/mock-auction" element={<MockAuctionRoom />} />
        <Route path="/mock-dispute" element={<MockDisputeResolution />} />
      </Routes>
    </Router>
  );
}

export default App;
