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

    // Fetch stats
    const result = await pool.query(
      `SELECT 
         total_bids_placed, 
         total_bids_won, 
         total_nfts_minted, 
         successful_deliveries, 
         total_disputes_lost,
         adf_staked_for_juror
       FROM user_profiles
       WHERE wallet_address = $1`,
      [address]
    );

    if (result.rows.length === 0) return;

    const row = result.rows[0];
    const totalBidsPlaced = parseInt(row.total_bids_placed) || 0;
    const totalBidsWon = parseInt(row.total_bids_won) || 0;
    const totalNftsMinted = parseInt(row.total_nfts_minted) || 0;
    const successfulDeliveries = parseInt(row.successful_deliveries) || 0;
    const totalDisputesLost = parseInt(row.total_disputes_lost) || 0;
    
    // adf_staked_for_juror represents wei as a string
    const stakedWeiStr = row.adf_staked_for_juror || '0';
    const stakedADF = parseFloat(stakedWeiStr) / 1e18;

    // Formula:
    // Reputation = 1 * B_placed + 5 * B_won + 3 * N_minted + 10 * D_success + 0.01 * S_staked - 20 * D_lost
    const reputationScore = Math.max(0, (
      totalBidsPlaced * 1 +
      totalBidsWon * 5 +
      totalNftsMinted * 3 +
      successfulDeliveries * 10 +
      stakedADF * 0.01 -
      totalDisputesLost * 20
    ));

    // Juror eligibility rules:
    // 1. reputation_score >= 50
    // 2. adf_staked_for_juror >= 500 ADF (500 * 1e18 wei)
    // 3. total_disputes_lost == 0
    // 4. total_bids_placed >= 5
    const stakedADFBigInt = BigInt(stakedWeiStr);
    const minStaked = 500n * 10n ** 18n; // 500 ADF
    const jurorEligible = 
      reputationScore >= 50 &&
      stakedADFBigInt >= minStaked &&
      totalDisputesLost === 0 &&
      totalBidsPlaced >= 5;

    await pool.query(
      `UPDATE user_profiles
       SET 
         reputation_score = $1,
         juror_eligible = $2,
         updated_at = NOW()
       WHERE wallet_address = $3`,
      [reputationScore, jurorEligible, address]
    );

    console.log(`📊 Recalculated reputation for ${address}: Score = ${reputationScore.toFixed(2)}, Juror Eligible = ${jurorEligible}`);
  } catch (error) {
    console.error(`Error recalculating reputation for ${address}:`, error);
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
