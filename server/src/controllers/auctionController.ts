/**
 * Auction Controller — REST API xử lý dữ liệu đấu giá off-chain
 */

import { Request, Response } from 'express';
import pool from '../config/db';

/**
 * GET /api/auctions
 * Query params: ?status=active|ended|all (default: all)
 */
export async function getAuctions(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query.status as string || 'all';

    let query = `
      SELECT a.*, n.name, n.image, n.description 
      FROM auctions a
      LEFT JOIN nfts n ON a.nft_token_id = n.token_id
    `;
    const params: any[] = [];

    if (status === 'active') {
      query += ' WHERE a.active = true';
    } else if (status === 'ended') {
      query += ' WHERE a.active = false';
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      status: 'ok',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching auctions:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}

/**
 * GET /api/auctions/:id
 */
export async function getAuctionById(req: Request, res: Response): Promise<void> {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const auctionId = parseInt(rawId || '', 10);

    if (isNaN(auctionId)) {
      res.status(400).json({ status: 'error', message: 'Invalid auction ID' });
      return;
    }

    const result = await pool.query(
      `SELECT a.*, n.name, n.image, n.description 
       FROM auctions a 
       LEFT JOIN nfts n ON a.nft_token_id = n.token_id
       WHERE a.auction_id = $1`,
      [auctionId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Auction not found' });
      return;
    }

    res.json({
      status: 'ok',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error fetching auction:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}

/**
 * GET /api/auctions/:id/bids
 */
export async function getAuctionBids(req: Request, res: Response): Promise<void> {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const auctionId = parseInt(rawId || '', 10);

    if (isNaN(auctionId)) {
      res.status(400).json({ status: 'error', message: 'Invalid auction ID' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM bids WHERE auction_id = $1 ORDER BY created_at DESC',
      [auctionId]
    );

    res.json({
      status: 'ok',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}
