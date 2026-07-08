import { createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { publicClient, CONTRACT_ADDRESSES, DISPUTE_RESOLUTION_ABI } from './config/blockchain';
import pool from './config/db';
import { assignJurorsAutomatically } from './services/oracleService';

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
] as const;

// Mở rộng ABI cho mục đích test mock
const TEST_ABI = [
  ...DISPUTE_RESOLUTION_ABI,
  {
    type: 'function',
    name: 'stakeForJuror',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'auctionExchange',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'disputeIdCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setAuctionExchange',
    inputs: [{ name: '_auctionExchange', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createDispute',
    inputs: [
      { name: '_auctionId', type: 'uint256' },
      { name: '_buyer', type: 'address' },
      { name: '_seller', type: 'address' },
      { name: '_initiator', type: 'address' },
      { name: '_evidenceIPFS', type: 'string' },
      { name: '_disputeType', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// Private keys của Hardhat node (chỉ dùng ở môi trường test/local)
const HARDHAT_KEYS: Address[] = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Deployer
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Account 1 (Buyer)
  '0x5de4111e5eb13076505b9a79d9434102d8820c5d37cdfd24e12738688915bd1a', // Account 2 (Seller)
  '0x7c852118294e51e653712a81e05800f4191417423a3f084c9f2ec9f907743308', // Juror 1
  '0x47e17c207a8525095d1131465f24f148472145e7f1bd93a70fd17e082c58752d', // Juror 2
  '0x8b1f93831bb55e13093d5b234140e2e1a9f2e1dfd93e70fd17e082c5875253d1', // Juror 3
];

async function runOracleTest() {
  console.log('🧪 Starting Oracle Service Juror Selection Integration Test...');

  const deployerAccount = privateKeyToAccount(HARDHAT_KEYS[0]);
  const buyerAccount = privateKeyToAccount(HARDHAT_KEYS[1]);
  const sellerAccount = privateKeyToAccount(HARDHAT_KEYS[2]);

  const dummyBuyer = buyerAccount.address.toLowerCase();
  const dummySeller = sellerAccount.address.toLowerCase();
  
  // Lấy danh sách 3 Trọng tài
  const jurorAccounts = HARDHAT_KEYS.slice(3).map(k => privateKeyToAccount(k));
  const jurorAddresses = jurorAccounts.map(a => a.address.toLowerCase());

  const dummyDisputeId = 8888;
  const dummyAuctionId = 8888;

  try {
    // Truncate DB trước khi chạy để tránh lỗi trùng lặp dữ liệu
    await pool.query('TRUNCATE bids, auctions, disputes, dispute_votes, swap_history, user_profiles, user_transactions CASCADE');

    // ----------------------------------------------------
    // BƯỚC 0: Mua ADF từ Pool cho deployer để có số dư phát cho Trọng tài
    // ----------------------------------------------------
    console.log('   💧 Swapping 1 ETH for ADF from Pool...');
    const deployerWallet = createWalletClient({
      account: deployerAccount,
      chain: publicClient.chain,
      transport: http(publicClient.transport.url),
    });

    const poolAddress = CONTRACT_ADDRESSES.ADF_Pool;
    const txSwap = await deployerWallet.writeContract({
      address: poolAddress,
      abi: [
        {
          type: 'function',
          name: 'swapETHForADF',
          inputs: [{ name: 'minADFOut', type: 'uint256' }],
          outputs: [],
          stateMutability: 'payable',
        }
      ],
      functionName: 'swapETHForADF',
      args: [0n],
      value: 1n * 10n**18n, // 1 ETH
    });
    await publicClient.waitForTransactionReceipt({ hash: txSwap });
    console.log('      Successfully bought ADF from Pool for deployer.');

    // ----------------------------------------------------
    // BƯỚC 1: Thực hiện Stake ADF on-chain cho 3 Juror
    // ----------------------------------------------------
    console.log('   🔗 Staking ADF on-chain for 3 Juror...');

    const adfAddress = CONTRACT_ADDRESSES.ADF;
    const disputeAddress = CONTRACT_ADDRESSES.DisputeResolution;
    const minStake = 500n * 10n**18n;

    for (const jurorAcc of jurorAccounts) {
      // 1.1 Transfer 1 ETH từ Deployer sang Juror để làm phí gas
      const txEth = await deployerWallet.sendTransaction({
        to: jurorAcc.address,
        value: 1n * 10n**18n, // 1 ETH
      });
      await publicClient.waitForTransactionReceipt({ hash: txEth });

      // 1.2 Transfer ADF từ Deployer sang Juror (1000 ADF)
      const txTransfer = await deployerWallet.writeContract({
        address: adfAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [jurorAcc.address, 1000n * 10n**18n],
      });
      await publicClient.waitForTransactionReceipt({ hash: txTransfer });

      // 1.3 Juror Approve cho DisputeResolution contract
      const jurorWallet = createWalletClient({
        account: jurorAcc,
        chain: publicClient.chain,
        transport: http(publicClient.transport.url),
      });

      const txApprove = await jurorWallet.writeContract({
        address: adfAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [disputeAddress, 1000n * 10n**18n],
      });
      await publicClient.waitForTransactionReceipt({ hash: txApprove });

      // 1.4 Juror gọi stakeForJuror
      const txStake = await jurorWallet.writeContract({
        address: disputeAddress,
        abi: TEST_ABI,
        functionName: 'stakeForJuror',
        args: [minStake],
      });
      await publicClient.waitForTransactionReceipt({ hash: txStake });
      console.log(`      🛡️ Funded and Staked 500 ADF on-chain for Juror: ${jurorAcc.address}`);
    }

    // ----------------------------------------------------
    // BƯỚC 2: Cập nhật thông tin Profile Jurors trong DB
    // ----------------------------------------------------
    console.log('   💾 Saving Juror Profiles in DB...');
    for (let i = 0; i < jurorAddresses.length; i++) {
      await pool.query(
        `INSERT INTO user_profiles (
           wallet_address, display_name, reputation_score, juror_eligible, 
           adf_staked_for_juror, total_bids_placed, total_disputes_lost
         )
         VALUES ($1, $2, $3, true, $4, 10, 0)
         ON CONFLICT (wallet_address) DO UPDATE SET
           reputation_score = EXCLUDED.reputation_score,
           juror_eligible = true,
           adf_staked_for_juror = EXCLUDED.adf_staked_for_juror,
           total_bids_placed = 10,
           total_disputes_lost = 0`,
        [
          jurorAddresses[i],
          `Juror ${i+1}`,
          100 - i, // score từ 100 giảm dần xuống 96
          minStake.toString()
        ]
      );
    }

    // Tạo profile cho buyer và seller
    await pool.query(
      `INSERT INTO user_profiles (wallet_address, display_name)
       VALUES ($1, 'Buyer'), ($2, 'Seller')
       ON CONFLICT (wallet_address) DO NOTHING`,
      [dummyBuyer, dummySeller]
    );

    // ----------------------------------------------------
    // BƯỚC 3: Tạo auction và dispute giả lập trong DB
    // ----------------------------------------------------
    await pool.query(
      `INSERT INTO auctions (auction_id, seller, current_top_bidder, nft_token_id, end_time, reserve_price, min_bid_increment)
       VALUES ($1, $2, $3, 1, NOW(), '100', '10')
       ON CONFLICT (auction_id) DO UPDATE SET current_top_bidder = EXCLUDED.current_top_bidder`,
      [dummyAuctionId, dummySeller, dummyBuyer]
    );

    await pool.query(
      `INSERT INTO disputes (dispute_id, auction_id, buyer, seller, initiator, phase, resolved)
       VALUES ($1, $2, $3, $4, $5, 'EVIDENCE', false)
       ON CONFLICT (dispute_id) DO UPDATE SET phase = 'EVIDENCE', resolved = false`,
      [dummyDisputeId, dummyAuctionId, dummyBuyer, dummySeller, dummyBuyer]
    );
    console.log('   ✅ Dummy Auction & Dispute set up in DB.');

    // ----------------------------------------------------
    // BƯỚC 4: Tạo dispute on-chain để gọi setJurors thành công
    // ----------------------------------------------------
    console.log('   🔗 Creating dispute on-chain to match DB...');
    
    const currentExchange = await publicClient.readContract({
      address: disputeAddress,
      abi: TEST_ABI,
      functionName: 'auctionExchange',
    });

    // 4.1 Set exchange tạm thời thành deployer
    const txSetExchangeTmp = await deployerWallet.writeContract({
      address: disputeAddress,
      abi: TEST_ABI,
      functionName: 'setAuctionExchange',
      args: [deployerAccount.address],
    });
    await publicClient.waitForTransactionReceipt({ hash: txSetExchangeTmp });

    // 4.2 Gọi createDispute từ deployer (vì deployer đóng vai exchange tạm thời)
    const txCreateDispute = await deployerWallet.writeContract({
      address: disputeAddress,
      abi: TEST_ABI,
      functionName: 'createDispute',
      args: [BigInt(dummyAuctionId), buyerAccount.address, sellerAccount.address, buyerAccount.address, 'ipfs://EvidenceHash', 2],
    });
    await publicClient.waitForTransactionReceipt({ hash: txCreateDispute });
    
    // Đọc disputeIdCounter thực tế vừa được tạo trên chuỗi
    const onChainDisputeId = await publicClient.readContract({
      address: disputeAddress,
      abi: TEST_ABI,
      functionName: 'disputeIdCounter',
    }) as bigint;
    console.log(`      Created on-chain dispute with ID: ${onChainDisputeId}`);

    // 4.3 Khôi phục lại AuctionExchange cũ
    const txSetExchangeBack = await deployerWallet.writeContract({
      address: disputeAddress,
      abi: TEST_ABI,
      functionName: 'setAuctionExchange',
      args: [currentExchange],
    });
    await publicClient.waitForTransactionReceipt({ hash: txSetExchangeBack });

    // Cập nhật lại dispute_id trong DB để khớp với id on-chain thực tế vừa tạo
    await pool.query(
      `UPDATE disputes SET dispute_id = $1 WHERE dispute_id = $2`,
      [Number(onChainDisputeId), dummyDisputeId]
    );

    // ----------------------------------------------------
    // BƯỚC 5: Gọi Oracle Service gán Trọng tài
    // ----------------------------------------------------
    console.log('   🤖 Running Oracle Service assignJurorsAutomatically...');
    await assignJurorsAutomatically(Number(onChainDisputeId), dummyAuctionId);

    // ----------------------------------------------------
    // BƯỚC 6: Kiểm tra kết quả
    // ----------------------------------------------------
    console.log('   🔍 Verifying results...');
    
    // 6.1 Kiểm tra trạng thái on-chain
    const onChainDisputeInfo = await publicClient.readContract({
      address: disputeAddress,
      abi: TEST_ABI,
      functionName: 'disputes',
      args: [onChainDisputeId],
    }) as any;

    const onChainPhase = onChainDisputeInfo[6]; // index 6
    console.log(`      On-chain Dispute Phase: ${onChainPhase === 1 ? 'COMMIT (1) [PASS]' : onChainPhase}`);

    // 6.2 Kiểm tra trạng thái DB
    const dbDisputeRes = await pool.query('SELECT phase, selected_jurors FROM disputes WHERE dispute_id = $1', [Number(onChainDisputeId)]);
    console.log(`      DB Dispute Phase: ${dbDisputeRes.rows[0].phase}`);
    console.log(`      DB Selected Jurors:`, dbDisputeRes.rows[0].selected_jurors);

    if (onChainPhase !== 1) {
      throw new Error('On-chain phase did not advance to COMMIT (1).');
    }

    console.log('\n🎉 Oracle Service Integration Test PASSED successfully!');

    // Dọn dẹp dữ liệu kiểm thử
    await pool.query('DELETE FROM dispute_votes WHERE dispute_id = $1', [Number(onChainDisputeId)]);
    await pool.query('DELETE FROM disputes WHERE dispute_id = $1', [Number(onChainDisputeId)]);
    await pool.query('DELETE FROM auctions WHERE auction_id = $1', [dummyAuctionId]);
    for (const j of jurorAddresses) {
      await pool.query('DELETE FROM user_profiles WHERE wallet_address = $1', [j]);
    }
    await pool.query('DELETE FROM user_profiles WHERE wallet_address = $1 OR wallet_address = $2', [dummyBuyer, dummySeller]);
    console.log('   ✅ Database cleaned up.');

  } catch (error) {
    console.error('❌ Oracle Integration Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runOracleTest();
