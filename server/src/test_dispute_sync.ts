import pool from './config/db';

async function runSmokeTest() {
  console.log('🧪 Starting database schema smoke test for disputes and votes...');

  try {
    // 1. Tạo ví dụ user_profiles để làm khoá ngoại (nếu chưa có)
    const dummyBuyer = '0x1111111111111111111111111111111111111111';
    const dummySeller = '0x2222222222222222222222222222222222222222';
    const dummyJuror = '0x3333333333333333333333333333333333333333';

    await pool.query(
      `INSERT INTO user_profiles (wallet_address, display_name) 
       VALUES ($1, 'Dummy Buyer'), ($2, 'Dummy Seller'), ($3, 'Dummy Juror')
       ON CONFLICT (wallet_address) DO NOTHING`,
      [dummyBuyer, dummySeller, dummyJuror]
    );
    console.log('   ✅ Dummy user profiles checked/inserted.');

    // 2. Tạo ví dụ auctions để làm khoá ngoại
    const dummyAuctionId = 9999;
    await pool.query(
      `INSERT INTO auctions (auction_id, seller, nft_token_id, end_time, reserve_price, min_bid_increment)
       VALUES ($1, $2, 1, NOW(), '100', '10')
       ON CONFLICT (auction_id) DO NOTHING`,
      [dummyAuctionId, dummySeller]
    );
    console.log('   ✅ Dummy auctions checked/inserted.');

    // 3. Tạo một dòng tranh chấp mới (disputes)
    const dummyDisputeId = 9999;
    await pool.query(
      `INSERT INTO disputes (
         dispute_id, auction_id, buyer, seller, initiator, phase, 
         evidence_deadline, commit_deadline, reveal_deadline
       )
       VALUES ($1, $2, $3, $4, $5, 'EVIDENCE', NOW() + interval '3 days', NOW() + interval '5 days', NOW() + interval '6 days')
       ON CONFLICT (dispute_id) DO UPDATE SET phase = 'EVIDENCE'`,
      [dummyDisputeId, dummyAuctionId, dummyBuyer, dummySeller, dummyBuyer]
    );
    console.log('   ✅ Dispute inserted successfully.');

    // 4. Tạo một dòng biểu quyết (dispute_votes) cho Trọng tài
    await pool.query(
      `INSERT INTO dispute_votes (dispute_id, juror, has_committed, commit_hash, revealed_vote)
       VALUES ($1, $2, true, '0xabcdef0123456789012345678901234567890123456789012345678901234567', 1)
       ON CONFLICT (dispute_id, juror) DO UPDATE SET revealed_vote = 1`,
      [dummyDisputeId, dummyJuror]
    );
    console.log('   ✅ Dispute vote inserted successfully.');

    // 5. Đọc lại dữ liệu để kiểm chứng truy vấn hoạt động tốt
    const disputeRes = await pool.query('SELECT * FROM disputes WHERE dispute_id = $1', [dummyDisputeId]);
    const voteRes = await pool.query('SELECT * FROM dispute_votes WHERE dispute_id = $1', [dummyDisputeId]);

    console.log('\n📊 Retrieved Dispute from DB:');
    console.log(`   - ID: ${disputeRes.rows[0].dispute_id}`);
    console.log(`   - Phase: ${disputeRes.rows[0].phase}`);
    console.log(`   - Initiator: ${disputeRes.rows[0].initiator}`);

    console.log('📊 Retrieved Vote from DB:');
    console.log(`   - Juror: ${voteRes.rows[0].juror}`);
    console.log(`   - Has Committed: ${voteRes.rows[0].has_committed}`);
    console.log(`   - Vote: ${voteRes.rows[0].revealed_vote === 1 ? 'BUYER' : 'SELLER'}\n`);

    // 6. Xoá dữ liệu test
    await pool.query('DELETE FROM dispute_votes WHERE dispute_id = $1', [dummyDisputeId]);
    await pool.query('DELETE FROM disputes WHERE dispute_id = $1', [dummyDisputeId]);
    await pool.query('DELETE FROM auctions WHERE auction_id = $1', [dummyAuctionId]);
    console.log('   ✅ Test clean up completed.');
    console.log('\n🎉 SQL Queries Smoke Test PASSED successfully!');

  } catch (error) {
    console.error('❌ SQL Smoke Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSmokeTest();
