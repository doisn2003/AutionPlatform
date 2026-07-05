import { Request, Response } from 'express';
import pool from '../config/db';
import { publicClient, CONTRACT_ADDRESSES, ADF_POOL_ABI } from '../config/blockchain';

export const getSwapHistory = async (req: Request, res: Response): Promise<void> => {
  const { user } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT * FROM swap_history';
    let params: any[] = [];

    if (user) {
      query += ' WHERE user_address = $1';
      params.push((user as string).toLowerCase());
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const historyResult = await pool.query(query, params);

    // Get count for pagination
    let countQuery = 'SELECT COUNT(*) FROM swap_history';
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
    console.error('Error fetching swap history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch swap history',
    });
  }
};

export const getPoolStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const address = CONTRACT_ADDRESSES.ADF_Pool;
    if (!address || address === '0x') {
      res.status(400).json({
        status: 'error',
        message: 'ADF_Pool address is not configured',
      });
      return;
    }

    // Read reserves and price directly from the pool contract
    const [reserveETH, reserveADF, price] = await Promise.all([
      publicClient.readContract({
        address,
        abi: ADF_POOL_ABI,
        functionName: 'reserveETH',
      }),
      publicClient.readContract({
        address,
        abi: ADF_POOL_ABI,
        functionName: 'reserveADF',
      }),
      publicClient.readContract({
        address,
        abi: ADF_POOL_ABI,
        functionName: 'getPrice',
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        reserveETH: reserveETH.toString(),
        reserveADF: reserveADF.toString(),
        price: price.toString(), // 1 ADF = price * 10^-18 ETH
      },
    });
  } catch (error: any) {
    console.error('Error fetching pool stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pool stats from contract',
    });
  }
};
