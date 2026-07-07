/**
 * Blockchain Configuration — Viem client + Contract ABIs
 * 
 * Khởi tạo publicClient và walletClient kết nối đến blockchain node.
 * Import ABI trực tiếp (hardcoded) để tránh đọc file runtime.
 */

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

// ---- Chain Config ----
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(RPC_URL),
});

// WalletClient dùng cho cron job (endAuction) 
// Dùng private key deployer từ Hardhat local node (account #0)
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;

export const walletClient = DEPLOYER_PRIVATE_KEY
  ? createWalletClient({
      account: privateKeyToAccount(DEPLOYER_PRIVATE_KEY),
      chain: hardhat,
      transport: http(RPC_URL),
    })
  : null;

// ---- Contract Addresses ----
export const CONTRACT_ADDRESSES = {
  ADF: (process.env.ADF_ADDRESS || '0x') as Address,
  ADF_Pool: (process.env.ADF_POOL_ADDRESS || '0x') as Address,
  ADF_NFT: (process.env.ADF_NFT_ADDRESS || '0x') as Address,
  AuctionExchange: (process.env.AUCTION_EXCHANGE_ADDRESS || '0x') as Address,
  DisputeResolution: (process.env.DISPUTE_RESOLUTION_ADDRESS || '0x') as Address,
};

// ---- ABIs ----
// Chỉ giữ lại các hàm/event cần thiết cho server

export const AUCTION_EXCHANGE_ABI = [
  // Events
  {
    type: 'event',
    name: 'AuctionCreated',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'nftTokenId', type: 'uint256', indexed: false },
      { name: 'endTime', type: 'uint256', indexed: false },
      { name: 'reservePrice', type: 'uint256', indexed: false },
      { name: 'minBidIncrement', type: 'uint256', indexed: false },
      { name: 'assetType', type: 'uint8', indexed: false },
      { name: 'disputeType', type: 'uint8', indexed: false },
      { name: 'escrowDuration', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BidPlaced',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionEnded',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionCanceled',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'EscrowStarted',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: false },
      { name: 'seller', type: 'address', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DeliveryConfirmed',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'DisputeOpened',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'initiator', type: 'address', indexed: true },
      { name: 'evidenceIPFS', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SellerDeposited',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BuyerDeposited',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EscrowReleased',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DepositsBurned',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'buyerAmount', type: 'uint256', indexed: false },
      { name: 'sellerAmount', type: 'uint256', indexed: false },
    ],
  },
  // Functions
  {
    type: 'function',
    name: 'endAuction',
    inputs: [{ name: '_auctionId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'auctions',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'nftTokenId', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'reservePrice', type: 'uint256' },
      { name: 'minBidIncrement', type: 'uint256' },
      { name: 'currentTopBidder', type: 'address' },
      { name: 'currentTopBid', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'assetType', type: 'uint8' },
      { name: 'disputeType', type: 'uint8' },
      { name: 'phase', type: 'uint8' },
      { name: 'escrowDuration', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export const ADF_NFT_ABI = [
  {
    type: 'event',
    name: 'NFTMinted',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  }
] as const;

export const ADF_POOL_ABI = [
  {
    type: 'event',
    name: 'SwapETHForADF',
    inputs: [
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'ethIn', type: 'uint256', indexed: false },
      { name: 'adfOut', type: 'uint256', indexed: false },
      { name: 'feeCollected', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SwapADFForETH',
    inputs: [
      { name: 'seller', type: 'address', indexed: true },
      { name: 'adfIn', type: 'uint256', indexed: false },
      { name: 'ethOut', type: 'uint256', indexed: false },
      { name: 'feeCollected', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LiquidityAdded',
    inputs: [
      { name: 'provider', type: 'address', indexed: true },
      { name: 'ethAmount', type: 'uint256', indexed: false },
      { name: 'adfAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'reserveETH',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'reserveADF',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAmountOut',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'isETHForADF', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const DISPUTE_RESOLUTION_ABI = [
  {
    type: 'event',
    name: 'DisputeCreated',
    inputs: [
      { name: 'disputeId', type: 'uint256', indexed: true },
      { name: 'auctionId', type: 'uint256', indexed: false },
      { name: 'initiator', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PhaseAdvanced',
    inputs: [
      { name: 'disputeId', type: 'uint256', indexed: true },
      { name: 'newPhase', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JurorsAssigned',
    inputs: [
      { name: 'disputeId', type: 'uint256', indexed: true },
      { name: 'jurors', type: 'address[5]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'VoteCommitted',
    inputs: [
      { name: 'disputeId', type: 'uint256', indexed: true },
      { name: 'juror', type: 'address', indexed: true },
      { name: 'commitHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'VoteRevealed',
    inputs: [
      { name: 'disputeId', type: 'uint256', indexed: true },
      { name: 'juror', type: 'address', indexed: true },
      { name: 'vote', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DisputeResolved',
    inputs: [
      { name: 'disputeId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: false },
      { name: 'buyerVotes', type: 'uint8', indexed: false },
      { name: 'sellerVotes', type: 'uint8', indexed: false },
      { name: 'abstainCount', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JurorStaked',
    inputs: [
      { name: 'juror', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JurorUnstaked',
    inputs: [
      { name: 'juror', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JurorRewarded',
    inputs: [
      { name: 'juror', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JurorPenalized',
    inputs: [
      { name: 'juror', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  // Functions
  {
    type: 'function',
    name: 'disputes',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'auctionId', type: 'uint256' },
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'initiator', type: 'address' },
      { name: 'buyerEvidenceIPFS', type: 'string' },
      { name: 'sellerEvidenceIPFS', type: 'string' },
      { name: 'phase', type: 'uint8' },
      { name: 'evidenceDeadline', type: 'uint256' },
      { name: 'commitDeadline', type: 'uint256' },
      { name: 'revealDeadline', type: 'uint256' },
      { name: 'buyerVotes', type: 'uint8' },
      { name: 'sellerVotes', type: 'uint8' },
      { name: 'abstainCount', type: 'uint8' },
      { name: 'resolved', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'jurorStakes',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'stakeForJuror',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setJurors',
    inputs: [
      { name: '_disputeId', type: 'uint256' },
      { name: '_jurors', type: 'address[5]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'checkAndUpdatePhase',
    inputs: [{ name: '_disputeId', type: 'uint256' }],
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

export const ADF_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
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
