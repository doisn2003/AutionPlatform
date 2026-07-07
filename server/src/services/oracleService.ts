import pool from '../config/db';
import { publicClient, walletClient, CONTRACT_ADDRESSES, DISPUTE_RESOLUTION_ABI } from '../config/blockchain';

export async function assignJurorsAutomatically(disputeId: number, auctionId: number): Promise<void> {
  console.log(`🤖 Oracle Service: Triggered juror selection for Dispute #${disputeId}...`);

  try {
    // 1. Kiểm tra trạng thái tranh chấp trong DB trước để tránh gán lại hoặc gán sai pha
    const disputeDbRes = await pool.query(
      `SELECT phase, selected_jurors, evidence_deadline FROM disputes WHERE dispute_id = $1`,
      [disputeId]
    );

    if (disputeDbRes.rows.length > 0) {
      const { phase, selected_jurors, evidence_deadline } = disputeDbRes.rows[0];
      if (phase !== 'EVIDENCE' || (selected_jurors && selected_jurors.length === 5)) {
        console.log(`   ℹ️ Oracle: Dispute #${disputeId} is already assigned or resolved (Phase: ${phase}). Skipping.`);
        return;
      }

      // Đảm bảo qua hạn nộp bằng chứng mới gán Trọng tài
      if (evidence_deadline && new Date(evidence_deadline).getTime() > Date.now()) {
        console.log(`   ℹ️ Oracle: Dispute #${disputeId} evidence deadline (${evidence_deadline}) has not passed yet. Waiting.`);
        return;
      }
    }

    // 2. Lấy thông tin buyer và seller của phiên đấu giá liên quan để loại trừ khỏi hội đồng
    const auctionRes = await pool.query(
      `SELECT seller, current_top_bidder as buyer FROM auctions WHERE auction_id = $1`,
      [auctionId]
    );

    if (auctionRes.rows.length === 0) {
      console.error(`   ❌ Oracle: Auction #${auctionId} not found in DB.`);
      return;
    }

    const { seller, buyer } = auctionRes.rows[0];
    const sellerLower = seller.toLowerCase();
    const buyerLower = buyer ? buyer.toLowerCase() : '';

    // 3. Truy vấn lấy ra Top 5 trọng tài có reputation_score cao nhất và đủ điều kiện làm Juror
    const jurorsRes = await pool.query(
      `SELECT wallet_address, reputation_score 
       FROM user_profiles 
       WHERE juror_eligible = true 
         AND wallet_address != $1 
         AND wallet_address != $2
       ORDER BY reputation_score DESC, wallet_address ASC
       LIMIT 5`,
      [sellerLower, buyerLower]
    );

    if (jurorsRes.rows.length < 5) {
      console.warn(`   ⚠️ Oracle: Only found ${jurorsRes.rows.length} eligible jurors. Required 5. Oracle waits.`);
      return;
    }

    const selectedJurors = jurorsRes.rows.map(row => row.wallet_address);
    console.log(`   Selected Top 5 Jurors:`, selectedJurors);

    // 4. Gửi giao dịch setJurors lên blockchain bằng ví Oracle
    if (!walletClient) {
      console.error(`   ❌ Oracle: walletClient (deployer) is not configured in backend.`);
      return;
    }

    const [oracleAccount] = await walletClient.getAddresses();
    console.log(`   Oracle is sending setJurors transaction using account: ${oracleAccount}...`);

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'setJurors',
      args: [BigInt(disputeId), selectedJurors as any],
      account: oracleAccount,
    });

    console.log(`   ✅ Oracle: Jurors assigned successfully on-chain! Tx Hash: ${txHash}`);

  } catch (error) {
    console.error(`   ❌ Oracle: Error selecting/assigning jurors for Dispute #${disputeId}:`, error);
  }
}
