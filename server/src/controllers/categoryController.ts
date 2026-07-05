import { Request, Response } from 'express';
import pool from '../config/db';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM asset_categories WHERE is_active = true ORDER BY sort_order ASC`
    );
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
