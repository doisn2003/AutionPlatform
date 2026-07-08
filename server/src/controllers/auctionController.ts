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
      SELECT a.*, n.name, n.image, n.description, n.token_uri, n.images, n.attributes,
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
      `SELECT a.*, n.name, n.image, n.description, n.token_uri, n.images, n.attributes,
              c.display_name AS category_name, c.icon AS category_icon,
              d.dispute_id
       FROM auctions a 
       LEFT JOIN nfts n ON a.nft_token_id = n.token_id
       LEFT JOIN asset_categories c ON 
         COALESCE(a.category_code, CASE WHEN a.asset_type = 'PHYSICAL' THEN 'PHYSICAL_OTHER' ELSE 'DIGITAL_NFT_ART' END) = c.category_code
       LEFT JOIN disputes d ON a.auction_id = d.auction_id
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
    const { category_code, location_province, location_district, location_ward, location_detail } = req.body;

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
      `UPDATE auctions SET 
         category_code = $1,
         location_province = $2,
         location_district = $3,
         location_ward = $4,
         location_detail = $5 
       WHERE nft_token_id = $6 AND active = true 
       RETURNING *`,
      [
        category_code,
        location_province || null,
        location_district || null,
        location_ward || null,
        location_detail || null,
        tokenId
      ]
    );

    if (result.rows.length === 0) {
      // Fallback: update the latest auction for this NFT
      const fallbackResult = await pool.query(
        `UPDATE auctions SET 
           category_code = $1,
           location_province = $2,
           location_district = $3,
           location_ward = $4,
           location_detail = $5 
         WHERE id = (SELECT id FROM auctions WHERE nft_token_id = $6 ORDER BY created_at DESC LIMIT 1) 
         RETURNING *`,
        [
          category_code,
          location_province || null,
          location_district || null,
          location_ward || null,
          location_detail || null,
          tokenId
        ]
      );
      if (fallbackResult.rows.length === 0) {
        res.status(404).json({ status: 'error', message: 'Auction not found' });
        return;
      }
      res.json({
        status: 'ok',
        message: 'Category and location updated via fallback',
        data: fallbackResult.rows[0],
      });
      return;
    }

    res.json({
      status: 'ok',
      message: 'Category and location updated successfully',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating auction category by NFT:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}

/**
 * GET /api/auctions/user/:address
 * Lấy tất cả các phiên đấu giá vật lý liên quan tới ví người dùng (là người bán hoặc người thắng thầu)
 */
export async function getUserEscrowAuctions(req: Request, res: Response): Promise<void> {
  try {
    const rawAddress = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
    const address = rawAddress?.toLowerCase();
    if (!address) {
      res.status(400).json({ status: 'error', message: 'Address is required' });
      return;
    }

    const result = await pool.query(
      `SELECT a.*, n.name, n.image, n.description, n.token_uri, n.images, n.attributes,
              c.display_name AS category_name, c.icon AS category_icon,
              CASE WHEN EXISTS (
                SELECT 1 FROM disputes d JOIN dispute_votes dv ON d.dispute_id = dv.dispute_id
                WHERE d.auction_id = a.auction_id AND LOWER(dv.juror) = $1
              ) THEN true ELSE false END AS is_juror
       FROM auctions a
       LEFT JOIN nfts n ON a.nft_token_id = n.token_id
       LEFT JOIN asset_categories c ON 
         COALESCE(a.category_code, CASE WHEN a.asset_type = 'PHYSICAL' THEN 'PHYSICAL_OTHER' ELSE 'DIGITAL_NFT_ART' END) = c.category_code
       WHERE (a.seller = $1 OR a.current_top_bidder = $1 OR EXISTS (
         SELECT 1 FROM disputes d JOIN dispute_votes dv ON d.dispute_id = dv.dispute_id
         WHERE d.auction_id = a.auction_id AND LOWER(dv.juror) = $1
       ))
         AND a.asset_type = 'PHYSICAL'
       ORDER BY a.created_at DESC`,
      [address]
    );

    res.json({
      status: 'ok',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching user escrow auctions:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}

