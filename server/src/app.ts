import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import auctionRoutes from './routes/auctionRoutes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auctions', auctionRoutes);
// app.use('/api/users', userRoutes);

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
