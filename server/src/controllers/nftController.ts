import { Request, Response } from 'express';
import pool from '../config/db';

export const getUserNFTs = async (req: Request, res: Response) => {
  try {
    const { owner } = req.query;

    if (!owner) {
      return res.status(400).json({ error: 'Owner address is required' });
    }

    // Query nfts table from Postgres using pg pool
    const result = await pool.query(
      `SELECT * FROM nfts WHERE owner ILIKE $1 ORDER BY created_at DESC`,
      [owner as string]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Fetch NFTs Error:', error);
    res.status(500).json({ error: error.message });
  }
};
