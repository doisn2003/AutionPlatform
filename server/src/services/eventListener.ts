/**
 * Event Listener Service — Lắng nghe sự kiện blockchain & đồng bộ DB
 * 
 * Sử dụng Viem watchContractEvent() cho realtime
 * + getContractEvents() cho catchup khi server restart
 */

import { type Log } from 'viem';
import { publicClient, CONTRACT_ADDRESSES, AUCTION_EXCHANGE_ABI, ADF_NFT_ABI } from '../config/blockchain';
import pool from '../config/db';

// ---- Catchup: Đọc event cũ từ block đã lưu ----
async function catchupEvents(): Promise<void> {
  console.log('📥 Catching up on missed events...');

  // Lấy block cuối đã sync
  const syncResult = await pool.query('SELECT last_synced_block FROM sync_state WHERE id = 1');
  const fromBlock = BigInt(syncResult.rows[0]?.last_synced_block || 0);
  const currentBlock = await publicClient.getBlockNumber();

  if (fromBlock >= currentBlock) {
    console.log('   ✅ Already up to date');
    return;
  }

  console.log(`   Syncing from block ${fromBlock} to ${currentBlock}...`);

  // AuctionCreated events
  const createdEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'AuctionCreated',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of createdEvents) {
    await handleAuctionCreated(event as any);
  }

  // NFTMinted events
  const mintEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.ADF_NFT,
    abi: ADF_NFT_ABI,
    eventName: 'NFTMinted',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of mintEvents) {
    await handleNFTMinted(event as any);
  }

  // BidPlaced events
  const bidEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'BidPlaced',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of bidEvents) {
    await handleBidPlaced(event as any);
  }

  // AuctionEnded events
  const endedEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'AuctionEnded',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of endedEvents) {
    await handleAuctionEnded(event as any);
  }

  // AuctionCanceled events
  const canceledEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'AuctionCanceled',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of canceledEvents) {
    await handleAuctionCanceled(event as any);
  }

  // Cập nhật sync state
  await pool.query('UPDATE sync_state SET last_synced_block = $1, updated_at = NOW() WHERE id = 1', [currentBlock.toString()]);

  console.log(`   ✅ Catchup done. Processed: ${createdEvents.length} created, ${bidEvents.length} bids, ${endedEvents.length} ended, ${canceledEvents.length} canceled`);
}

// ---- Event Handlers ----

async function handleAuctionCreated(event: any): Promise<void> {
  const { auctionId, seller, nftTokenId, endTime, reservePrice, minBidIncrement, assetType, disputeType, escrowDuration } = event.args;
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  // Chuyển endTime (unix timestamp) sang Date
  const endTimeDate = new Date(Number(endTime) * 1000);
  
  // Tính escrow_deadline nếu là PHYSICAL
  let escrowDeadlineDate = null;
  if (assetType === 1) {
    escrowDeadlineDate = new Date((Number(endTime) + Number(escrowDuration)) * 1000);
  }

  const assetTypeStr = assetType === 1 ? 'PHYSICAL' : 'DIGITAL';
  let disputeTypeStr = 'NONE';
  if (disputeType === 1) disputeTypeStr = 'ADMIN_RESOLVE';
  else if (disputeType === 2) disputeTypeStr = 'VOTE_RESOLVE';

  try {
    await pool.query(
      `INSERT INTO auctions (
         auction_id, seller, nft_token_id, end_time, reserve_price, 
         min_bid_increment, tx_hash, block_number, asset_type, dispute_type, phase, escrow_deadline
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (auction_id) DO NOTHING`,
      [
        Number(auctionId),
        seller.toLowerCase(),
        Number(nftTokenId),
        endTimeDate.toISOString(),
        reservePrice.toString(),
        minBidIncrement.toString(),
        txHash,
        Number(blockNumber),
        assetTypeStr,
        disputeTypeStr,
        'BIDDING',
        escrowDeadlineDate ? escrowDeadlineDate.toISOString() : null
      ]
    );

    // Update NFT owner in DB to the exchange contract address (since contract holds the NFT during auction)
    await pool.query(
      `UPDATE nfts SET owner = $1 WHERE token_id = $2`,
      [CONTRACT_ADDRESSES.AuctionExchange.toLowerCase(), Number(nftTokenId)]
    );

    console.log(`   📝 AuctionCreated #${auctionId} by ${seller}`);
  } catch (err) {
    console.error(`   ❌ Error saving AuctionCreated #${auctionId}:`, err);
  }
}

async function handleBidPlaced(event: any): Promise<void> {
  const { auctionId, bidder, amount } = event.args;
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  try {
    // Insert bid record
    await pool.query(
      `INSERT INTO bids (auction_id, bidder, amount, tx_hash, block_number)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        Number(auctionId),
        bidder.toLowerCase(),
        amount.toString(),
        txHash,
        Number(blockNumber),
      ]
    );

    // Update auction current top bid
    await pool.query(
      `UPDATE auctions SET current_top_bidder = $1, current_top_bid = $2 WHERE auction_id = $3`,
      [bidder.toLowerCase(), amount.toString(), Number(auctionId)]
    );

    // Calculate hot_score: (bid_count * 10) + (total_volume in ADF)
    const statsResult = await pool.query(
      `SELECT COUNT(*)::integer as bid_count, COALESCE(SUM(amount::numeric), 0) as total_volume FROM bids WHERE auction_id = $1`,
      [Number(auctionId)]
    );
    
    if (statsResult.rows.length > 0) {
      const bidCount = statsResult.rows[0].bid_count;
      const totalVolumeWei = statsResult.rows[0].total_volume;
      const totalVolumeADF = Number(totalVolumeWei) / 1e18;
      const hotScore = (bidCount * 10) + totalVolumeADF;

      await pool.query(
        `UPDATE auctions SET hot_score = $1 WHERE auction_id = $2`,
        [hotScore, Number(auctionId)]
      );
      console.log(`   🔥 Updated hot_score for Auction #${auctionId} to ${hotScore} (Bids: ${bidCount}, Vol: ${totalVolumeADF.toFixed(2)} ADF)`);
    }

    console.log(`   💰 BidPlaced #${auctionId} by ${bidder} — ${amount.toString()} wei`);
  } catch (err) {
    console.error(`   ❌ Error saving BidPlaced #${auctionId}:`, err);
  }
}

async function handleAuctionEnded(event: any): Promise<void> {
  const { auctionId, winner, amount } = event.args;

  try {
    await pool.query(
      `UPDATE auctions SET active = false, current_top_bidder = $1, current_top_bid = $2 WHERE auction_id = $3`,
      [winner.toLowerCase(), amount.toString(), Number(auctionId)]
    );

    // Get nft_token_id from the auction
    const res = await pool.query(`SELECT nft_token_id, seller FROM auctions WHERE auction_id = $1`, [Number(auctionId)]);
    if (res.rows.length > 0) {
        const nftTokenId = res.rows[0].nft_token_id;
        // If there is a winner (address != 0), update NFT owner. Otherwise, it returns to seller.
        const newOwner = winner !== '0x0000000000000000000000000000000000000000' ? winner : res.rows[0].seller;
        await pool.query(`UPDATE nfts SET owner = $1 WHERE token_id = $2`, [newOwner.toLowerCase(), nftTokenId]);
    }

    console.log(`   🏁 AuctionEnded #${auctionId} — winner: ${winner}`);
  } catch (err) {
    console.error(`   ❌ Error saving AuctionEnded #${auctionId}:`, err);
  }
}

async function handleAuctionCanceled(event: any): Promise<void> {
  const { auctionId } = event.args;

  try {
    await pool.query(
      `UPDATE auctions SET active = false WHERE auction_id = $1`,
      [Number(auctionId)]
    );

    // Get nft_token_id and seller from the auction to revert the NFT owner
    const res = await pool.query(`SELECT nft_token_id, seller FROM auctions WHERE auction_id = $1`, [Number(auctionId)]);
    if (res.rows.length > 0) {
        const nftTokenId = res.rows[0].nft_token_id;
        const seller = res.rows[0].seller;
        await pool.query(`UPDATE nfts SET owner = $1 WHERE token_id = $2`, [seller.toLowerCase(), nftTokenId]);
    }

    console.log(`   ❌ AuctionCanceled #${auctionId}`);
  } catch (err) {
    console.error(`   ❌ Error saving AuctionCanceled #${auctionId}:`, err);
  }
}

async function handleNFTMinted(event: any): Promise<void> {
  const { owner, tokenId } = event.args;
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  try {
    const tokenURI = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.ADF_NFT,
      abi: ADF_NFT_ABI,
      functionName: 'tokenURI',
      args: [tokenId]
    });

    let metadataJSON: any = {};
    try {
        if (typeof tokenURI === 'string' && tokenURI.startsWith('ipfs://')) {
            const cid = tokenURI.replace('ipfs://', '');
            const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
            if(res.ok) metadataJSON = await res.json();
        }
    } catch(e) { console.error('Error fetching metadata', e) }

    await pool.query(
      `INSERT INTO nfts (token_id, owner, token_uri, name, description, image, attributes, tx_hash, block_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (token_id) DO UPDATE SET owner = $2`,
      [
        Number(tokenId),
        owner.toLowerCase(),
        tokenURI,
        metadataJSON.name || '',
        metadataJSON.description || '',
        metadataJSON.image || '',
        metadataJSON.attributes ? JSON.stringify(metadataJSON.attributes) : null,
        txHash,
        Number(blockNumber),
      ]
    );
    console.log(`   🖼️ NFTMinted #${tokenId} by ${owner}`);
  } catch (err) {
    console.error(`   ❌ Error saving NFTMinted #${tokenId}:`, err);
  }
}

// ---- Watch: Lắng nghe event realtime ----
function watchEvents(): void {
  console.log('👁️  Watching for new blockchain events...');

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'AuctionCreated',
    onLogs: (logs) => {
      for (const log of logs) {
        handleAuctionCreated(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.ADF_NFT,
    abi: ADF_NFT_ABI,
    eventName: 'NFTMinted',
    onLogs: (logs) => {
      for (const log of logs) {
        handleNFTMinted(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'BidPlaced',
    onLogs: (logs) => {
      for (const log of logs) {
        handleBidPlaced(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'AuctionEnded',
    onLogs: (logs) => {
      for (const log of logs) {
        handleAuctionEnded(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'AuctionCanceled',
    onLogs: (logs) => {
      for (const log of logs) {
        handleAuctionCanceled(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });
}

async function updateSyncBlock(blockNumber: bigint): Promise<void> {
  try {
    await pool.query(
      'UPDATE sync_state SET last_synced_block = GREATEST(last_synced_block, $1), updated_at = NOW() WHERE id = 1',
      [Number(blockNumber)]
    );
  } catch (err) {
    // Non-critical, log and continue
    console.error('   ⚠️ Failed to update sync state:', err);
  }
}

// ---- Main Export ----
export async function startEventListener(): Promise<void> {
  console.log('\n🔗 Starting Blockchain Event Listener...');
  console.log(`   Contract: ${CONTRACT_ADDRESSES.AuctionExchange}`);
  
  // Catchup first, then watch
  await catchupEvents();
  watchEvents();
  
  console.log('   ✅ Event Listener is running\n');
}
