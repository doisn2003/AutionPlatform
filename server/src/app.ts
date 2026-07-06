import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import auctionRoutes from './routes/auctionRoutes';
import ipfsRoutes from './routes/ipfsRoutes';
import nftRoutes from './routes/nftRoutes';
import categoryRoutes from './routes/categoryRoutes';
import swapRoutes from './routes/swapRoutes';
import profileRoutes from './routes/profileRoutes';
import disputeRoutes from './routes/disputeRoutes';
import transactionRoutes from './routes/transactionRoutes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auctions', auctionRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/transaction', transactionRoutes);

// Healthcheck Route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'ADF Auction Backend is running', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

export default app;
