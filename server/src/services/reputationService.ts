import pool from '../config/db';

export const ensureUserProfileExists = async (walletAddress: string): Promise<void> => {
  const address = walletAddress.toLowerCase();
  try {
    await pool.query(
      `INSERT INTO user_profiles (wallet_address)
       VALUES ($1)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [address]
    );
  } catch (error) {
    console.error(`Error ensuring user profile exists for ${address}:`, error);
  }
};

export const recalculateReputation = async (walletAddress: string): Promise<void> => {
  const address = walletAddress.toLowerCase();
  try {
    await ensureUserProfileExists(address);

    // Fetch current reputation score and stake
    const result = await pool.query(
      `SELECT 
         reputation_score, 
         adf_staked_for_juror
       FROM user_profiles
       WHERE wallet_address = $1`,
      [address]
    );

    if (result.rows.length === 0) return;

    const row = result.rows[0];
    const reputationScore = parseFloat(row.reputation_score) || 0;
    
    // adf_staked_for_juror represents wei as a string
    const stakedWeiStr = row.adf_staked_for_juror || '0';

    // Juror eligibility rules (Simplified):
    // 1. reputation_score >= 50
    // 2. adf_staked_for_juror >= 500 ADF (500 * 1e18 wei)
    const stakedADFBigInt = BigInt(stakedWeiStr);
    const minStaked = 500n * 10n ** 18n; // 500 ADF
    const jurorEligible = 
      reputationScore >= 50 &&
      stakedADFBigInt >= minStaked;

    await pool.query(
      `UPDATE user_profiles
       SET 
         juror_eligible = $1,
         updated_at = NOW()
       WHERE wallet_address = $2`,
      [jurorEligible, address]
    );

    console.log(`📊 Updated eligibility for ${address}: Score = ${reputationScore.toFixed(2)}, Juror Eligible = ${jurorEligible}`);
  } catch (error) {
    console.error(`Error updating reputation eligibility for ${address}:`, error);
  }
};

export const incrementUserStat = async (
  walletAddress: string, 
  columnName: string, 
  value: number = 1
): Promise<void> => {
  const address = walletAddress.toLowerCase();
  
  // Whitelist column names to prevent SQL injection
  const allowedColumns = [
    'total_auctions_created',
    'total_bids_placed',
    'total_bids_won',
    'total_nfts_minted',
    'total_disputes_filed',
    'total_disputes_won',
    'total_disputes_lost',
    'successful_deliveries'
  ];

  if (!allowedColumns.includes(columnName)) {
    throw new Error(`Invalid stat column name: ${columnName}`);
  }

  try {
    await ensureUserProfileExists(address);
    
    // Update the column
    await pool.query(
      `UPDATE user_profiles
       SET ${columnName} = ${columnName} + $1, updated_at = NOW()
       WHERE wallet_address = $2`,
      [value, address]
    );

    // Trigger recalculation
    await recalculateReputation(address);
  } catch (error) {
    console.error(`Error incrementing ${columnName} for user ${address}:`, error);
  }
};
