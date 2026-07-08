import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import FormData from 'form-data';
import app from './app';
import pool from './config/db';

const PORT = 4001;

async function runApiTests() {
  console.log('🧪 Starting Disputes REST API Integration Tests...');

  // Khởi chạy server Express trên cổng 4001
  const server = app.listen(PORT, async () => {
    console.log(`   🚀 Temp express server running on port ${PORT}`);

    const dummyBuyer = '0x1111111111111111111111111111111111111111';
    const dummySeller = '0x2222222222222222222222222222222222222222';
    const dummyJuror = '0x3333333333333333333333333333333333333333';
    const dummyDisputeId = 7777;
    const dummyAuctionId = 7777;

    try {
      // 1. Tạo mock profile, auction, dispute và vote trong DB
      await pool.query(
        `INSERT INTO user_profiles (wallet_address, display_name) 
         VALUES ($1, 'Buyer'), ($2, 'Seller'), ($3, 'Juror')
         ON CONFLICT (wallet_address) DO NOTHING`,
        [dummyBuyer, dummySeller, dummyJuror]
      );

      await pool.query(
        `INSERT INTO auctions (auction_id, seller, current_top_bidder, nft_token_id, end_time, reserve_price, min_bid_increment)
         VALUES ($1, $2, $3, 1, NOW(), '100', '10')
         ON CONFLICT (auction_id) DO NOTHING`,
        [dummyAuctionId, dummySeller, dummyBuyer]
      );

      await pool.query(
        `INSERT INTO disputes (dispute_id, auction_id, buyer, seller, initiator, phase, resolved)
         VALUES ($1, $2, $3, $4, $5, 'COMMIT', false)
         ON CONFLICT (dispute_id) DO UPDATE SET phase = 'COMMIT'`,
        [dummyDisputeId, dummyAuctionId, dummyBuyer, dummySeller, dummyBuyer]
      );

      await pool.query(
        `INSERT INTO dispute_votes (dispute_id, juror, has_committed, commit_hash)
         VALUES ($1, $2, true, '0xcommit')
         ON CONFLICT (dispute_id, juror) DO NOTHING`,
        [dummyDisputeId, dummyJuror]
      );
      console.log('   ✅ Dummy DB data initialized.');

      // 2. Test GET /api/disputes/:id
      console.log(`   🔍 Testing GET /api/disputes/${dummyDisputeId}...`);
      const getDetailRes = await axios.get(`http://localhost:${PORT}/api/disputes/${dummyDisputeId}`);
      
      if (getDetailRes.status !== 200 || !getDetailRes.data.success) {
        throw new Error('GET /api/disputes/:id failed');
      }
      console.log('      [Pass] Response status 200 OK');
      console.log(`      [Pass] Phase: ${getDetailRes.data.dispute.phase}`);
      console.log(`      [Pass] Votes count: ${getDetailRes.data.votes.length}`);

      // 3. Test GET /api/disputes/juror/:address
      console.log(`   🔍 Testing GET /api/disputes/juror/${dummyJuror}...`);
      const getJurorRes = await axios.get(`http://localhost:${PORT}/api/disputes/juror/${dummyJuror}`);

      if (getJurorRes.status !== 200 || !getJurorRes.data.success) {
        throw new Error('GET /api/disputes/juror/:address failed');
      }
      console.log('      [Pass] Response status 200 OK');
      console.log(`      [Pass] Disputes assigned to Juror: ${getJurorRes.data.disputes.length}`);

      // 4. Test POST /api/disputes/evidence (Pinata IPFS Upload)
      console.log('   🔍 Testing POST /api/disputes/evidence...');
      const tempFilePath = path.join(__dirname, 'temp_evidence_test.txt');
      fs.writeFileSync(tempFilePath, 'This is a test evidence file content.');

      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempFilePath));

      const uploadRes = await axios.post(`http://localhost:${PORT}/api/disputes/evidence`, formData, {
        headers: formData.getHeaders(),
      });

      if (uploadRes.status !== 200 || !uploadRes.data.success) {
        throw new Error('POST /api/disputes/evidence failed');
      }
      console.log('      [Pass] Response status 200 OK');
      console.log(`      [Pass] IPFS Hash: ${uploadRes.data.ipfsHash}`);

      // Cleanup local temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      console.log('\n🎉 All Disputes REST API Integration Tests PASSED successfully!');
    } catch (error: any) {
      console.error('❌ Integration Test failed:', error.response?.data || error.message);
      process.exit(1);
    } finally {
      // Dọn dẹp DB
      await pool.query('DELETE FROM dispute_votes WHERE dispute_id = $1', [dummyDisputeId]);
      await pool.query('DELETE FROM disputes WHERE dispute_id = $1', [dummyDisputeId]);
      await pool.query('DELETE FROM auctions WHERE auction_id = $1', [dummyAuctionId]);
      await pool.query('DELETE FROM user_profiles WHERE wallet_address IN ($1, $2, $3)', [dummyBuyer, dummySeller, dummyJuror]);
      
      console.log('   🧹 DB cleaned up.');
      await pool.end();

      // Đóng Express server
      server.close(() => {
        console.log('   🛑 Temp express server closed.');
        process.exit(0);
      });
    }
  });
}

runApiTests();
