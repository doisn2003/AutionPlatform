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
      SELECT a.*, n.name, n.image, n.description,
             c.display_name AS category_name, c.icon AS category_icon
      FROM auctions a
      LEFT JOIN nfts n ON a.nft_token_id = n.token_id
      LEFT JOIN asset_categories c ON 
        COALESCE(a.category_code, CASE WHEN a.asset_type = 'PHYSICAL' THEN 'PHYSICAL_OTHER' ELSE 'DIGITAL_NFT_ART' END) = c.category_code
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
      `SELECT a.*, n.name, n.image, n.description,
              c.display_name AS category_name, c.icon AS category_icon
       FROM auctions a 
       LEFT JOIN nfts n ON a.nft_token_id = n.token_id
       LEFT JOIN asset_categories c ON 
         COALESCE(a.category_code, CASE WHEN a.asset_type = 'PHYSICAL' THEN 'PHYSICAL_OTHER' ELSE 'DIGITAL_NFT_ART' END) = c.category_code
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

/**
 * PUT /api/auctions/:id/category
 */
export async function updateAuctionCategory(req: Request, res: Response): Promise<void> {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const auctionId = parseInt(rawId || '', 10);
    const { category_code } = req.body;

    if (isNaN(auctionId)) {
      res.status(400).json({ status: 'error', message: 'Invalid auction ID' });
      return;
    }

    if (!category_code) {
      res.status(400).json({ status: 'error', message: 'category_code is required' });
      return;
    }

    const result = await pool.query(
      `UPDATE auctions SET category_code = $1 WHERE auction_id = $2 RETURNING *`,
      [category_code, auctionId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Auction not found' });
      return;
    }

    res.json({
      status: 'ok',
      message: 'Category updated successfully',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating auction category:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}

/**
 * PUT /api/auctions/by-nft/:tokenId/category
 */
export async function updateAuctionCategoryByNft(req: Request, res: Response): Promise<void> {
  try {
    const rawTokenId = Array.isArray(req.params.tokenId) ? req.params.tokenId[0] : req.params.tokenId;
    const tokenId = parseInt(rawTokenId || '', 10);
    const { category_code } = req.body;

    if (isNaN(tokenId)) {
      res.status(400).json({ status: 'error', message: 'Invalid token ID' });
      return;
    }

    if (!category_code) {
      res.status(400).json({ status: 'error', message: 'category_code is required' });
      return;
    }

    // Update the most recent active auction for this NFT
    const result = await pool.query(
      `UPDATE auctions SET category_code = $1 
       WHERE nft_token_id = $2 AND active = true 
       RETURNING *`,
      [category_code, tokenId]
    );

    if (result.rows.length === 0) {
      // Fallback: update the latest auction for this NFT
      const fallbackResult = await pool.query(
        `UPDATE auctions SET category_code = $1 
         WHERE id = (SELECT id FROM auctions WHERE nft_token_id = $2 ORDER BY created_at DESC LIMIT 1) 
         RETURNING *`,
        [category_code, tokenId]
      );
      if (fallbackResult.rows.length === 0) {
        res.status(404).json({ status: 'error', message: 'Auction not found' });
        return;
      }
      res.json({
        status: 'ok',
        message: 'Category updated via fallback',
        data: fallbackResult.rows[0],
      });
      return;
    }

    res.json({
      status: 'ok',
      message: 'Category updated successfully',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating auction category by NFT:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}
