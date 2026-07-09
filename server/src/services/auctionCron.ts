/**
 * Auction Cron Service — Tự động kết thúc phiên đấu giá hết hạn
 * 
 * Giải quyết "Trigger Problem" trong EVM:
 * EVM không thể tự chạy code khi hết giờ → cần agent bên ngoài gọi endAuction().
 * 
 * Cron chạy mỗi 30 giây, kiểm tra DB tìm phiên đã hết thời gian và gọi on-chain.
 */

import { publicClient, walletClient, CONTRACT_ADDRESSES, AUCTION_EXCHANGE_ABI, DISPUTE_RESOLUTION_ABI } from '../config/blockchain';
import pool from '../config/db';
import { assignJurorsAutomatically } from './oracleService';

let cronInterval: ReturnType<typeof setInterval> | null = null;

async function checkAndEndExpiredAuctions(): Promise<void> {
  if (!walletClient) {
    console.warn('⚠️ Cron: No wallet client configured (missing DEPLOYER_PRIVATE_KEY). Skipping.');
    return;
  }

  try {
    // Tìm phiên đấu giá đã hết thời gian nhưng vẫn active
    const result = await pool.query(
      `SELECT auction_id FROM auctions WHERE active = true AND end_time <= NOW()`
    );

    if (result.rows.length === 0) return;

    console.log(`\n⏰ Cron: Found ${result.rows.length} expired auction(s) to end`);

    for (const row of result.rows) {
      const auctionId = row.auction_id;

      try {
        // Kiểm tra trạng thái on-chain trước khi gọi
        const onChainAuction = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.AuctionExchange,
          abi: AUCTION_EXCHANGE_ABI,
          functionName: 'auctions',
          args: [BigInt(auctionId)],
        });

        const isActive = onChainAuction[7]; // active = index 7
        if (!isActive) {
          // Đã kết thúc on-chain, sync DB
          await pool.query('UPDATE auctions SET active = false WHERE auction_id = $1', [auctionId]);
          console.log(`   ⏭️ Auction #${auctionId} already ended on-chain, synced DB`);
          continue;
        }

        // Gọi endAuction on-chain
        console.log(`   🔨 Ending auction #${auctionId}...`);
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.AuctionExchange,
          abi: AUCTION_EXCHANGE_ABI,
          functionName: 'endAuction',
          args: [BigInt(auctionId)],
        });

        // Đợi tx confirm
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`   ✅ Auction #${auctionId} ended! tx: ${receipt.transactionHash}`);
      } catch (err: any) {
        console.error(`   ❌ Failed to end auction #${auctionId}:`, err.message || err);
      }
    }
  } catch (err) {
    console.error('❌ Cron check failed:', err);
  }
}

async function checkAndUpdateDisputes(): Promise<void> {
  if (!walletClient) return;

  try {
    const [oracleAccount] = await walletClient.getAddresses();

    // Lấy tất cả các tranh chấp chưa được đánh dấu là resolved trong DB kèm theo dispute_type từ bảng auctions
    const activeDisputes = await pool.query(
      `SELECT d.dispute_id, d.auction_id, d.phase, d.resolved, a.dispute_type 
       FROM disputes d
       JOIN auctions a ON d.auction_id = a.auction_id
       WHERE d.resolved = false`
    );

    if (activeDisputes.rows.length === 0) return;

    // Lấy block mới nhất trên blockchain để đồng bộ mốc thời gian
    const latestBlock = await publicClient.getBlock();
    const blockTimestamp = Number(latestBlock.timestamp);

    const phaseMap: Record<number, string> = {
      0: 'EVIDENCE',
      1: 'COMMIT',
      2: 'REVEAL',
      3: 'RESOLVED'
    };

    for (const d of activeDisputes.rows) {
      const disputeId = Number(d.dispute_id);
      const auctionId = Number(d.auction_id);
      const dbPhase = d.phase;
      const disputeType = d.dispute_type;
      
      const isGameTheory = Number(disputeType) === 1 || disputeType === 'GAME_THEORY_ESCROW';
      
      if (isGameTheory) {
        // Game Theory không sử dụng Oracle hay pha giải quyết của Jury Voting, bỏ qua
        continue;
      }

      try {
        // Đọc trạng thái on-chain trực tiếp của tranh chấp này
        const disputeInfo = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.DisputeResolution,
          abi: DISPUTE_RESOLUTION_ABI,
          functionName: 'disputes',
          args: [BigInt(disputeId)]
        });

        const onChainPhaseNum = Number(disputeInfo[6]);
        const onChainPhase = phaseMap[onChainPhaseNum] || 'EVIDENCE';
        const onChainEvidenceDeadline = disputeInfo[7];
        const onChainCommitDeadline = disputeInfo[8];
        const onChainRevealDeadline = disputeInfo[9];
        const onChainBuyerVotes = Number(disputeInfo[10]);
        const onChainSellerVotes = Number(disputeInfo[11]);
        const onChainAbstainCount = Number(disputeInfo[12]);
        const onChainResolved = disputeInfo[13];

        // 1. Cơ chế Tự sửa lỗi (Self-Healing Sync):
        // Nếu pha hoặc trạng thái on-chain khác với database, lập tức đồng bộ DB theo blockchain
        if (dbPhase !== onChainPhase || onChainResolved) {
          console.log(`🔄 Sync: Mismatch detected for Dispute #${disputeId}. DB Phase: ${dbPhase}, Blockchain Phase: ${onChainPhase}. Syncing...`);
          
          await pool.query(
            `UPDATE disputes 
             SET 
               phase = $1, 
               evidence_deadline = $2,
               commit_deadline = $3,
               reveal_deadline = $4,
               buyer_votes = $5,
               seller_votes = $6,
               abstain_count = $7,
               resolved = $8,
               updated_at = NOW() 
             WHERE dispute_id = $9`,
            [
              onChainPhase,
              onChainEvidenceDeadline ? new Date(Number(onChainEvidenceDeadline) * 1000).toISOString() : null,
              onChainCommitDeadline ? new Date(Number(onChainCommitDeadline) * 1000).toISOString() : null,
              onChainRevealDeadline ? new Date(Number(onChainRevealDeadline) * 1000).toISOString() : null,
              onChainBuyerVotes,
              onChainSellerVotes,
              onChainAbstainCount,
              onChainResolved,
              disputeId
            ]
          );
          
          console.log(`   ✅ Synced Dispute #${disputeId} state to DB successfully.`);
          continue; // Đã đồng bộ xong, bỏ qua kiểm tra hết hạn ở chu kỳ này
        }

        // 2. So sánh thời hạn hết pha dựa trên block.timestamp
        if (onChainPhase === 'EVIDENCE') {
          if (onChainEvidenceDeadline && Number(onChainEvidenceDeadline) <= blockTimestamp) {
            console.log(`⏰ Cron: EVIDENCE expired for Dispute #${disputeId}. Triggering juror assignment...`);
            await assignJurorsAutomatically(disputeId, auctionId);
          }
        } 
        else if (onChainPhase === 'COMMIT') {
          if (onChainCommitDeadline && Number(onChainCommitDeadline) <= blockTimestamp) {
            console.log(`⏰ Cron: COMMIT expired for Dispute #${disputeId}. Advancing to REVEAL...`);
            try {
              const hash = await walletClient.writeContract({
                address: CONTRACT_ADDRESSES.DisputeResolution,
                abi: DISPUTE_RESOLUTION_ABI,
                functionName: 'checkAndUpdatePhase',
                args: [BigInt(disputeId)],
                account: oracleAccount,
              });
              console.log(`   ✅ Sent checkAndUpdatePhase for Dispute #${disputeId}. Tx: ${hash}`);
            } catch (err: any) {
              console.error(`   ❌ Failed to advance phase for Dispute #${disputeId}:`, err.message || err);
            }
          }
        } 
        else if (onChainPhase === 'REVEAL') {
          if (onChainRevealDeadline && Number(onChainRevealDeadline) <= blockTimestamp) {
            console.log(`⏰ Cron: REVEAL expired for Dispute #${disputeId}. Resolving dispute...`);
            try {
              const hash = await walletClient.writeContract({
                address: CONTRACT_ADDRESSES.DisputeResolution,
                abi: DISPUTE_RESOLUTION_ABI,
                functionName: 'resolveDispute',
                args: [BigInt(disputeId)],
                account: oracleAccount,
              });
              console.log(`   ✅ Sent resolveDispute for Dispute #${disputeId}. Tx: ${hash}`);
            } catch (err: any) {
              console.error(`   ❌ Failed to resolve dispute #${disputeId}:`, err.message || err);
            }
          }
        }

      } catch (disputeErr: any) {
        console.error(`❌ Cron error processing individual Dispute #${disputeId}:`, disputeErr.message || disputeErr);
      }
    }

  } catch (err) {
    console.error('❌ Cron checkAndUpdateDisputes failed:', err);
  }
}

async function runCronCycle(): Promise<void> {
  await checkAndEndExpiredAuctions();
  await checkAndUpdateDisputes();
}

export function startAuctionCron(): void {
  console.log('⏰ Starting System Cron Job (every 10s)...');

  // Chạy ngay lần đầu
  runCronCycle();

  // Sau đó chạy mỗi 10 giây
  cronInterval = setInterval(runCronCycle, 10_000);

  console.log('   ✅ Cron job is running\n');
}

export function stopAuctionCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('⏰ Cron job stopped');
  }
}
