import { Request, Response } from 'express';
import pool from '../config/db';

export const getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
  const { user } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20; // Default to 20 for richer display
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT * FROM user_transactions';
    let params: any[] = [];

    if (user) {
      query += ' WHERE user_address = $1';
      params.push((user as string).toLowerCase());
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const historyResult = await pool.query(query, params);

    // Get count for pagination
    let countQuery = 'SELECT COUNT(*) FROM user_transactions';
    let countParams: any[] = [];
    if (user) {
      countQuery += ' WHERE user_address = $1';
      countParams.push((user as string).toLowerCase());
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      status: 'success',
      data: historyResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transaction history',
    });
  }
};
