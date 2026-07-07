import app from './app';
import dotenv from 'dotenv';
import http from 'node:http';
import { initSocket } from './services/socketService';

dotenv.config();

import pool from './config/db';
import { startEventListener } from './services/eventListener';
import { startAuctionCron } from './services/auctionCron';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect to Database
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL Database');
    client.release();

    // Create HTTP Server wrapping Express App
    const server = http.createServer(app);

    // Initialize Socket.io WebSocket Server
    initSocket(server);
    console.log('🔌 Socket.io server initialized');

    // Start Blockchain Event Listener (Viem)
    try {
      await startEventListener();
    } catch (err) {
      console.warn('⚠️ Event Listener failed to start (contract may not be deployed yet):', (err as Error).message);
    }

    // Start Cron Job for auto-ending expired auctions
    try {
      startAuctionCron();
    } catch (err) {
      console.warn('⚠️ Auction Cron failed to start:', (err as Error).message);
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
