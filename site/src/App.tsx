import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import './styles/global.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* TODO: Add other routes here */}
        {/* <Route path="/mint" element={<Mint />} /> */}
        {/* <Route path="/exchange" element={<Exchange />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
