import { createWalletClient, http, type Address, parseEther, keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import app from './app';
import { publicClient, CONTRACT_ADDRESSES, ADF_NFT_ABI } from './config/blockchain';
import pool from './config/db';
import { startEventListener } from './services/eventListener';

// Helper ABI ERC20
const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ABI của AMM Pool để swap
const AMM_POOL_ABI = [
  {
    type: 'function',
    name: 'swapETHForADF',
    inputs: [{ name: 'minADFOut', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

// ABI đầy đủ của AuctionExchange phục vụ E2E test
const LOCAL_EXCHANGE_ABI = [
  {
    type: 'function',
    name: 'createAuction',
    inputs: [
      { name: '_nftTokenId', type: 'uint256' },
      { name: '_duration', type: 'uint256' },
      { name: '_reservePrice', type: 'uint256' },
      { name: '_minBidIncrement', type: 'uint256' },
      { name: '_assetType', type: 'uint8' },
      { name: '_disputeType', type: 'uint8' },
      { name: '_escrowDuration', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'bid',
    inputs: [
      { name: '_auctionId', type: 'uint256' },
      { name: '_bidAmount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'endAuction',
    inputs: [{ name: '_auctionId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'openDispute',
    inputs: [
      { name: '_auctionId', type: 'uint256' },
      { name: 'evidenceIPFS', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// ABI đầy đủ của DisputeResolution phục vụ E2E test
const LOCAL_DISPUTE_ABI = [
  {
    type: 'function',
    name: 'stakeForJuror',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'commitVote',
    inputs: [
      { name: '_disputeId', type: 'uint256' },
      { name: '_commitHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revealVote',
    inputs: [
      { name: '_disputeId', type: 'uint256' },
      { name: '_vote', type: 'uint8' },
      { name: '_salt', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resolveDispute',
    inputs: [{ name: '_disputeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// ABI của NFT để mint/approve
const LOCAL_NFT_ABI = [
  {
    type: 'function',
    name: 'mintNFT',
    inputs: [{ name: '_tokenURI', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// Private keys của Hardhat node
const HARDHAT_KEYS: Address[] = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Deployer/Oracle
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Account 1 (Buyer)
  '0x5de4111e5eb13076505b9a79d9434102d8820c5d37cdfd24e12738688915bd1a', // Account 2 (Seller)
  '0x7c852118294e51e653712a81e05800f4191417423a3f084c9f2ec9f907743308', // Juror 1
  '0x47e17c207a8525095d1131465f24f148472145e7f1bd93a70fd17e082c58752d', // Juror 2
  '0x8b1f93831bb55e13093d5b234140e2e1a9f2e1dfd93e70fd17e082c5875253d1', // Juror 3
  '0xa267530f49f8280200e4e4e97b1129321528f8f07be5d57b2933a69622d1641b', // Juror 4
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea9213d50dec403bcf7e5', // Juror 5
];

// Helper để tua nhanh thời gian trên Hardhat
async function fastForwardTime(seconds: number) {
  await publicClient.request({
    method: 'evm_increaseTime' as any,
    params: [seconds] as any,
  });
  await publicClient.request({
    method: 'evm_mine' as any,
    params: [] as any,
  });
}

// Helper đợi background event listener đồng bộ dữ liệu vào DB (5 giây tương ứng polling interval)
async function waitSync() {
  await new Promise(r => setTimeout(r, 5000));
}

// Helper sinh Commit Hash bí mật
function createCommitHash(vote: number, salt: string) {
  return keccak256(encodePacked(['uint8', 'string'], [vote, salt]));
}

async function runMasterE2ETest() {
  console.log('🏁 INITIALIZING MASTER E2E INTEGRATION TEST...');

  // 1. Dọn sạch DB và reset trạng thái sync block về 0 để tránh đè block cũ của node trước
  await pool.query('TRUNCATE bids, auctions, disputes, dispute_votes, swap_history, user_profiles CASCADE');
  await pool.query(`INSERT INTO sync_state (id, last_synced_block) VALUES (1, 0) ON CONFLICT (id) DO UPDATE SET last_synced_block = 0`);
  console.log('   🧹 DB truncated and sync block reset to 0.');

  // 2. Khởi chạy Event Listener để đồng bộ ngầm
  await startEventListener();
  console.log('   👁️  Background Event Listener started.');

  const deployer = privateKeyToAccount(HARDHAT_KEYS[0]);
  const buyer = privateKeyToAccount(HARDHAT_KEYS[1]);
  const seller = privateKeyToAccount(HARDHAT_KEYS[2]);
  const jurorAccounts = HARDHAT_KEYS.slice(3).map(k => privateKeyToAccount(k));
  const jurorAddresses = jurorAccounts.map(a => a.address.toLowerCase());

  const deployerWallet = createWalletClient({ account: deployer, chain: publicClient.chain, transport: http(publicClient.transport.url) });
  const buyerWallet = createWalletClient({ account: buyer, chain: publicClient.chain, transport: http(publicClient.transport.url) });
  const sellerWallet = createWalletClient({ account: seller, chain: publicClient.chain, transport: http(publicClient.transport.url) });

  const adfAddress = CONTRACT_ADDRESSES.ADF;
  const poolAddress = CONTRACT_ADDRESSES.ADF_Pool;
  const exchangeAddress = CONTRACT_ADDRESSES.AuctionExchange;
  const disputeAddress = CONTRACT_ADDRESSES.DisputeResolution;
  const nftAddress = CONTRACT_ADDRESSES.ADF_NFT;

  try {
    // ------------------------------------------------------------------------
    // BƯỚC 1: Kiểm thử AMM Swapping (ADF <-> ETH)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 1: AMM Swap ADF <-> ETH ---');
    
    // Cấp ETH làm gas fee cho các tài khoản
    for (const key of HARDHAT_KEYS.slice(1)) {
      const acc = privateKeyToAccount(key);
      const txEth = await deployerWallet.sendTransaction({ to: acc.address, value: parseEther('2') });
      await publicClient.waitForTransactionReceipt({ hash: txEth });
    }

    // Buyer swap 1 ETH -> ADF
    const txSwapBuyer = await buyerWallet.writeContract({
      address: poolAddress,
      abi: AMM_POOL_ABI,
      functionName: 'swapETHForADF',
      args: [0n],
      value: parseEther('1'),
    });
    await publicClient.waitForTransactionReceipt({ hash: txSwapBuyer });

    // Seller swap 1 ETH -> ADF
    const txSwapSeller = await sellerWallet.writeContract({
      address: poolAddress,
      abi: AMM_POOL_ABI,
      functionName: 'swapETHForADF',
      args: [0n],
      value: parseEther('1'),
    });
    await publicClient.waitForTransactionReceipt({ hash: txSwapSeller });

    // Chờ Event Listener đồng bộ DB
    await waitSync();

    // Truy vấn kiểm tra DB
    const dbSwaps = await pool.query('SELECT * FROM swap_history ORDER BY created_at ASC');
    console.log(`   DB Swaps synced: ${dbSwaps.rows.length} rows`);
    if (dbSwaps.rows.length < 2) {
      throw new Error('AMM Swapping events not synced into database!');
    }
    console.log('   %s Step 1 PASS: AMM Swapping fully verified.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 2: Seller Đăng Bán và Tạo Đấu Giá Vật Lý (JURY_VOTING)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 2: Mint NFT & Create PHYSICAL JURY_VOTING Auction ---');

    // 2.1 Seller mint NFT (hợp đồng tự động mint cho msg.sender)
    const txMint = await sellerWallet.writeContract({
      address: nftAddress,
      abi: LOCAL_NFT_ABI,
      functionName: 'mintNFT',
      args: ['ipfs://NFT_PHYSICAL_ASSET'],
    });
    const receiptMint = await publicClient.waitForTransactionReceipt({ hash: txMint });
    // Tìm log của sự kiện Transfer (ERC721) để lấy tokenId
    const transferLog = receiptMint.logs.find(
      l => l.topics[0]?.toLowerCase() === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    );
    if (!transferLog || !transferLog.topics[3]) {
      throw new Error("Failed to find Transfer log to parse tokenId");
    }
    const tokenId = BigInt(transferLog.topics[3]);
    console.log(`   NFT Minted: Token ID #${tokenId}`);

    // 2.2 Seller Approve NFT cho AuctionExchange
    const txApproveNft = await sellerWallet.writeContract({
      address: nftAddress,
      abi: LOCAL_NFT_ABI,
      functionName: 'approve',
      args: [exchangeAddress, tokenId],
    });
    await publicClient.waitForTransactionReceipt({ hash: txApproveNft });

    // 2.3 Seller tạo Auction PHYSICAL, JURY_VOTING, thời gian 1 giờ, cọc và thời hạn bàn giao 1 ngày
    const duration = 3600n; // 1 giờ
    const reservePrice = 100n * 10n**18n; // 100 ADF
    const minIncrement = 10n * 10n**18n; // 10 ADF
    const escrowDuration = 86400n; // 1 ngày

    const txCreateAuction = await sellerWallet.writeContract({
      address: exchangeAddress,
      abi: LOCAL_EXCHANGE_ABI,
      functionName: 'createAuction',
      args: [tokenId, duration, reservePrice, minIncrement, 1, 2, escrowDuration], // assetType=1 (PHYSICAL), disputeType=2 (JURY_VOTING)
    });
    await publicClient.waitForTransactionReceipt({ hash: txCreateAuction });
    
    // Chờ Event Listener đồng bộ DB
    await waitSync();
    
    // Đọc mã đấu giá vừa sinh
    const dbAuctions = await pool.query('SELECT * FROM auctions ORDER BY auction_id DESC LIMIT 1');
    const auctionId = dbAuctions.rows[0].auction_id;
    console.log(`   Auction Created in DB: Auction #${auctionId}`);
    
    if (dbAuctions.rows[0].phase !== 'BIDDING' || dbAuctions.rows[0].dispute_type !== 'JURY_VOTING') {
      throw new Error('Auction creation DB record invalid!');
    }
    console.log('   %s Step 2 PASS: Auction creation fully synced.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 3: Buyer Trả Giá Thầu
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 3: Place Bid ---');

    const bidAmount = 200n * 10n**18n; // 200 ADF
    
    // Buyer Approve token cho AuctionExchange
    const txApproveAdf = await buyerWallet.writeContract({
      address: adfAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [exchangeAddress, bidAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: txApproveAdf });

    // Buyer đặt giá thầu
    const txBid = await buyerWallet.writeContract({
      address: exchangeAddress,
      abi: LOCAL_EXCHANGE_ABI,
      functionName: 'bid',
      args: [BigInt(auctionId), bidAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: txBid });

    await waitSync();
    
    const dbBids = await pool.query('SELECT * FROM bids WHERE auction_id = $1', [auctionId]);
    console.log(`   DB Bids synced: ${dbBids.rows.length} rows (Top bid: ${dbBids.rows[0].amount})`);
    
    if (dbBids.rows.length === 0 || dbBids.rows[0].bidder !== buyer.address.toLowerCase()) {
      throw new Error('Bid record not synced correctly!');
    }
    console.log('   %s Step 3 PASS: Bidding fully synced.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 4: Tua Hết Giờ Đấu Giá & Kết Thúc (Vào Escrow)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 4: End Auction -> Enter ESCROW_HOLDING ---');

    // Tua nhanh 1 giờ 10 giây
    await fastForwardTime(3610);

    // Bất kỳ ai cũng có thể gọi endAuction
    const txEnd = await deployerWallet.writeContract({
      address: exchangeAddress,
      abi: LOCAL_EXCHANGE_ABI,
      functionName: 'endAuction',
      args: [BigInt(auctionId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: txEnd });

    await waitSync();

    const dbAuctionAfterEnd = await pool.query('SELECT * FROM auctions WHERE auction_id = $1', [auctionId]);
    console.log(`   Auction DB row after end:`, dbAuctionAfterEnd.rows[0]);
    
    if (dbAuctionAfterEnd.rows[0].phase !== 'ESCROW_HOLDING') {
      throw new Error('Auction phase did not advance to ESCROW_HOLDING!');
    }
    console.log('   %s Step 4 PASS: Auction ended and Escrow started.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 5: Khởi Tạo Tranh Chấp (openDispute)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 5: Open Dispute ---');

    // Buyer gọi openDispute vì Seller giao sai hàng
    const txDispute = await buyerWallet.writeContract({
      address: exchangeAddress,
      abi: LOCAL_EXCHANGE_ABI,
      functionName: 'openDispute',
      args: [BigInt(auctionId), 'ipfs://EvidenceBuyerCID'],
    });
    await publicClient.waitForTransactionReceipt({ hash: txDispute });

    await waitSync();

    const dbDispute = await pool.query('SELECT * FROM disputes WHERE auction_id = $1', [auctionId]);
    
    if (dbDispute.rows.length === 0) {
      throw new Error('Dispute record not synced in DB!');
    }
    
    const disputeId = dbDispute.rows[0].dispute_id;
    console.log(`   Dispute Created in DB: Dispute #${disputeId} (Phase: ${dbDispute.rows[0].phase})`);
    
    if (dbDispute.rows[0].phase !== 'EVIDENCE') {
      throw new Error('Dispute initial phase must be EVIDENCE!');
    }
    console.log('   %s Step 5 PASS: Dispute opened and synced.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 6: Trọng tài Nạp Stake và Oracle Tự Động Gán Hội Đồng (Jury Selection)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 6: Jurors Staking & Auto Jury Assignment (Oracle) ---');

    // Deployer swap 0.5 ETH -> ADF để lấy token phân phối cho Juror
    const txSwapDeployer = await deployerWallet.writeContract({
      address: poolAddress,
      abi: AMM_POOL_ABI,
      functionName: 'swapETHForADF',
      args: [0n],
      value: parseEther('0.5'),
    });
    await publicClient.waitForTransactionReceipt({ hash: txSwapDeployer });

    // 6.1 Thực hiện nạp stake on-chain & lưu profile cho 5 Jurors
    for (let i = 0; i < jurorAccounts.length; i++) {
      const jurorAcc = jurorAccounts[i];
      const jurorWallet = createWalletClient({ account: jurorAcc, chain: publicClient.chain, transport: http(publicClient.transport.url) });

      // Nạp 1000 ADF cho Juror từ AMM (được transfer từ Deployer)
      const txTransferAdf = await deployerWallet.writeContract({
        address: adfAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [jurorAcc.address, 1000n * 10n**18n],
      });
      await publicClient.waitForTransactionReceipt({ hash: txTransferAdf });

      // Approve & Stake
      const txApproveDispute = await jurorWallet.writeContract({
        address: adfAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [disputeAddress, 1000n * 10n**18n],
      });
      await publicClient.waitForTransactionReceipt({ hash: txApproveDispute });

      const txStake = await jurorWallet.writeContract({
        address: disputeAddress,
        abi: LOCAL_DISPUTE_ABI,
        functionName: 'stakeForJuror',
        args: [500n * 10n**18n],
      });
      await publicClient.waitForTransactionReceipt({ hash: txStake });

      // Lưu Profile đủ điều kiện biểu quyết vào DB
      await pool.query(
        `INSERT INTO user_profiles (
           wallet_address, display_name, reputation_score, juror_eligible, 
           adf_staked_for_juror, total_bids_placed, total_disputes_lost
         )
         VALUES ($1, $2, 90, true, $3, 10, 0)`,
        [jurorAcc.address.toLowerCase(), `Juror ${i+1}`, (500n * 10n**18n).toString()]
      );
    }
    console.log('   5 Jurors on-chain Staked & DB profiles created.');

    // 6.2 Gọi Oracle gán trọng tài tự động
    const { assignJurorsAutomatically } = require('./services/oracleService');
    await assignJurorsAutomatically(disputeId, auctionId);

    // Đợi Event Listener sync sự kiện JurorsAssigned
    await waitSync();

    const dbDisputeAfterJurors = await pool.query('SELECT phase, selected_jurors FROM disputes WHERE dispute_id = $1', [disputeId]);
    console.log(`   Dispute Phase after Jurors: ${dbDisputeAfterJurors.rows[0].phase}`);
    console.log(`   Dispute Selected Jurors:`, dbDisputeAfterJurors.rows[0].selected_jurors);

    if (dbDisputeAfterJurors.rows[0].phase !== 'COMMIT' || dbDisputeAfterJurors.rows[0].selected_jurors.length !== 5) {
      throw new Error('Jury assignment sync failed!');
    }

    const dbVotes = await pool.query('SELECT count(*) as total_votes FROM dispute_votes WHERE dispute_id = $1', [disputeId]);
    console.log(`   Blank votes initialized in DB: ${dbVotes.rows[0].total_votes} rows`);
    if (Number(dbVotes.rows[0].total_votes) !== 5) {
      throw new Error('Blank votes were not initialized in DB!');
    }
    console.log('   %s Step 6 PASS: Juror staking and auto assignment verified.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 7: Trọng tài Gửi Hash Phiếu Bầu Kín (Commit Phase)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 7: Commit Votes ---');

    // 3 Trọng tài bầu BUYER (1), 2 Trọng tài bầu SELLER (2)
    const votes = [1, 1, 1, 2, 2];
    const salts = ['s1', 's2', 's3', 's4', 's5'];

    for (let i = 0; i < jurorAccounts.length; i++) {
      const jurorWallet = createWalletClient({ account: jurorAccounts[i], chain: publicClient.chain, transport: http(publicClient.transport.url) });
      const hash = createCommitHash(votes[i], salts[i]);
      
      const txCommit = await jurorWallet.writeContract({
        address: disputeAddress,
        abi: LOCAL_DISPUTE_ABI,
        functionName: 'commitVote',
        args: [BigInt(disputeId), hash],
      });
      await publicClient.waitForTransactionReceipt({ hash: txCommit });
    }

    await waitSync();

    const dbCommittedVotes = await pool.query('SELECT count(*) as committed_count FROM dispute_votes WHERE dispute_id = $1 AND has_committed = true', [disputeId]);
    console.log(`   Committed votes count in DB: ${dbCommittedVotes.rows[0].committed_count}`);
    
    if (Number(dbCommittedVotes.rows[0].committed_count) !== 5) {
      throw new Error('Not all committed votes synced!');
    }

    // Đọc pha mới trong DB (phải tự auto-advance sang REVEAL sau khi nhận đủ 5 commit votes)
    const dbDisputeAfterCommit = await pool.query('SELECT phase FROM disputes WHERE dispute_id = $1', [disputeId]);
    console.log(`   Dispute Phase after 5 commits: ${dbDisputeAfterCommit.rows[0].phase}`);
    
    if (dbDisputeAfterCommit.rows[0].phase !== 'REVEAL') {
      throw new Error('Phase did not auto-advance to REVEAL in DB!');
    }
    console.log('   %s Step 7 PASS: Commit Phase verified.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 8: Trọng tài Mở Phiếu Thực Tế (Reveal Phase)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 8: Reveal Votes ---');

    for (let i = 0; i < jurorAccounts.length; i++) {
      const jurorWallet = createWalletClient({ account: jurorAccounts[i], chain: publicClient.chain, transport: http(publicClient.transport.url) });
      
      const txReveal = await jurorWallet.writeContract({
        address: disputeAddress,
        abi: LOCAL_DISPUTE_ABI,
        functionName: 'revealVote',
        args: [BigInt(disputeId), votes[i], salts[i]],
      });
      await publicClient.waitForTransactionReceipt({ hash: txReveal });
    }

    await waitSync();

    const dbRevealedVotes = await pool.query(
      `SELECT count(*) as count, 
              SUM(case when revealed_vote = 1 then 1 else 0 end) as buyer_votes,
              SUM(case when revealed_vote = 2 then 1 else 0 end) as seller_votes
       FROM dispute_votes WHERE dispute_id = $1 AND has_revealed = true`,
      [disputeId]
    );
    console.log(`   Revealed count in DB: ${dbRevealedVotes.rows[0].count} (Buyer: ${dbRevealedVotes.rows[0].buyer_votes}, Seller: ${dbRevealedVotes.rows[0].seller_votes})`);

    if (Number(dbRevealedVotes.rows[0].count) !== 5 || Number(dbRevealedVotes.rows[0].buyer_votes) !== 3) {
      throw new Error('Reveal votes sync mismatch!');
    }
    console.log('   %s Step 8 PASS: Reveal Phase verified.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 9: Phán Quyết Tranh Chấp & Phân Phối Thưởng Phạt
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 9: Resolve Dispute & Rewards/Penalties ---');

    // Mở phiếu xong, tua qua revealDeadline (1 ngày)
    await fastForwardTime(86410);

    // Call resolveDispute từ ví Deployer
    const txResolve = await deployerWallet.writeContract({
      address: disputeAddress,
      abi: LOCAL_DISPUTE_ABI,
      functionName: 'resolveDispute',
      args: [BigInt(disputeId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: txResolve });

    await waitSync();

    // Kiểm tra DB tranh chấp
    const dbFinalDispute = await pool.query('SELECT phase, winner, resolved FROM disputes WHERE dispute_id = $1', [disputeId]);
    console.log(`   Final Dispute Status: resolved=${dbFinalDispute.rows[0].resolved}, winner=${dbFinalDispute.rows[0].winner}`);
    
    if (!dbFinalDispute.rows[0].resolved || dbFinalDispute.rows[0].winner !== buyer.address.toLowerCase()) {
      throw new Error('Dispute resolution state not synced correctly!');
    }

    // Kiểm tra tiền thưởng phạt Trọng tài
    // Bầu đúng (3 người): Nhận +50 ADF. Bầu sai (2 người): Phạt -100 ADF.
    const dbJurorStakes = await pool.query('SELECT juror, reward_amount, penalty_amount FROM dispute_votes WHERE dispute_id = $1 ORDER BY juror ASC', [disputeId]);
    
    for (const row of dbJurorStakes.rows) {
      const isWinnerJuror = jurorAddresses.slice(0, 3).includes(row.juror.toLowerCase());
      if (isWinnerJuror) {
        if (Number(row.reward_amount) !== 50e18) {
          throw new Error(`Winner juror ${row.juror} did not receive correct reward. Got: ${row.reward_amount}`);
        }
      } else {
        if (Number(row.penalty_amount) !== 100e18) {
          throw new Error(`Loser juror ${row.juror} did not receive correct penalty. Got: ${row.penalty_amount}`);
        }
      }
    }
    console.log('   Jurors reward/penalty synced correctly.');

    // Kiểm tra uy tín Trọng tài được tính toán lại trong user_profiles
    const dbJurorReputations = await pool.query('SELECT wallet_address, reputation_score FROM user_profiles ORDER BY wallet_address ASC');
    console.log('   Updated Juror Reputations:');
    for (const row of dbJurorReputations.rows) {
      if (jurorAddresses.includes(row.wallet_address.toLowerCase())) {
        console.log(`      Juror ${row.wallet_address}: ${row.reputation_score}`);
      }
    }
    console.log('   %s Step 9 PASS: Dispute Resolution & Rewards/Penalties verified.', '\x1b[32m✅\x1b[0m');

    // ------------------------------------------------------------------------
    // BƯỚC 10: Xem Chi Tiết Qua REST API (Bước 9)
    // ------------------------------------------------------------------------
    console.log('\n--- STEP 10: REST API Integration Verification ---');

    const appPort = 4002;
    const server = app.listen(appPort, async () => {
      try {
        const resDetail = await axios.get(`http://localhost:${appPort}/api/disputes/${disputeId}`);
        console.log(`   REST API GET /api/disputes/${disputeId} returns status: ${resDetail.status}`);
        
        if (resDetail.status !== 200 || resDetail.data.dispute.winner !== buyer.address.toLowerCase()) {
          throw new Error('REST API dispute detail verification failed');
        }

        const resJuror = await axios.get(`http://localhost:${appPort}/api/disputes/juror/${jurorAddresses[0]}`);
        console.log(`   REST API GET /api/disputes/juror/${jurorAddresses[0]} returns status: ${resJuror.status}`);
        
        if (resJuror.status !== 200 || resJuror.data.disputes.length === 0) {
          throw new Error('REST API juror disputes verification failed');
        }

        console.log('   %s Step 10 PASS: REST API endpoints verified.', '\x1b[32m✅\x1b[0m');

        console.log('\n======================================================');
        console.log('🎉 🎉 MASTER END-TO-END FLOW PASSED SUCCESSFULLY! 🎉 🎉');
        console.log('======================================================\n');
        
        server.close(async () => {
          await pool.end();
          process.exit(0);
        });
      } catch (err: any) {
        console.error('❌ Step 10 REST API Check failed:', err.message);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('\n❌ MASTER INTEGRATION TEST FAILED:', error);
    await pool.end();
    process.exit(1);
  }
}

runMasterE2ETest();
