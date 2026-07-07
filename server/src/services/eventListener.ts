/**
 * Event Listener Service — Lắng nghe sự kiện blockchain & đồng bộ DB
 * Updated: 2026-07-07T16:00:00Z
 * Sử dụng Viem watchContractEvent() cho realtime
 * + getContractEvents() cho catchup khi server restart
 */

import { type Log } from 'viem';
import { publicClient, CONTRACT_ADDRESSES, AUCTION_EXCHANGE_ABI, ADF_NFT_ABI, ADF_POOL_ABI, DISPUTE_RESOLUTION_ABI, ADF_ABI } from '../config/blockchain';
import pool from '../config/db';
import { incrementUserStat, recalculateReputation } from './reputationService';
import { assignJurorsAutomatically } from './oracleService';
import { broadcastToAuction } from './socketService';

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

  // EscrowStarted events
  const escrowStartedEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'EscrowStarted',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of escrowStartedEvents) {
    await handleEscrowStarted(event as any);
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

  // SwapETHForADF events
  const swapEthEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.ADF_Pool,
    abi: ADF_POOL_ABI,
    eventName: 'SwapETHForADF',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of swapEthEvents) {
    await handleSwapETHForADF(event as any);
  }

  // SwapADFForETH events
  const swapAdfEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.ADF_Pool,
    abi: ADF_POOL_ABI,
    eventName: 'SwapADFForETH',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of swapAdfEvents) {
    await handleSwapADFForETH(event as any);
  }

  // DeliveryConfirmed events
  const deliveryEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'DeliveryConfirmed',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of deliveryEvents) {
    await handleDeliveryConfirmed(event as any);
  }

  // DisputeOpened events
  const disputeEvents = await publicClient.getContractEvents({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'DisputeOpened',
    fromBlock: fromBlock + 1n,
    toBlock: currentBlock,
  });

  for (const event of disputeEvents) {
    await handleDisputeOpened(event as any);
  }

  // --- DISPUTE RESOLUTION CONTRACT EVENTS ---
  if (CONTRACT_ADDRESSES.DisputeResolution && CONTRACT_ADDRESSES.DisputeResolution !== '0x') {
    // DisputeCreated events
    const disputeCreatedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'DisputeCreated',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of disputeCreatedEvents) {
      await handleDisputeCreated(event as any);
    }

    // JurorsAssigned events
    const jurorsAssignedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorsAssigned',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of jurorsAssignedEvents) {
      await handleJurorsAssigned(event as any);
    }

    // VoteCommitted events
    const voteCommittedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'VoteCommitted',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of voteCommittedEvents) {
      await handleVoteCommitted(event as any);
    }

    // VoteRevealed events
    const voteRevealedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'VoteRevealed',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of voteRevealedEvents) {
      await handleVoteRevealed(event as any);
    }

    // PhaseAdvanced events
    const phaseAdvancedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'PhaseAdvanced',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of phaseAdvancedEvents) {
      await handlePhaseAdvanced(event as any);
    }

    // DisputeResolved events
    const disputeResolvedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'DisputeResolved',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of disputeResolvedEvents) {
      await handleDisputeResolved(event as any);
    }

    // JurorStaked events
    const jurorStakedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorStaked',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of jurorStakedEvents) {
      await handleJurorStaked(event as any);
    }

    // JurorUnstaked events
    const jurorUnstakedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorUnstaked',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of jurorUnstakedEvents) {
      await handleJurorUnstaked(event as any);
    }

    // JurorRewarded events
    const jurorRewardedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorRewarded',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of jurorRewardedEvents) {
      await handleJurorRewarded(event as any);
    }

    // JurorPenalized events
    const jurorPenalizedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorPenalized',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of jurorPenalizedEvents) {
      await handleJurorPenalized(event as any);
    }
    // Withdraw events
    const withdrawEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      eventName: 'Withdraw',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of withdrawEvents) {
      await handleWithdraw(event as any);
    }

    // SellerDeposited events
    const sellerDepositedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      eventName: 'SellerDeposited',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of sellerDepositedEvents) {
      await handleSellerDeposited(event as any);
    }

    // BuyerDeposited events
    const buyerDepositedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      eventName: 'BuyerDeposited',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of buyerDepositedEvents) {
      await handleBuyerDeposited(event as any);
    }

    // EscrowReleased events
    const escrowReleasedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      eventName: 'EscrowReleased',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of escrowReleasedEvents) {
      await handleEscrowReleased(event as any);
    }

    // DepositsBurned events
    const depositsBurnedEvents = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      eventName: 'DepositsBurned',
      fromBlock: fromBlock + 1n,
      toBlock: currentBlock,
    });
    for (const event of depositsBurnedEvents) {
      await handleDepositsBurned(event as any);
    }

    // Transfer events (ERC20)
    if (CONTRACT_ADDRESSES.ADF && CONTRACT_ADDRESSES.ADF !== '0x') {
      const transferEvents = await publicClient.getContractEvents({
        address: CONTRACT_ADDRESSES.ADF,
        abi: ADF_ABI,
        eventName: 'Transfer',
        fromBlock: fromBlock + 1n,
        toBlock: currentBlock,
      });
      for (const event of transferEvents) {
        await handleTransfer(event as any);
      }
    }
  }

  // Cập nhật sync state
  await pool.query('UPDATE sync_state SET last_synced_block = $1, updated_at = NOW() WHERE id = 1', [currentBlock.toString()]);

  console.log(`   ✅ Catchup done. Sync block: ${currentBlock}`);
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
  if (disputeType === 1) disputeTypeStr = 'GAME_THEORY_ESCROW';
  else if (disputeType === 2) disputeTypeStr = 'JURY_VOTING';

  try {
    await pool.query(
      `INSERT INTO auctions (
         auction_id, seller, nft_token_id, end_time, reserve_price, 
         min_bid_increment, tx_hash, block_number, asset_type, dispute_type, phase, escrow_deadline, escrow_duration
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (auction_id) DO UPDATE SET
         asset_type = EXCLUDED.asset_type,
         dispute_type = EXCLUDED.dispute_type,
         escrow_deadline = EXCLUDED.escrow_deadline,
         escrow_duration = EXCLUDED.escrow_duration`,
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
        escrowDeadlineDate ? escrowDeadlineDate.toISOString() : null,
        Number(escrowDuration)
      ]
    );

    // Update NFT owner in DB to the exchange contract address (since contract holds the NFT during auction)
    await pool.query(
      `UPDATE nfts SET owner = $1 WHERE token_id = $2`,
      [CONTRACT_ADDRESSES.AuctionExchange.toLowerCase(), Number(nftTokenId)]
    );

    // Update user stats
    await incrementUserStat(seller, 'total_auctions_created');

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
    }

    // Update user stats
    await incrementUserStat(bidder, 'total_bids_placed');
    await logUserTransaction(txHash, bidder, 'AUCTION_BID', amount, false);

    // Broadcast real-time message to chat room
    const amountAdf = (Number(amount) / 1e18).toFixed(2);
    const bidderShort = `${bidder.slice(0, 6)}...${bidder.slice(-4)}`;
    broadcastToAuction(
      Number(auctionId),
      `${bidderShort} đã đặt giá thầu dẫn đầu mới: ${amountAdf} ADF.`
    );

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

    // Get nft_token_id, seller, asset_type from the auction
    const res = await pool.query(`SELECT nft_token_id, seller, asset_type FROM auctions WHERE auction_id = $1`, [Number(auctionId)]);
    if (res.rows.length > 0) {
      const { nft_token_id, seller, asset_type } = res.rows[0];
      const hasWinner = winner !== '0x0000000000000000000000000000000000000000';
      const newOwner = hasWinner ? winner : seller;

      // Update NFT owner in DB
      await pool.query(`UPDATE nfts SET owner = $1 WHERE token_id = $2`, [newOwner.toLowerCase(), nft_token_id]);

      // Update user stats
      if (hasWinner) {
        await incrementUserStat(winner, 'total_bids_won');

        // If DIGITAL asset, delivery is immediate -> successful_delivery + RESOLVED
        if (asset_type === 'DIGITAL') {
          await incrementUserStat(seller, 'successful_deliveries');
          await pool.query(`UPDATE auctions SET phase = 'RESOLVED' WHERE auction_id = $1`, [Number(auctionId)]);
        } else {
          // PHYSICAL enters ESCROW_HOLDING
          await pool.query(`UPDATE auctions SET phase = 'ESCROW_HOLDING' WHERE auction_id = $1`, [Number(auctionId)]);
        }
      }
    }

    console.log(`   🏁 AuctionEnded #${auctionId} — winner: ${winner}`);
  } catch (err) {
    console.error(`   ❌ Error saving AuctionEnded #${auctionId}:`, err);
  }
}

async function handleEscrowStarted(event: any): Promise<void> {
  const { auctionId, buyer, seller, deadline } = event.args;

  try {
    const deadlineDate = new Date(Number(deadline) * 1000);
    await pool.query(
      `UPDATE auctions 
       SET active = false, 
           phase = 'ESCROW_HOLDING', 
           escrow_deadline = $1, 
           current_top_bidder = $2 
       WHERE auction_id = $3`,
      [deadlineDate.toISOString(), buyer.toLowerCase(), Number(auctionId)]
    );

    const res = await pool.query(`SELECT nft_token_id FROM auctions WHERE auction_id = $1`, [Number(auctionId)]);
    if (res.rows.length > 0) {
      const nftTokenId = res.rows[0].nft_token_id;
      await pool.query(
        `UPDATE nfts SET owner = $1 WHERE token_id = $2`,
        [CONTRACT_ADDRESSES.AuctionExchange.toLowerCase(), nftTokenId]
      );
    }

    console.log(`   🏁 EscrowStarted #${auctionId} — buyer: ${buyer}, deadline: ${deadlineDate.toISOString()}`);
  } catch (err) {
    console.error(`   ❌ Error saving EscrowStarted #${auctionId}:`, err);
  }
}

async function handleAuctionCanceled(event: any): Promise<void> {
  const { auctionId } = event.args;

  try {
    await pool.query(
      `UPDATE auctions SET active = false, phase = 'CANCELED' WHERE auction_id = $1`,
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
        if (res.ok) metadataJSON = await res.json();
      }
    } catch (e) { console.error('Error fetching metadata', e) }

    await pool.query(
      `INSERT INTO nfts (token_id, owner, token_uri, name, description, image, images, attributes, tx_hash, block_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (token_id) DO UPDATE SET owner = $2, images = $7`,
      [
        Number(tokenId),
        owner.toLowerCase(),
        tokenURI,
        metadataJSON.name || '',
        metadataJSON.description || '',
        metadataJSON.image || '',
        metadataJSON.images ? JSON.stringify(metadataJSON.images) : null,
        metadataJSON.attributes ? JSON.stringify(metadataJSON.attributes) : null,
        txHash,
        Number(blockNumber),
      ]
    );

    // Update user stats
    await incrementUserStat(owner, 'total_nfts_minted');

    console.log(`   🖼️ NFTMinted #${tokenId} by ${owner}`);
  } catch (err) {
    console.error(`   ❌ Error saving NFTMinted #${tokenId}:`, err);
  }
}

async function handleSwapETHForADF(event: any): Promise<void> {
  const { buyer, ethIn, adfOut, feeCollected } = event.args;
  const txHash = event.transactionHash;

  try {
    await pool.query(
      `INSERT INTO swap_history (tx_hash, user_address, swap_type, amount_in, amount_out, fee_collected)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tx_hash) DO NOTHING`,
      [
        txHash,
        buyer.toLowerCase(),
        'ETH_TO_ADF',
        ethIn.toString(),
        adfOut.toString(),
        feeCollected.toString()
      ]
    );
    await logUserTransaction(txHash, buyer, 'SWAP_ETH_TO_ADF', adfOut, true);
    console.log(`   💱 SwapETHForADF: ${buyer} swapped ${Number(ethIn) / 1e18} ETH for ${Number(adfOut) / 1e18} ADF`);
  } catch (err) {
    console.error(`   ❌ Error saving SwapETHForADF:`, err);
  }
}

async function handleSwapADFForETH(event: any): Promise<void> {
  const { seller, adfIn, ethOut, feeCollected } = event.args;
  const txHash = event.transactionHash;

  try {
    await pool.query(
      `INSERT INTO swap_history (tx_hash, user_address, swap_type, amount_in, amount_out, fee_collected)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tx_hash) DO NOTHING`,
      [
        txHash,
        seller.toLowerCase(),
        'ADF_TO_ETH',
        adfIn.toString(),
        ethOut.toString(),
        feeCollected.toString()
      ]
    );
    await logUserTransaction(txHash, seller, 'SWAP_ADF_TO_ETH', adfIn, false);
    console.log(`   💱 SwapADFForETH: ${seller} swapped ${Number(adfIn) / 1e18} ADF for ${Number(ethOut) / 1e18} ETH`);
  } catch (err) {
    console.error(`   ❌ Error saving SwapADFForETH:`, err);
  }
}

async function handleDeliveryConfirmed(event: any): Promise<void> {
  const { auctionId } = event.args;

  try {
    // Set auction phase to RESOLVED in DB
    await pool.query(
      `UPDATE auctions SET phase = 'RESOLVED' WHERE auction_id = $1`,
      [Number(auctionId)]
    );

    // Get current_top_bidder and nft_token_id to update NFT ownership
    const result = await pool.query(
      `SELECT current_top_bidder, nft_token_id, seller FROM auctions WHERE auction_id = $1`,
      [Number(auctionId)]
    );

    if (result.rows.length > 0) {
      const { current_top_bidder, nft_token_id, seller } = result.rows[0];
      await incrementUserStat(seller, 'successful_deliveries');

      if (current_top_bidder) {
        await pool.query(
          `UPDATE nfts SET owner = $1 WHERE token_id = $2`,
          [current_top_bidder.toLowerCase(), Number(nft_token_id)]
        );
        console.log(`   🖼️ NFT #${nft_token_id} owner updated in DB to buyer: ${current_top_bidder}`);
      }
    }

    console.log(`   📦 DeliveryConfirmed for Auction #${auctionId}`);
  } catch (err) {
    console.error(`   ❌ Error saving DeliveryConfirmed #${auctionId}:`, err);
  }
}

async function handleDisputeOpened(event: any): Promise<void> {
  const { auctionId, initiator, evidenceIPFS } = event.args;

  try {
    // Set auction phase to DISPUTE_OPENED in DB
    await pool.query(
      `UPDATE auctions SET phase = 'DISPUTE_OPENED' WHERE auction_id = $1`,
      [Number(auctionId)]
    );

    // Track dispute opened stat for initiator
    await incrementUserStat(initiator, 'total_disputes_filed');

    // Get nft_token_id and seller to return NFT ownership back to seller in DB
    const res = await pool.query(
      `SELECT nft_token_id, seller FROM auctions WHERE auction_id = $1`,
      [Number(auctionId)]
    );
    if (res.rows.length > 0) {
      const { nft_token_id, seller } = res.rows[0];
      await pool.query(
        `UPDATE nfts SET owner = $1 WHERE token_id = $2`,
        [seller.toLowerCase(), Number(nft_token_id)]
      );
      console.log(`   🖼️ NFT #${nft_token_id} owner updated back to seller: ${seller}`);
    }

    console.log(`   ⚖️ DisputeOpened for Auction #${auctionId} by ${initiator}`);
  } catch (err) {
    console.error(`   ❌ Error saving DisputeOpened #${auctionId}:`, err);
  }
}

// --- DISPUTE RESOLUTION EVENT HANDLERS ---

async function handleDisputeCreated(event: any): Promise<void> {
  const { disputeId, auctionId, initiator } = event.args;
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  try {
    // Đọc thông tin chi tiết tranh chấp từ smart contract
    const onChainDispute = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'disputes',
      args: [BigInt(disputeId)]
    });

    const buyer = onChainDispute[1];
    const seller = onChainDispute[2];
    const initiatorAddress = onChainDispute[3];
    const buyerEvidenceIPFS = onChainDispute[4];
    const sellerEvidenceIPFS = onChainDispute[5];
    const phaseVal = onChainDispute[6];
    const evidenceDeadline = onChainDispute[7];
    const commitDeadline = onChainDispute[8];
    const revealDeadline = onChainDispute[9];
    const buyerVotes = onChainDispute[10];
    const sellerVotes = onChainDispute[11];
    const abstainCount = onChainDispute[12];
    const resolved = onChainDispute[13];

    const phaseStr = ['EVIDENCE', 'COMMIT', 'REVEAL', 'RESOLVED'][Number(phaseVal)] || 'EVIDENCE';

    await pool.query(
      `INSERT INTO disputes (
         dispute_id, auction_id, buyer, seller, initiator, 
         buyer_evidence_ipfs, seller_evidence_ipfs, phase, 
         evidence_deadline, commit_deadline, reveal_deadline, 
         buyer_votes, seller_votes, abstain_count, resolved, 
         tx_hash, block_number
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (auction_id) DO UPDATE SET
         dispute_id = EXCLUDED.dispute_id,
         phase = EXCLUDED.phase,
         buyer_evidence_ipfs = COALESCE(EXCLUDED.buyer_evidence_ipfs, disputes.buyer_evidence_ipfs),
         seller_evidence_ipfs = COALESCE(EXCLUDED.seller_evidence_ipfs, disputes.seller_evidence_ipfs),
         evidence_deadline = EXCLUDED.evidence_deadline,
         commit_deadline = EXCLUDED.commit_deadline,
         reveal_deadline = EXCLUDED.reveal_deadline,
         buyer_votes = EXCLUDED.buyer_votes,
         seller_votes = EXCLUDED.seller_votes,
         abstain_count = EXCLUDED.abstain_count,
         resolved = EXCLUDED.resolved,
         tx_hash = EXCLUDED.tx_hash,
         block_number = EXCLUDED.block_number,
         updated_at = NOW()`,
      [
        Number(disputeId),
        Number(auctionId),
        buyer.toLowerCase(),
        seller.toLowerCase(),
        initiatorAddress.toLowerCase(),
        buyerEvidenceIPFS || null,
        sellerEvidenceIPFS || null,
        phaseStr,
        evidenceDeadline ? new Date(Number(evidenceDeadline) * 1000).toISOString() : null,
        commitDeadline ? new Date(Number(commitDeadline) * 1000).toISOString() : null,
        revealDeadline ? new Date(Number(revealDeadline) * 1000).toISOString() : null,
        Number(buyerVotes),
        Number(sellerVotes),
        Number(abstainCount),
        resolved,
        txHash,
        Number(blockNumber)
      ]
    );

    // Cập nhật số lần mở tranh chấp
    await incrementUserStat(initiator, 'total_disputes_filed');

    console.log(`   ⚖️ DisputeCreated #${disputeId} synced — Auction #${auctionId}`);

    // Tự động kích hoạt gán Trọng tài (Oracle Service)
    assignJurorsAutomatically(Number(disputeId), Number(auctionId)).catch(err => {
      console.error(`   ❌ Oracle assignment trigger failed:`, err);
    });
  } catch (err) {
    console.error(`   ❌ Error saving DisputeCreated #${disputeId}:`, err);
  }
}

async function handleJurorsAssigned(event: any): Promise<void> {
  const { disputeId, jurors } = event.args;

  try {
    const disputeInfo = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'disputes',
      args: [BigInt(disputeId)]
    });
    const commitDeadline = disputeInfo[8];

    const jurorsLower = jurors.map((j: string) => j.toLowerCase());

    // Cập nhật bảng disputes
    await pool.query(
      `UPDATE disputes 
       SET 
         selected_jurors = $1, 
         phase = 'COMMIT',
         commit_deadline = $2,
         updated_at = NOW()
       WHERE dispute_id = $3`,
      [
        jurorsLower,
        commitDeadline ? new Date(Number(commitDeadline) * 1000).toISOString() : null,
        Number(disputeId)
      ]
    );

    // Khởi tạo các dòng trống cho trọng tài bầu chọn
    for (const juror of jurorsLower) {
      await pool.query(
        `INSERT INTO dispute_votes (dispute_id, juror)
         VALUES ($1, $2)
         ON CONFLICT (dispute_id, juror) DO NOTHING`,
        [Number(disputeId), juror]
      );
    }

    console.log(`   👥 JurorsAssigned for Dispute #${disputeId} synced: ${jurorsLower.join(', ')}`);
  } catch (err) {
    console.error(`   ❌ Error saving JurorsAssigned #${disputeId}:`, err);
  }
}

async function handleVoteCommitted(event: any): Promise<void> {
  const { disputeId, juror, commitHash } = event.args;
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  try {
    await pool.query(
      `INSERT INTO dispute_votes (dispute_id, juror, has_committed, commit_hash, tx_hash, block_number, updated_at)
       VALUES ($1, $2, true, $3, $4, $5, NOW())
       ON CONFLICT (dispute_id, juror) DO UPDATE SET
         has_committed = true,
         commit_hash = EXCLUDED.commit_hash,
         tx_hash = EXCLUDED.tx_hash,
         block_number = EXCLUDED.block_number,
         updated_at = NOW()`,
      [
        Number(disputeId),
        juror.toLowerCase(),
        commitHash,
        txHash,
        Number(blockNumber)
      ]
    );

    // Đọc trạng thái phase phòng khi tự chuyển pha REVEAL
    const disputeInfo = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'disputes',
      args: [BigInt(disputeId)]
    });
    const phaseVal = disputeInfo[6];
    const revealDeadline = disputeInfo[9];

    if (Number(phaseVal) === 2) { // 2 = REVEAL
      await pool.query(
        `UPDATE disputes 
         SET 
           phase = 'REVEAL', 
           reveal_deadline = $1,
           updated_at = NOW() 
         WHERE dispute_id = $2`,
        [
          revealDeadline ? new Date(Number(revealDeadline) * 1000).toISOString() : null,
          Number(disputeId)
        ]
      );
      console.log(`   🔔 Dispute #${disputeId} phase auto-advanced to REVEAL in DB`);
    }

    console.log(`   🔒 VoteCommitted synced — Dispute #${disputeId} by ${juror}`);
  } catch (err) {
    console.error(`   ❌ Error saving VoteCommitted #${disputeId}:`, err);
  }
}

async function handleVoteRevealed(event: any): Promise<void> {
  const { disputeId, juror, vote } = event.args;
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  try {
    await pool.query(
      `INSERT INTO dispute_votes (dispute_id, juror, has_revealed, revealed_vote, tx_hash, block_number, updated_at)
       VALUES ($1, $2, true, $3, $4, $5, NOW())
       ON CONFLICT (dispute_id, juror) DO UPDATE SET
         has_revealed = true,
         revealed_vote = EXCLUDED.revealed_vote,
         tx_hash = EXCLUDED.tx_hash,
         block_number = EXCLUDED.block_number,
         updated_at = NOW()`,
      [
        Number(disputeId),
        juror.toLowerCase(),
        Number(vote),
        txHash,
        Number(blockNumber)
      ]
    );

    // Đồng bộ số lượng phiếu bầu hiện tại
    if (Number(vote) === 1) {
      await pool.query(`UPDATE disputes SET buyer_votes = buyer_votes + 1, updated_at = NOW() WHERE dispute_id = $1`, [Number(disputeId)]);
    } else if (Number(vote) === 2) {
      await pool.query(`UPDATE disputes SET seller_votes = seller_votes + 1, updated_at = NOW() WHERE dispute_id = $1`, [Number(disputeId)]);
    }

    console.log(`   🔓 VoteRevealed synced — Dispute #${disputeId} by ${juror} (Vote: ${vote})`);
  } catch (err) {
    console.error(`   ❌ Error saving VoteRevealed #${disputeId}:`, err);
  }
}

async function handlePhaseAdvanced(event: any): Promise<void> {
  const { disputeId, newPhase } = event.args;

  try {
    const disputeInfo = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'disputes',
      args: [BigInt(disputeId)]
    });

    const phaseMap: Record<number, string> = {
      0: 'EVIDENCE',
      1: 'COMMIT',
      2: 'REVEAL',
      3: 'RESOLVED'
    };

    const phaseStr = phaseMap[Number(newPhase)] || 'EVIDENCE';
    const commitDeadline = disputeInfo[8];
    const revealDeadline = disputeInfo[9];

    await pool.query(
      `UPDATE disputes 
       SET 
         phase = $1, 
         commit_deadline = $2,
         reveal_deadline = $3,
         updated_at = NOW() 
       WHERE dispute_id = $4`,
      [
        phaseStr,
        commitDeadline ? new Date(Number(commitDeadline) * 1000).toISOString() : null,
        revealDeadline ? new Date(Number(revealDeadline) * 1000).toISOString() : null,
        Number(disputeId)
      ]
    );

    console.log(`   🔔 PhaseAdvanced synced — Dispute #${disputeId} new phase: ${phaseStr}`);
  } catch (err) {
    console.error(`   ❌ Error saving PhaseAdvanced #${disputeId}:`, err);
  }
}

async function handleDisputeResolved(event: any): Promise<void> {
  const { disputeId, winner, buyerVotes, sellerVotes, abstainCount } = event.args;

  try {
    const winnerAddress = winner.toLowerCase();

    // Cập nhật tranh chấp
    await pool.query(
      `UPDATE disputes 
       SET 
         resolved = true,
         phase = 'RESOLVED',
         winner = $1,
         buyer_votes = $2,
         seller_votes = $3,
         abstain_count = $4,
         updated_at = NOW()
       WHERE dispute_id = $5`,
      [
        winnerAddress,
        Number(buyerVotes),
        Number(sellerVotes),
        Number(abstainCount),
        Number(disputeId)
      ]
    );

    // Lấy thông tin dispute để cập nhật stats và đấu giá
    const res = await pool.query(`SELECT auction_id, buyer, seller FROM disputes WHERE dispute_id = $1`, [Number(disputeId)]);
    if (res.rows.length > 0) {
      const { auction_id, buyer, seller } = res.rows[0];

      // Đánh dấu đấu giá là RESOLVED
      await pool.query(`UPDATE auctions SET phase = 'RESOLVED' WHERE auction_id = $1`, [auction_id]);

      const isBuyerWinner = winnerAddress === buyer.toLowerCase();
      const buyerProfile = buyer.toLowerCase();
      const sellerProfile = seller.toLowerCase();

      // Cập nhật thống kê thắng/thua
      if (isBuyerWinner) {
        await incrementUserStat(buyerProfile, 'total_disputes_won');
        await incrementUserStat(sellerProfile, 'total_disputes_lost');
      } else {
        await incrementUserStat(sellerProfile, 'total_disputes_won');
        await incrementUserStat(buyerProfile, 'total_disputes_lost');
      }

      // Cập nhật quyền sở hữu NFT trong cơ sở dữ liệu:
      // - Nếu Buyer thắng -> Giao dịch hủy -> NFT trả về cho Seller
      // - Nếu Seller thắng -> Giao dịch hoàn tất -> NFT chuyển sang Buyer
      const auctionRes = await pool.query(`SELECT nft_token_id FROM auctions WHERE auction_id = $1`, [auction_id]);
      if (auctionRes.rows.length > 0) {
        const nftTokenId = Number(auctionRes.rows[0].nft_token_id);
        const nftNewOwner = isBuyerWinner ? sellerProfile : buyerProfile;
        
        await pool.query(
          `UPDATE nfts SET owner = $1, updated_at = NOW() WHERE token_id = $2`,
          [nftNewOwner, nftTokenId]
        );
        console.log(`   🎨 Sync NFT Owner: NFT #${nftTokenId} ownership updated to ${nftNewOwner}`);
      }
    }

    console.log(`   ⚖️ DisputeResolved #${disputeId} synced — Winner: ${winner}`);
  } catch (err) {
    console.error(`   ❌ Error saving DisputeResolved #${disputeId}:`, err);
  }
}

async function handleJurorStaked(event: any): Promise<void> {
  const { juror, amount } = event.args;
  const txHash = event.transactionHash;

  try {
    const jurorAddress = juror.toLowerCase();
    await pool.query(
      `UPDATE user_profiles 
       SET adf_staked_for_juror = adf_staked_for_juror + $1, updated_at = NOW() 
       WHERE wallet_address = $2`,
      [amount.toString(), jurorAddress]
    );
    await logUserTransaction(txHash, juror, 'JUROR_STAKE', amount, false);
    await recalculateReputation(jurorAddress);
    console.log(`   🛡️ JurorStaked synced: ${jurorAddress} staked +${Number(amount) / 1e18} ADF`);
  } catch (err) {
    console.error(`   ❌ Error saving JurorStaked:`, err);
  }
}

async function handleJurorUnstaked(event: any): Promise<void> {
  const { juror, amount } = event.args;
  const txHash = event.transactionHash;

  try {
    const jurorAddress = juror.toLowerCase();
    await pool.query(
      `UPDATE user_profiles 
       SET adf_staked_for_juror = adf_staked_for_juror - $1, updated_at = NOW() 
       WHERE wallet_address = $2`,
      [amount.toString(), jurorAddress]
    );
    await logUserTransaction(txHash, juror, 'JUROR_UNSTAKE', amount, true);
    await recalculateReputation(jurorAddress);
    console.log(`   🛡️ JurorUnstaked synced: ${jurorAddress} unstaked -${Number(amount) / 1e18} ADF`);
  } catch (err) {
    console.error(`   ❌ Error saving JurorUnstaked:`, err);
  }
}

async function handleJurorRewarded(event: any): Promise<void> {
  const { juror, amount } = event.args;
  const txHash = event.transactionHash;

  try {
    const jurorAddress = juror.toLowerCase();

    // 1. Cập nhật số dư stake trong profile
    await pool.query(
      `UPDATE user_profiles 
       SET adf_staked_for_juror = adf_staked_for_juror + $1, updated_at = NOW() 
       WHERE wallet_address = $2`,
      [amount.toString(), jurorAddress]
    );

    // 2. Cập nhật số tiền thưởng vào bảng dispute_votes cho vụ tranh chấp tương ứng
    await pool.query(
      `UPDATE dispute_votes 
       SET reward_amount = $1, updated_at = NOW() 
       WHERE LOWER(juror) = $2 AND dispute_id = (
         SELECT dispute_id FROM disputes 
         WHERE selected_jurors @> ARRAY[$2::varchar] 
         ORDER BY created_at DESC LIMIT 1
       )`,
      [amount.toString(), jurorAddress]
    );

    await logUserTransaction(txHash, juror, 'JUROR_REWARD', amount, true);
    await recalculateReputation(jurorAddress);
    console.log(`   🎁 JurorRewarded synced: ${jurorAddress} rewarded +${Number(amount) / 1e18} ADF`);
  } catch (err) {
    console.error(`   ❌ Error saving JurorRewarded:`, err);
  }
}

async function handleJurorPenalized(event: any): Promise<void> {
  const { juror, amount } = event.args;
  const txHash = event.transactionHash;

  try {
    const jurorAddress = juror.toLowerCase();

    // 1. Cập nhật số dư stake trong profile
    await pool.query(
      `UPDATE user_profiles 
       SET adf_staked_for_juror = adf_staked_for_juror - $1, updated_at = NOW() 
       WHERE wallet_address = $2`,
      [amount.toString(), jurorAddress]
    );

    // 2. Cập nhật số tiền phạt vào bảng dispute_votes cho vụ tranh chấp tương ứng
    await pool.query(
      `UPDATE dispute_votes 
       SET penalty_amount = $1, updated_at = NOW() 
       WHERE LOWER(juror) = $2 AND dispute_id = (
         SELECT dispute_id FROM disputes 
         WHERE selected_jurors @> ARRAY[$2::varchar] 
         ORDER BY created_at DESC LIMIT 1
       )`,
      [amount.toString(), jurorAddress]
    );

    await logUserTransaction(txHash, juror, 'JUROR_PENALTY', amount, false);
    await recalculateReputation(jurorAddress);
    console.log(`   🔨 JurorPenalized synced: ${jurorAddress} penalized -${Number(amount) / 1e18} ADF`);
  } catch (err) {
    console.error(`   ❌ Error saving JurorPenalized:`, err);
  }
}

// ---- Sổ cái Giao dịch & Biến động Số dư ----

async function logUserTransaction(
  txHash: string,
  userAddress: string,
  txType: string,
  amountRaw: bigint,
  isPositive: boolean
): Promise<void> {
  try {
    const amountDec = Number(amountRaw) / 1e18;
    const balanceChange = `${isPositive ? '+' : '-'}${amountDec.toFixed(2)} ADF`;

    await pool.query(
      `INSERT INTO user_transactions (tx_hash, user_address, tx_type, amount, balance_change)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tx_hash, user_address, tx_type) DO NOTHING`,
      [txHash.toLowerCase(), userAddress.toLowerCase(), txType, amountDec, balanceChange]
    );
  } catch (err) {
    console.error('   ❌ Error logging user transaction:', err);
  }
}

async function handleWithdraw(event: any): Promise<void> {
  const { user, amount } = event.args;
  const txHash = event.transactionHash;
  await logUserTransaction(txHash, user, 'WITHDRAW', amount, true);
  console.log(`   💸 Withdraw synced: ${user} withdrew +${Number(amount) / 1e18} ADF`);
}

async function handleSellerDeposited(event: any): Promise<void> {
  const { auctionId, amount } = event.args;
  const txHash = event.transactionHash;
  const res = await pool.query('SELECT seller FROM auctions WHERE auction_id = $1', [Number(auctionId)]);
  if (res.rows.length > 0) {
    const seller = res.rows[0].seller;
    await logUserTransaction(txHash, seller, 'SELLER_DEPOSIT', amount, false);
  }
}

async function handleBuyerDeposited(event: any): Promise<void> {
  const { auctionId, amount } = event.args;
  const txHash = event.transactionHash;
  const res = await pool.query('SELECT current_top_bidder FROM auctions WHERE auction_id = $1', [Number(auctionId)]);
  if (res.rows.length > 0) {
    const buyer = res.rows[0].current_top_bidder;
    await logUserTransaction(txHash, buyer, 'BUYER_DEPOSIT', amount, false);
  }
}

async function handleEscrowReleased(event: any): Promise<void> {
  const { auctionId, receiver, amount } = event.args;
  const txHash = event.transactionHash;
  await logUserTransaction(txHash, receiver, 'ESCROW_RELEASE', amount, true);
  console.log(`   💸 EscrowReleased synced: ${receiver} received +${Number(amount) / 1e18} ADF`);
}

async function handleDepositsBurned(event: any): Promise<void> {
  const { auctionId, buyerAmount, sellerAmount } = event.args;
  const txHash = event.transactionHash;
  const res = await pool.query('SELECT seller, current_top_bidder FROM auctions WHERE auction_id = $1', [Number(auctionId)]);
  if (res.rows.length > 0) {
    const { seller, current_top_bidder } = res.rows[0];
    if (buyerAmount > 0n) {
      await logUserTransaction(txHash, current_top_bidder, 'DEPOSIT_BURN', buyerAmount, false);
    }
    if (sellerAmount > 0n) {
      await logUserTransaction(txHash, seller, 'DEPOSIT_BURN', sellerAmount, false);
    }
  }
}

async function handleTransfer(event: any): Promise<void> {
  const { from, to, value } = event.args;
  const txHash = event.transactionHash;

  const fromAddr = from.toLowerCase();
  const toAddr = to.toLowerCase();
  const adfPoolAddr = CONTRACT_ADDRESSES.ADF_Pool.toLowerCase();
  const exchangeAddr = CONTRACT_ADDRESSES.AuctionExchange.toLowerCase();
  const nullAddr = '0x0000000000000000000000000000000000000000';

  if (fromAddr === adfPoolAddr || fromAddr === exchangeAddr || toAddr === adfPoolAddr || toAddr === exchangeAddr) {
    return; // Ignore contract interactions (already captured by other events)
  }

  if (fromAddr !== nullAddr) {
    await logUserTransaction(txHash, from, 'TRANSFER_SEND', value, false);
  }
  if (toAddr !== nullAddr) {
    await logUserTransaction(txHash, to, 'TRANSFER_RECEIVE', value, true);
  }
  console.log(`   💸 Transfer synced: P2P transfer ${Number(value) / 1e18} ADF from ${fromAddr} to ${toAddr}`);
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
    eventName: 'EscrowStarted',
    onLogs: (logs) => {
      for (const log of logs) {
        handleEscrowStarted(log);
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

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.ADF_Pool,
    abi: ADF_POOL_ABI,
    eventName: 'SwapETHForADF',
    onLogs: (logs) => {
      for (const log of logs) {
        handleSwapETHForADF(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.ADF_Pool,
    abi: ADF_POOL_ABI,
    eventName: 'SwapADFForETH',
    onLogs: (logs) => {
      for (const log of logs) {
        handleSwapADFForETH(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'DeliveryConfirmed',
    onLogs: (logs) => {
      for (const log of logs) {
        handleDeliveryConfirmed(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'DisputeOpened',
    onLogs: (logs) => {
      for (const log of logs) {
        handleDisputeOpened(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  // --- DISPUTE RESOLUTION CONTRACT WATCHERS ---
  if (CONTRACT_ADDRESSES.DisputeResolution && CONTRACT_ADDRESSES.DisputeResolution !== '0x') {
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'DisputeCreated',
      onLogs: (logs) => {
        for (const log of logs) {
          handleDisputeCreated(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorsAssigned',
      onLogs: (logs) => {
        for (const log of logs) {
          handleJurorsAssigned(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'VoteCommitted',
      onLogs: (logs) => {
        for (const log of logs) {
          handleVoteCommitted(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'VoteRevealed',
      onLogs: (logs) => {
        for (const log of logs) {
          handleVoteRevealed(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'PhaseAdvanced',
      onLogs: (logs) => {
        for (const log of logs) {
          handlePhaseAdvanced(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'DisputeResolved',
      onLogs: (logs) => {
        for (const log of logs) {
          handleDisputeResolved(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorStaked',
      onLogs: (logs) => {
        for (const log of logs) {
          handleJurorStaked(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorUnstaked',
      onLogs: (logs) => {
        for (const log of logs) {
          handleJurorUnstaked(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorRewarded',
      onLogs: (logs) => {
        for (const log of logs) {
          handleJurorRewarded(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });

    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      eventName: 'JurorPenalized',
      onLogs: (logs) => {
        for (const log of logs) {
          handleJurorPenalized(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });
  }

  // --- ADDITIONAL AUCTION EXCHANGE WATCHERS ---
  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'Withdraw',
    onLogs: (logs) => {
      for (const log of logs) {
        handleWithdraw(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'SellerDeposited',
    onLogs: (logs) => {
      for (const log of logs) {
        handleSellerDeposited(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'BuyerDeposited',
    onLogs: (logs) => {
      for (const log of logs) {
        handleBuyerDeposited(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'EscrowReleased',
    onLogs: (logs) => {
      for (const log of logs) {
        handleEscrowReleased(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    eventName: 'DepositsBurned',
    onLogs: (logs) => {
      for (const log of logs) {
        handleDepositsBurned(log);
        updateSyncBlock(log.blockNumber);
      }
    },
  });

  // --- ADF TOKEN (ERC20) TRANSFER WATCHER ---
  if (CONTRACT_ADDRESSES.ADF && CONTRACT_ADDRESSES.ADF !== '0x') {
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.ADF,
      abi: ADF_ABI,
      eventName: 'Transfer',
      onLogs: (logs) => {
        for (const log of logs) {
          handleTransfer(log);
          updateSyncBlock(log.blockNumber);
        }
      },
    });
  }
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
  console.log(`   Contract Exchange: ${CONTRACT_ADDRESSES.AuctionExchange}`);
  console.log(`   Contract Dispute: ${CONTRACT_ADDRESSES.DisputeResolution}`);

  // Catchup first, then watch
  await catchupEvents();
  watchEvents();

  console.log('   ✅ Event Listener is running\n');
}
