import { Request, Response } from 'express';
import pool from '../config/db';
import { ensureUserProfileExists, recalculateReputation } from '../services/reputationService';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  if (!address) {
    res.status(400).json({ error: 'Wallet address is required' });
    return;
  }

  const wallet = String(address).toLowerCase();

  try {
    // Ensure profile exists
    await ensureUserProfileExists(wallet);

    const result = await pool.query(
      `SELECT * FROM user_profiles WHERE wallet_address = $1`,
      [wallet]
    );

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error(`Error getting profile for ${wallet}:`, error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const { walletAddress, displayName, bio, avatarUrl, email, socialLinks } = req.body;

  if (!walletAddress) {
    res.status(400).json({ error: 'Wallet address is required' });
    return;
  }

  const wallet = walletAddress.toLowerCase();

  try {
    await ensureUserProfileExists(wallet);

    await pool.query(
      `UPDATE user_profiles
       SET 
         display_name = COALESCE($1, display_name),
         bio = COALESCE($2, bio),
         avatar_url = COALESCE($3, avatar_url),
         email = COALESCE($4, email),
         social_links = COALESCE($5, social_links),
         updated_at = NOW()
       WHERE wallet_address = $6`,
      [
        displayName || null,
        bio || null,
        avatarUrl || null,
        email || null,
        socialLinks ? JSON.stringify(socialLinks) : null,
        wallet
      ]
    );

    await recalculateReputation(wallet);

    const result = await pool.query(
      `SELECT * FROM user_profiles WHERE wallet_address = $1`,
      [wallet]
    );

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: result.rows[0] });
  } catch (error: any) {
    console.error(`Error updating profile for ${wallet}:`, error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;
  const page = parseInt(req.query.page as string) || 1;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT * FROM user_profiles
       ORDER BY reputation_score DESC, created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(`SELECT COUNT(*) FROM user_profiles`);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
};

export const mockStake = async (req: Request, res: Response): Promise<void> => {
  const { walletAddress, amount } = req.body; // amount is in ADF (e.g. 500)

  if (!walletAddress || amount === undefined) {
    res.status(400).json({ error: 'Wallet address and amount are required' });
    return;
  }

  const wallet = walletAddress.toLowerCase();
  const adfWei = (BigInt(amount) * 10n ** 18n).toString();

  try {
    await ensureUserProfileExists(wallet);

    await pool.query(
      `UPDATE user_profiles
       SET adf_staked_for_juror = $1, updated_at = NOW()
       WHERE wallet_address = $2`,
      [adfWei, wallet]
    );

    await recalculateReputation(wallet);

    const result = await pool.query(
      `SELECT * FROM user_profiles WHERE wallet_address = $1`,
      [wallet]
    );

    res.status(200).json({ 
      success: true, 
      message: `Successfully mocked staking of ${amount} ADF`, 
      data: result.rows[0] 
    });
  } catch (error: any) {
    console.error(`Error mocking stake for ${wallet}:`, error);
    res.status(500).json({ error: 'Failed to process mock stake' });
  }
};
