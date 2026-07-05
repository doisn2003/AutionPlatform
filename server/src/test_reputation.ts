import pool from './config/db';
import { recalculateReputation, ensureUserProfileExists } from './services/reputationService';

const runTests = async () => {
  console.log('🧪 Starting Reputation Service Unit Tests...');
  const testWallet = '0x0000000000000000000000000000000000001337';

  try {
    // 1. Setup profile
    await ensureUserProfileExists(testWallet);
    console.log('   [Pass] Profile initialized');

    // 2. Setup mock stats: 6 bids placed, 2 bids won, 1 nft minted, 3 successful deliveries, 0 disputes lost, 600 staked
    // Expected reputation score:
    // 6 * 1 + 2 * 5 + 1 * 3 + 3 * 10 + 600 * 0.01 - 0 * 20 = 6 + 10 + 3 + 30 + 6 = 55.00
    // Expected juror eligibility: true (score >= 50, staked >= 500, disputes lost === 0, bids placed >= 5)
    await pool.query(
      `UPDATE user_profiles
       SET 
         total_bids_placed = 6,
         total_bids_won = 2,
         total_nfts_minted = 1,
         successful_deliveries = 3,
         total_disputes_lost = 0,
         adf_staked_for_juror = $1
       WHERE wallet_address = $2`,
      [ (600n * 10n**18n).toString(), testWallet ]
    );

    await recalculateReputation(testWallet);

    const res = await pool.query(`SELECT * FROM user_profiles WHERE wallet_address = $1`, [testWallet]);
    const profile = res.rows[0];

    console.log(`   Reputation Score calculated: ${profile.reputation_score}`);
    console.log(`   Juror Eligible: ${profile.juror_eligible}`);

    if (parseFloat(profile.reputation_score) !== 55.00) {
      throw new Error(`Reputation calculation incorrect. Expected 55.00, got ${profile.reputation_score}`);
    }
    if (profile.juror_eligible !== true) {
      throw new Error(`Juror eligibility incorrect. Expected true, got ${profile.juror_eligible}`);
    }
    console.log('   [Pass] Test case 1: Candidate satisfies all conditions');

    // 3. Test case 2: Fail because of disputes lost
    await pool.query(
      `UPDATE user_profiles
       SET total_disputes_lost = 1
       WHERE wallet_address = $1`,
      [ testWallet ]
    );
    await recalculateReputation(testWallet);
    const res2 = await pool.query(`SELECT * FROM user_profiles WHERE wallet_address = $1`, [testWallet]);
    const profile2 = res2.rows[0];
    
    // New score: 55 - 20 = 35.00
    console.log(`   New Reputation Score: ${profile2.reputation_score}`);
    console.log(`   New Juror Eligible: ${profile2.juror_eligible}`);

    if (parseFloat(profile2.reputation_score) !== 35.00) {
      throw new Error(`Reputation calculation incorrect after dispute. Expected 35.00, got ${profile2.reputation_score}`);
    }
    if (profile2.juror_eligible !== false) {
      throw new Error(`Juror eligibility incorrect after dispute. Expected false, got ${profile2.juror_eligible}`);
    }
    console.log('   [Pass] Test case 2: Candidate ineligible due to disputes lost and low score');

    // Clean up
    await pool.query(`DELETE FROM user_profiles WHERE wallet_address = $1`, [testWallet]);
    console.log('   [Pass] Cleaned up test database rows.');
    console.log('✅ All Reputation Service tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

runTests();
