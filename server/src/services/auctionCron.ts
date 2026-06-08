/**
 * Auction Cron Service — Tự động kết thúc phiên đấu giá hết hạn
 * 
 * Giải quyết "Trigger Problem" trong EVM:
 * EVM không thể tự chạy code khi hết giờ → cần agent bên ngoài gọi endAuction().
 * 
 * Cron chạy mỗi 30 giây, kiểm tra DB tìm phiên đã hết thời gian và gọi on-chain.
 */

import { publicClient, walletClient, CONTRACT_ADDRESSES, AUCTION_EXCHANGE_ABI } from '../config/blockchain';
import pool from '../config/db';

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
        // Có thể lỗi "Auction has not ended yet" nếu thời gian chưa tới on-chain
        console.error(`   ❌ Failed to end auction #${auctionId}:`, err.message || err);
      }
    }
  } catch (err) {
    console.error('❌ Cron check failed:', err);
  }
}

export function startAuctionCron(): void {
  console.log('⏰ Starting Auction Cron Job (every 30s)...');

  // Chạy ngay lần đầu
  checkAndEndExpiredAuctions();

  // Sau đó chạy mỗi 30 giây
  cronInterval = setInterval(checkAndEndExpiredAuctions, 30_000);

  console.log('   ✅ Cron job is running\n');
}

export function stopAuctionCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('⏰ Cron job stopped');
  }
}
