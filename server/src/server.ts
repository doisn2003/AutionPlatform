import app from './app';
import dotenv from 'dotenv';

dotenv.config();

import pool from './config/db';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect to Database
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL Database');
    client.release();

    // TODO: Start Blockchain Event Listener here (Viem)
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
